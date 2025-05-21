<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';
require_once __DIR__ . '/config/settings.php';


use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

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

    // Récupérer les informations du trajet, y compris le nom du chauffeur et les détails du trajet pour l'email
    $stmtRide = $pdo->prepare(
        "SELECT r.driver_id, r.ride_status, r.price_per_seat, r.departure_time, 
                r.departure_city, r.arrival_city, u_driver.username as driver_username 
        FROM Rides r
        JOIN Users u_driver ON r.driver_id = u_driver.id
        WHERE r.id = :ride_id FOR UPDATE"
    );
    $stmtRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtRide->execute();
    $ride = $stmtRide->fetch(PDO::FETCH_ASSOC);

    if (!$ride) {
        $response['message'] = "Trajet non trouvé.";
        http_response_code(404);
        throw new Exception("Trajet non trouvé.");
    }

    $departureTime = new DateTime($ride['departure_time']);
    if ($departureTime <= new DateTime() && !($ride['driver_id'] == $current_user_id && $ride['ride_status'] === 'ongoing')) {
        $response['message'] = "Ce trajet ne peut plus être annulé (déjà passé ou statut incompatible).";
        http_response_code(400);
        throw new Exception("Trajet non annulable (temps/statut).");
    }
    if ($ride['ride_status'] === 'completed' || $ride['ride_status'] === 'cancelled_driver' || $ride['ride_status'] === 'cancelled_by_passenger') {
        $response['message'] = "Ce trajet est déjà terminé ou a été annulé.";
        http_response_code(400);
        throw new Exception("Trajet déjà terminé/annulé.");
    }

    // Cas 1: L'utilisateur connecté est le CHAUFFEUR du trajet
    if ($ride['driver_id'] == $current_user_id) {
        if ($ride['ride_status'] !== 'planned' && $ride['ride_status'] !== 'ongoing') {
            $response['message'] = "Vous ne pouvez annuler que les trajets planifiés ou en cours.";
            http_response_code(400);
            throw new Exception("Chauffeur : trajet non annulable (statut).");
        }

        $stmtBookings = $pdo->prepare(
            "SELECT b.user_id, b.seats_booked, u_passenger.email as passenger_email, u_passenger.username as passenger_username 
            FROM Bookings b
            JOIN Users u_passenger ON b.user_id = u_passenger.id
            WHERE b.ride_id = :ride_id AND b.booking_status = 'confirmed' FOR UPDATE"
        );
        $stmtBookings->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtBookings->execute();
        $bookings = $stmtBookings->fetchAll(PDO::FETCH_ASSOC);

        $rideDetailsForEmail = htmlspecialchars($ride['departure_city'] ?? 'N/A') . 
                                " -> " . htmlspecialchars($ride['arrival_city'] ?? 'N/A') . 
                                " du " . (isset($ride['departure_time']) ? (new DateTime($ride['departure_time']))->format('d/m/Y à H:i') : 'Date inconnue');
        $driverUsernameForEmail = htmlspecialchars($ride['driver_username'] ?? 'Chauffeur inconnu');

        foreach ($bookings as $booking) {
            $passenger_id = (int)$booking['user_id'];
            $seats_refund = (int)$booking['seats_booked'];
            $amount_to_refund = (float)$ride['price_per_seat'] * $seats_refund;

            $stmtRefund = $pdo->prepare("UPDATE Users SET credits = credits + :amount WHERE id = :user_id");
            $stmtRefund->bindParam(':amount', $amount_to_refund);
            $stmtRefund->bindParam(':user_id', $passenger_id, PDO::PARAM_INT);
            $stmtRefund->execute();

            $stmtUpdateBooking = $pdo->prepare("UPDATE Bookings SET booking_status = 'cancelled_driver' WHERE ride_id = :ride_id AND user_id = :user_id AND booking_status = 'confirmed'");
            $stmtUpdateBooking->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
            $stmtUpdateBooking->bindParam(':user_id', $passenger_id, PDO::PARAM_INT);
            $stmtUpdateBooking->execute();
            
            if (isset($booking['passenger_email']) && filter_var($booking['passenger_email'], FILTER_VALIDATE_EMAIL)) {
                $mail = new PHPMailer(true);
                try {
                    $mail->isSMTP();
                    $mail->Host       = SMTP_HOST;
                    $mail->SMTPAuth   = true;
                    $mail->Username   = SMTP_USERNAME;
                    $mail->Password   = SMTP_PASSWORD;
                    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                    $mail->Port       = 465;
                    $mail->CharSet    = 'UTF-8';

                    $mail->setFrom('ecoride.ecf.dev@gmail.com', 'EcoRide Notifications');
                    $mail->addAddress($booking['passenger_email'], htmlspecialchars($booking['passenger_username'] ?? 'Passager'));

                    $mail->isHTML(true);
                    $mail->Subject = 'Annulation de votre covoiturage EcoRide';
                    $mail->Body    = "Bonjour " . htmlspecialchars($booking['passenger_username'] ?? 'Passager') . ",<br><br>" .
                                    "Nous sommes au regret de vous informer que votre covoiturage pour le trajet " . $rideDetailsForEmail . 
                                    " avec le chauffeur " . $driverUsernameForEmail . " a été annulé.<br><br>" .
                                    "Vos crédits pour cette réservation ont été intégralement remboursés.<br><br>" .
                                    "L'équipe EcoRide";
                    $mail->AltBody = "Bonjour " . htmlspecialchars($booking['passenger_username'] ?? 'Passager') . ",\n\n" .
                                    "Nous sommes au regret de vous informer que votre covoiturage pour le trajet " . $rideDetailsForEmail . 
                                    " avec le chauffeur " . $driverUsernameForEmail . " a été annulé.\n\n" .
                                    "Vos crédits pour cette réservation ont été intégralement remboursés.\n\n" .
                                    "L'équipe EcoRide";
                    $mail->send();
                    error_log("ANNULATION CHAUFFEUR: Email envoyé à " . $booking['passenger_email'] . " pour trajet ID " . $ride_id);
                } catch (Exception $e_mail) {
                    error_log("Erreur PHPMailer (cancel_ride_booking.php) envoi à " . $booking['passenger_email'] . ": " . $mail->ErrorInfo . " || Exception: " . $e_mail->getMessage());
                }
            }
        }
        $stmtUpdateRide = $pdo->prepare("UPDATE Rides SET ride_status = 'cancelled_driver' WHERE id = :ride_id");
        $stmtUpdateRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtUpdateRide->execute();
        $response['message'] = "Trajet annulé avec succès. Les passagers (" . count($bookings) . ") ont été remboursés et notifiés.";
    } else { // Cas PASSAGER annule
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

        $stmtRefundPassenger = $pdo->prepare("UPDATE Users SET credits = credits + :amount WHERE id = :user_id");
        $stmtRefundPassenger->bindParam(':amount', $amount_to_refund_passenger);
        $stmtRefundPassenger->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtRefundPassenger->execute();

        $stmtUpdateMyBooking = $pdo->prepare("UPDATE Bookings SET booking_status = 'cancelled_by_passenger' WHERE id = :booking_id");
        $stmtUpdateMyBooking->bindParam(':booking_id', $myBooking['id'], PDO::PARAM_INT);
        $stmtUpdateMyBooking->execute();
        $response['message'] = "Votre réservation a été annulée. Vos crédits ont été remboursés.";
    }

    $pdo->commit();
    $response['success'] = true;
    http_response_code(200);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    if (http_response_code() < 400) { http_response_code(500); }
    error_log("Erreur (cancel_ride_booking.php): RideID $ride_id, UserID $current_user_id - " . $e->getMessage());
    if (empty($response['message']) || http_response_code() == 500) {
        $response['message'] = 'Erreur serveur lors de l\'annulation.';
    }
}

echo json_encode($response);
?>