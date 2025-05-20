<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';
// Plus tard, pour les emails:
// require_once 'path/to/PHPMailer/src/Exception.php';
// require_once 'path/to/PHPMailer/src/PHPMailer.php';
// require_once 'path/to/PHPMailer/src/SMTP.php';
// use PHPMailer\PHPMailer\PHPMailer;
// use PHPMailer\PHPMailer\Exception;

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS'); // Utiliser POST pour une action de modification/annulation
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
$response = ['success' => false, 'message' => 'Une erreur est survenue lors de l\'annulation.'];

try {
    $pdo->beginTransaction();

    // Récupérer les informations du trajet
    $stmtRide = $pdo->prepare("SELECT driver_id, ride_status, price_per_seat, departure_time FROM Rides WHERE id = :ride_id FOR UPDATE");
    $stmtRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtRide->execute();
    $ride = $stmtRide->fetch(PDO::FETCH_ASSOC);

    if (!$ride) {
        $response['message'] = "Trajet non trouvé.";
        http_response_code(404);
        throw new Exception("Trajet non trouvé.");
    }

    // Vérifier si le départ n'est pas déjà passé (on ne peut annuler que les trajets à venir/planifiés)
    $departureTime = new DateTime($ride['departure_time']);
    if ($departureTime <= new DateTime() && $ride['ride_status'] !== 'planned') {
        // On peut permettre l'annulation d'un trajet 'ongoing' par le chauffeur, mais pas par le passager
        if ($ride['driver_id'] != $current_user_id || $ride['ride_status'] !== 'ongoing') {
            $response['message'] = "Ce trajet ne peut plus être annulé (déjà passé, en cours pour passager, ou terminé).";
            http_response_code(400);
            throw new Exception("Trajet non annulable.");
        }
    }
    
    if ($ride['ride_status'] === 'completed' || $ride['ride_status'] === 'cancelled_driver' || $ride['ride_status'] === 'cancelled_passenger') {
        $response['message'] = "Ce trajet est déjà terminé ou a été annulé.";
        http_response_code(400);
        throw new Exception("Trajet déjà terminé/annulé.");
    }


    // Cas 1: L'utilisateur connecté est le CHAUFFEUR du trajet
    if ($ride['driver_id'] == $current_user_id) {
        // Le chauffeur annule tout le trajet
        if ($ride['ride_status'] !== 'planned' && $ride['ride_status'] !== 'ongoing') {
            $response['message'] = "Vous ne pouvez annuler que les trajets planifiés ou en cours.";
            http_response_code(400);
            throw new Exception("Chauffeur : trajet non annulable (statut).");
        }

        // Rembourser tous les passagers qui avaient une réservation confirmée
        $stmtBookings = $pdo->prepare("SELECT user_id, seats_booked FROM Bookings WHERE ride_id = :ride_id AND booking_status = 'confirmed' FOR UPDATE");
        $stmtBookings->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtBookings->execute();
        $bookings = $stmtBookings->fetchAll(PDO::FETCH_ASSOC);

        $total_price_per_seat = (float)$ride['price_per_seat'];

        foreach ($bookings as $booking) {
            $passenger_id = (int)$booking['user_id'];
            $seats_refund = (int)$booking['seats_booked'];
            $amount_to_refund = $total_price_per_seat * $seats_refund;

            // Créditer le passager
            $stmtRefund = $pdo->prepare("UPDATE Users SET credits = credits + :amount WHERE id = :user_id");
            $stmtRefund->bindParam(':amount', $amount_to_refund);
            $stmtRefund->bindParam(':user_id', $passenger_id, PDO::PARAM_INT);
            $stmtRefund->execute();

            // Mettre à jour le statut de la réservation du passager
            $stmtUpdateBooking = $pdo->prepare("UPDATE Bookings SET booking_status = 'cancelled_driver' WHERE ride_id = :ride_id AND user_id = :user_id AND booking_status = 'confirmed'");
            $stmtUpdateBooking->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
            $stmtUpdateBooking->bindParam(':user_id', $passenger_id, PDO::PARAM_INT);
            $stmtUpdateBooking->execute();
            
            // TODO: Envoyer un email au passager $passenger_id pour l'informer de l'annulation par le chauffeur
            // ex: sendCancellationEmailToPassenger($passenger_id, $ride_id, "Le chauffeur a annulé le trajet.");
            error_log("ANNULATION CHAUFFEUR: Email à envoyer au passager ID $passenger_id pour trajet ID $ride_id");
        }

        // Mettre à jour le statut du trajet
        $stmtUpdateRide = $pdo->prepare("UPDATE Rides SET ride_status = 'cancelled_driver' WHERE id = :ride_id");
        $stmtUpdateRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtUpdateRide->execute();
        
        $response['message'] = "Trajet annulé avec succès. Les passagers ont été remboursés et seront notifiés.";

    // Cas 2: L'utilisateur connecté est un PASSAGER qui veut annuler sa réservation
    } else {
        // Récupérer la réservation spécifique de ce passager pour ce trajet
        $stmtMyBooking = $pdo->prepare("SELECT id, seats_booked, booking_status FROM Bookings WHERE ride_id = :ride_id AND user_id = :user_id FOR UPDATE");
        $stmtMyBooking->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtMyBooking->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtMyBooking->execute();
        $myBooking = $stmtMyBooking->fetch(PDO::FETCH_ASSOC);

        if (!$myBooking || $myBooking['booking_status'] !== 'confirmed') {
            $response['message'] = "Vous n'avez pas de réservation confirmée pour ce trajet ou elle est déjà annulée.";
            http_response_code(400);
            throw new Exception("Passager : pas de réservation confirmée.");
        }

        $seats_booked_by_user = (int)$myBooking['seats_booked'];
        $amount_to_refund_passenger = (float)$ride['price_per_seat'] * $seats_booked_by_user;

        // Rembourser le passager (l'utilisateur actuel)
        $stmtRefundPassenger = $pdo->prepare("UPDATE Users SET credits = credits + :amount WHERE id = :user_id");
        $stmtRefundPassenger->bindParam(':amount', $amount_to_refund_passenger);
        $stmtRefundPassenger->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtRefundPassenger->execute();

        // Mettre à jour le statut de la réservation du passager
        $stmtUpdateMyBooking = $pdo->prepare("UPDATE Bookings SET booking_status = 'cancelled_by_passenger' WHERE id = :booking_id");
        $stmtUpdateMyBooking->bindParam(':booking_id', $myBooking['id'], PDO::PARAM_INT);
        $stmtUpdateMyBooking->execute();

        // Les places redeviennent disponibles (géré par le calcul de seats_available dans search_rides)
        $response['message'] = "Votre réservation a été annulée avec succès. Vos crédits ont été remboursés.";
    }

    $pdo->commit();
    $response['success'] = true;
    http_response_code(200);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    if (http_response_code() < 400) { // Si aucun code d'erreur HTTP spécifique n'a été défini
        http_response_code(500);
    }
    error_log("Erreur lors de l'annulation (cancel_ride_booking.php): " . $e->getMessage() . " - RideID: " . $ride_id . " - UserID: " . $current_user_id);
    if (empty($response['message']) || http_response_code() == 500) {
        $response['message'] = 'Erreur serveur lors de l\'annulation.';
    }
}

echo json_encode($response);
?>