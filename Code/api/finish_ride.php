<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';
// Pour les emails plus tard:
// require_once 'path/to/PHPMailer/src/Exception.php'; /* ... etc ... */
// use PHPMailer\PHPMailer\PHPMailer;
// use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
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
    echo json_encode(['success' => false, 'message' => 'Authentification requise.']);
    exit();
}

$current_user_id = (int)$_SESSION['user_id'];

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$ride_id = filter_var($input['ride_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if (!$ride_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID du trajet manquant ou invalide.']);
    exit();
}

$pdo = getPDOConnection();
$response = ['success' => false, 'message' => 'Une erreur est survenue.'];
$platform_commission_per_seat = 2.00; // Commission de la plateforme par place réservée

try {
    $pdo->beginTransaction();

    // 1. Vérifier si l'utilisateur est le chauffeur et si le trajet est 'ongoing'
    $stmtCheck = $pdo->prepare("SELECT driver_id, ride_status, price_per_seat FROM Rides WHERE id = :ride_id FOR UPDATE");
    $stmtCheck->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtCheck->execute();
    $ride = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$ride) {
        $response['message'] = "Trajet non trouvé.";
        http_response_code(404);
        throw new Exception($response['message']);
    }
    if ((int)$ride['driver_id'] !== $current_user_id) {
        $response['message'] = "Action non autorisée. Vous n'êtes pas le chauffeur.";
        http_response_code(403);
        throw new Exception($response['message']);
    }
    if ($ride['ride_status'] !== 'ongoing') {
        $response['message'] = "Ce trajet ne peut pas être marqué comme terminé (statut actuel: " . $ride['ride_status'] . "). Il doit être 'En cours'.";
        http_response_code(400);
        throw new Exception($response['message']);
    }

    // 2. Mettre à jour le statut du trajet à 'completed'
    $new_status = 'completed';
    $stmtUpdateRide = $pdo->prepare("UPDATE Rides SET ride_status = :new_status WHERE id = :ride_id");
    $stmtUpdateRide->bindParam(':new_status', $new_status);
    $stmtUpdateRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtUpdateRide->execute();

    // 3. Calculer les gains du chauffeur et mettre à jour ses crédits
    // On compte le nombre de places effectivement réservées et confirmées
    $stmtBookedSeats = $pdo->prepare("SELECT SUM(seats_booked) as total_confirmed_seats FROM Bookings WHERE ride_id = :ride_id AND booking_status = 'confirmed'");
    $stmtBookedSeats->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtBookedSeats->execute();
    $booked_info = $stmtBookedSeats->fetch(PDO::FETCH_ASSOC);
    
    $total_passengers = $booked_info ? (int)$booked_info['total_confirmed_seats'] : 0;
    $earnings_for_driver = 0;

    if ($total_passengers > 0) {
        $price_per_seat = (float)$ride['price_per_seat'];
        $gross_earnings = $price_per_seat * $total_passengers;
        // La commission est de 2 crédits PAR PLACE pour la plateforme
        $total_commission = $platform_commission_per_seat * $total_passengers;
        $earnings_for_driver = $gross_earnings - $total_commission;

        if ($earnings_for_driver > 0) {
            $stmtAddCredits = $pdo->prepare("UPDATE Users SET credits = credits + :earnings WHERE id = :driver_id");
            $stmtAddCredits->bindParam(':earnings', $earnings_for_driver);
            $stmtAddCredits->bindParam(':driver_id', $current_user_id, PDO::PARAM_INT);
            $stmtAddCredits->execute();
        }
    }
    
    // 4. Récupérer les emails des passagers confirmés pour envoyer une notification d'avis
    $stmtPassengers = $pdo->prepare(
        "SELECT u.email, u.username 
                FROM Bookings b JOIN Users u ON b.user_id = u.id 
                WHERE b.ride_id = :ride_id AND b.booking_status = 'confirmed'"
    );
    $stmtPassengers->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtPassengers->execute();
    $passengers = $stmtPassengers->fetchAll(PDO::FETCH_ASSOC);

    // TODO: Mettre en place l'envoi d'email réel avec PHPMailer ici
    foreach ($passengers as $passenger) {
        error_log("FINISH_RIDE: Email à envoyer au passager " . $passenger['email'] . " (" . $passenger['username'] . ") pour laisser un avis sur le trajet ID " . $ride_id);
        // $mail = new PHPMailer(true);
        // try { /* ... config et envoi ... */ } catch (Exception $e_mail) { error_log("Erreur email: " . $mail->ErrorInfo); }
    }

    $pdo->commit();

    $response['success'] = true;
    $response['message'] = "Trajet marqué comme terminé ! Gains (avant commission): " . ($total_passengers * (float)$ride['price_per_seat']) . " crédits. Gains nets chauffeur: " . $earnings_for_driver . " crédits. Les passagers seront invités à laisser un avis.";
    http_response_code(200);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (http_response_code() < 400) { http_response_code(500); }
    error_log("Erreur (finish_ride.php): RideID $ride_id, UserID $current_user_id - " . $e->getMessage());
    if (empty($response['message']) || http_response_code() == 500) {
        $response['message'] = 'Erreur serveur lors de la finalisation du trajet.';
    }
}

echo json_encode($response);
?>