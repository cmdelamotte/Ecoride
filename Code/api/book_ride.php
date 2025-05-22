<?php

require_once __DIR__ . '/config/settings.php';
require_once 'config/database.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentification requise pour réserver.']);
    exit();
}

$current_user_id = (int)$_SESSION['user_id'];

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$ride_id = filter_var($input['ride_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$seats_to_book = filter_var($input['seats_to_book'] ?? 1, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 1]]); // Par défaut 1 place

$errors = [];
if (!$ride_id) {
    $errors['ride_id'] = "ID du trajet manquant ou invalide.";
}
if ($seats_to_book === false || $seats_to_book < 1) {
    $errors['seats_to_book'] = "Nombre de places à réserver invalide.";
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Données invalides.', 'errors' => $errors]);
    exit();
}

$pdo = getPDOConnection();
$response = ['success' => false, 'message' => 'Une erreur est survenue lors de la réservation.'];

try {
    $pdo->beginTransaction();

    // 1. Récupérer les infos du trajet et le nombre de places déjà réservées
    $sqlRideInfo = "SELECT 
                        r.id, r.driver_id, r.departure_time, r.price_per_seat, r.seats_offered, r.ride_status,
                        (SELECT COALESCE(SUM(b.seats_booked), 0) FROM Bookings b WHERE b.ride_id = r.id AND b.booking_status = 'confirmed') as total_seats_booked
                    FROM Rides r
                    WHERE r.id = :ride_id FOR UPDATE"; // FOR UPDATE pour verrouiller la ligne pendant la transaction
    $stmtRideInfo = $pdo->prepare($sqlRideInfo);
    $stmtRideInfo->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtRideInfo->execute();
    $ride = $stmtRideInfo->fetch(PDO::FETCH_ASSOC);

    if (!$ride) {
        $response['message'] = "Trajet non trouvé.";
        http_response_code(404);
        throw new Exception("Trajet non trouvé."); // Pour rollback
    }

    // 2. Vérifications métier
    if ($ride['driver_id'] == $current_user_id) {
        $response['message'] = "Vous ne pouvez pas réserver une place sur votre propre trajet.";
        http_response_code(403); // Forbidden
        throw new Exception("Chauffeur ne peut réserver son propre trajet.");
    }

    if ($ride['ride_status'] !== 'planned') {
        $response['message'] = "Ce trajet n'est plus disponible à la réservation (statut: " . $ride['ride_status'] . ").";
        http_response_code(400);
        throw new Exception("Trajet non planned.");
    }

    $departureTime = new DateTime($ride['departure_time']);
    $now = new DateTime();
    if ($departureTime <= $now) {
        $response['message'] = "La date de départ de ce trajet est passée.";
        http_response_code(400);
        throw new Exception("Date de départ passée.");
    }
    
    $seats_available = (int)$ride['seats_offered'] - (int)$ride['total_seats_booked'];
    if ($seats_available < $seats_to_book) {
        $response['message'] = "Pas assez de places disponibles. Restant: " . $seats_available;
        http_response_code(400);
        throw new Exception("Pas assez de places.");
    }

    // 3. Vérifier si l'utilisateur a déjà réservé ce trajet
    $sqlCheckBooking = "SELECT id FROM Bookings WHERE ride_id = :ride_id AND user_id = :user_id AND booking_status = 'confirmed'";
    $stmtCheckBooking = $pdo->prepare($sqlCheckBooking);
    $stmtCheckBooking->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtCheckBooking->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtCheckBooking->execute();
    if ($stmtCheckBooking->fetch()) {
        $response['message'] = "Vous avez déjà une réservation confirmée pour ce trajet.";
        http_response_code(409); // Conflict
        throw new Exception("Réservation existante.");
    }

    // 4. Vérifier et débiter les crédits de l'utilisateur
    $sqlUserCredits = "SELECT credits FROM Users WHERE id = :user_id FOR UPDATE";
    $stmtUserCredits = $pdo->prepare($sqlUserCredits);
    $stmtUserCredits->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtUserCredits->execute();
    $user = $stmtUserCredits->fetch(PDO::FETCH_ASSOC);

    $total_cost = (float)$ride['price_per_seat'] * $seats_to_book;

    if (!$user || (float)$user['credits'] < $total_cost) {
        $response['message'] = "Crédits insuffisants pour effectuer cette réservation. Coût: " . $total_cost . ", Vos crédits: " . ($user['credits'] ?? 0);
        http_response_code(402); // Payment Required
        throw new Exception("Crédits insuffisants.");
    }

    // 5. Mettre à jour les crédits de l'utilisateur
    $sqlDebitCredits = "UPDATE Users SET credits = credits - :cost WHERE id = :user_id";
    $stmtDebitCredits = $pdo->prepare($sqlDebitCredits);
    $stmtDebitCredits->bindParam(':cost', $total_cost);
    $stmtDebitCredits->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtDebitCredits->execute();

    // 6. Insérer la réservation
    $sqlInsertBooking = "INSERT INTO Bookings (ride_id, user_id, seats_booked, booking_status) 
                        VALUES (:ride_id, :user_id, :seats_booked, 'confirmed')";
    $stmtInsertBooking = $pdo->prepare($sqlInsertBooking);
    $stmtInsertBooking->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtInsertBooking->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtInsertBooking->bindParam(':seats_booked', $seats_to_book, PDO::PARAM_INT);
    $stmtInsertBooking->execute();
    $newBookingId = $pdo->lastInsertId();

    $pdo->commit();

    $response['success'] = true;
    $response['message'] = "Réservation confirmée avec succès !";
    $response['booking_id'] = $newBookingId;
    $response['new_credits_balance'] = (float)$user['credits'] - $total_cost;
    http_response_code(201); // Created (pour la ressource Booking)

} catch (Exception $e) { // Attrape les exceptions jetées manuellement et les PDOExceptions non gérées spécifiquement
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    // Le code HTTP et le message sont déjà définis dans $response avant de jeter l'exception
    // Si ce n'est pas le cas (ex: PDOException directe), on met un 500.
    if (http_response_code() < 400) { // Si aucun code d'erreur HTTP spécifique n'a été défini
        http_response_code(500);
    }
    error_log("Erreur lors de la réservation (book_ride.php): " . $e->getMessage() . " - Input: " . $inputJSON);
    // $response['message'] aura déjà le message spécifique de l'erreur métier
    // ou on met un message générique si c'est une PDOException non spécifique.
    if (empty($response['message']) || http_response_code() == 500) {
        $response['message'] = 'Erreur serveur lors de la réservation.';
    }
}

echo json_encode($response);
?>