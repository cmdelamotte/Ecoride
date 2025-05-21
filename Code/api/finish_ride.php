<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';
require_once __DIR__ . '/config/analytics_manager.php'; 

// Charger les classes PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;


require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

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
$response = ['success' => false, 'message' => 'Une erreur est survenue lors de la finalisation du trajet.'];
$platform_commission_per_seat = 2.00; 

try {
    $pdo->beginTransaction();

    // 1. Vérifier si l'utilisateur est le chauffeur et si le trajet est 'ongoing'
    // On récupère aussi les infos du trajet pour l'email
    $stmtCheck = $pdo->prepare(
    "SELECT r.id as ride_id_sql, r.driver_id, r.ride_status, r.price_per_seat, r.departure_city, r.arrival_city, r.departure_time, 
            u_driver.username as driver_username
            FROM Rides r
            JOIN Users u_driver ON r.driver_id = u_driver.id
            WHERE r.id = :ride_id FOR UPDATE"
    );
    $stmtCheck->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtCheck->execute();
    $ride = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    $ride_id_sql_for_analytics = (string)$ride['ride_id_sql']; // Pour MongoDB

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
        $response['message'] = "Ce trajet ne peut pas être marqué comme terminé (statut actuel: " . htmlspecialchars($ride['ride_status']) . "). Il doit être 'En cours'.";
        http_response_code(400);
        throw new Exception($response['message']);
    }

    // 2. Mettre à jour le statut du trajet à 'completed'
    $new_status = 'completed';
    $stmtUpdateRide = $pdo->prepare("UPDATE Rides SET ride_status = :new_status WHERE id = :ride_id");
    $stmtUpdateRide->bindParam(':new_status', $new_status);
    $stmtUpdateRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtUpdateRide->execute();

    recordRideCompletedEvent($ride_id_sql_for_analytics);

    // 3. Calculer les gains du chauffeur et mettre à jour ses crédits
    $stmtBookedSeats = $pdo->prepare("SELECT SUM(seats_booked) as total_confirmed_seats FROM Bookings WHERE ride_id = :ride_id AND booking_status = 'confirmed'");
    $stmtBookedSeats->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtBookedSeats->execute();
    $booked_info = $stmtBookedSeats->fetch(PDO::FETCH_ASSOC);
    
    $total_passengers = $booked_info ? (int)$booked_info['total_confirmed_seats'] : 0;
    $earnings_for_driver = 0;
    $gross_earnings = 0;
    $total_commission_for_platform = 0; // <-- Variable pour la commission

    if ($total_passengers > 0) {
        $price_per_seat = (float)$ride['price_per_seat'];
        $gross_earnings = $price_per_seat * $total_passengers;
        $total_commission_for_platform = $platform_commission_per_seat * $total_passengers; // <--- CALCUL
        $earnings_for_driver = $gross_earnings - $total_commission_for_platform;

        if ($earnings_for_driver > 0) { // On ne crédite que si le gain net est positif
            $stmtAddCredits = $pdo->prepare("UPDATE Users SET credits = credits + :earnings WHERE id = :driver_id");
            $stmtAddCredits->bindParam(':earnings', $earnings_for_driver);
            $stmtAddCredits->bindParam(':driver_id', $current_user_id, PDO::PARAM_INT); // current_user_id est le chauffeur
            $stmtAddCredits->execute();
        }
    }

    // Enregistrer le revenu de la plateforme
        if ($total_commission_for_platform > 0) {
            recordPlatformRevenueEvent($ride_id_sql_for_analytics, $total_commission_for_platform);
        }
    
    // 4. Récupérer les emails des passagers confirmés pour envoyer une notification d'avis
    $stmtPassengers = $pdo->prepare(
        "SELECT u.email as passenger_email, u.username as passenger_username 
                FROM Bookings b JOIN Users u ON b.user_id = u.id 
                WHERE b.ride_id = :ride_id AND b.booking_status = 'confirmed'"
    );
    $stmtPassengers->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtPassengers->execute();
    $passengers = $stmtPassengers->fetchAll(PDO::FETCH_ASSOC);

    $rideDetailsForEmail = htmlspecialchars($ride['departure_city'] ?? 'N/A') . 
                            " -> " . htmlspecialchars($ride['arrival_city'] ?? 'N/A') . 
                            " du " . (isset($ride['departure_time']) ? (new DateTime($ride['departure_time']))->format('d/m/Y à H:i') : 'Date inconnue');
    $driverUsernameForEmail = htmlspecialchars($ride['driver_username'] ?? 'Votre chauffeur');
    $linkToYourRides = "http://ecoride.local/your-rides"; // Lien vers la page de l'historique

    foreach ($passengers as $passenger) {
        if (isset($passenger['passenger_email']) && filter_var($passenger['passenger_email'], FILTER_VALIDATE_EMAIL)) {
            $mail = new PHPMailer(true);
            try {
                $mail->isSMTP();
                $mail->Host       = 'smtp.gmail.com';
                $mail->SMTPAuth   = true;
                $mail->Username   = 'ecoride.ecf.dev@gmail.com';
                $mail->Password   = 'nskmypmjzjmflaws';
                $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                $mail->Port       = 465;
                $mail->CharSet    = 'UTF-8';

                $mail->setFrom('ecoride.ecf.dev@gmail.com', 'EcoRide Notifications');
                $mail->addAddress($passenger['passenger_email'], htmlspecialchars($passenger['passenger_username'] ?? 'Passager'));

                $mail->isHTML(true);
                $mail->Subject = 'Votre trajet EcoRide est terminé ! Laissez un avis.';
                $mail->Body    = "Bonjour " . htmlspecialchars($passenger['passenger_username'] ?? 'Passager') . ",<br><br>" .
                                "Votre covoiturage pour le trajet " . $rideDetailsForEmail . 
                                " avec le chauffeur " . $driverUsernameForEmail . " est maintenant terminé.<br><br>" .
                                "Nous espérons que tout s'est bien passé ! <br>" .
                                "N'hésitez pas à laisser un avis sur votre expérience en vous rendant sur votre espace \"Mes Trajets\" : " .
                                "<a href=\"" . $linkToYourRides . "\">" . $linkToYourRides . "</a><br><br>" .
                                "Merci d'utiliser EcoRide !";
                $mail->AltBody = "Bonjour " . htmlspecialchars($passenger['passenger_username'] ?? 'Passager') . ",\n\n" .
                                "Votre covoiturage pour le trajet " . $rideDetailsForEmail . 
                                " avec le chauffeur " . $driverUsernameForEmail . " est maintenant terminé.\n\n" .
                                "Nous espérons que tout s'est bien passé ! \n" .
                                "N'hésitez pas à laisser un avis sur votre expérience en vous rendant sur votre espace \"Mes Trajets\" : " .
                                $linkToYourRides . "\n\n" .
                                "Merci d'utiliser EcoRide !";
                $mail->send();
                error_log("FINISH_RIDE: Email de demande d'avis envoyé à " . $passenger['passenger_email'] . " pour trajet ID " . $ride_id);
            } catch (Exception $e_mail) {
                error_log("Erreur PHPMailer (finish_ride.php) envoi à " . $passenger['passenger_email'] . ": " . $mail->ErrorInfo . " || Exception: " . $e_mail->getMessage());
            }
        }
    }

    $pdo->commit();

    $response['success'] = true;
    $response['message'] = "Trajet marqué comme terminé ! Gains nets chauffeur calculés: " . number_format($earnings_for_driver, 2) . " crédits. Les passagers seront invités à laisser un avis.";
    http_response_code(200);

} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) { $pdo->rollBack(); }
    if (http_response_code() < 400) { http_response_code(500); }
    error_log("Erreur (finish_ride.php): RideID $ride_id_from_input, UserID $current_user_id - " . $e->getMessage());
    if (empty($response['message']) || http_response_code() == 500) {
        $response['message'] = 'Erreur serveur lors de la finalisation du trajet.';
    }
}

echo json_encode($response);
?>