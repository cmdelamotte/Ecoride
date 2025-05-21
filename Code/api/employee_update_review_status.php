<?php

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

$isAllowed = false;
if (isset($_SESSION['user_id']) && isset($_SESSION['roles_system']) && is_array($_SESSION['roles_system'])) {
    if (in_array('ROLE_EMPLOYEE', $_SESSION['roles_system']) || in_array('ROLE_ADMIN', $_SESSION['roles_system'])) {
        $isAllowed = true;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Accès non autorisé.']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); 
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée.']);
    exit();
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$reviewIdInput = trim($input['review_id'] ?? ''); 
$newStatus = trim($input['new_status'] ?? '');

$reviewIdNumeric = null;
if (preg_match('/(\d+)$/', $reviewIdInput, $matches)) {
    $reviewIdNumeric = (int)$matches[1];
}

$response = ['success' => false, 'message' => 'Données invalides.'];

if (!$reviewIdNumeric || !in_array($newStatus, ['approved', 'rejected'])) {
    http_response_code(400);
    echo json_encode($response);
    exit();
}

$pdo = getPDOConnection(); // Initialiser $pdo ici pour qu'il soit dispo dans le catch si besoin

try {
    $pdo->beginTransaction(); // Commencer la transaction

    $sql = "UPDATE Reviews SET review_status = :new_status WHERE id = :review_id AND review_status = 'pending_approval'";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':new_status', $newStatus, PDO::PARAM_STR);
    $stmt->bindParam(':review_id', $reviewIdNumeric, PDO::PARAM_INT);

    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) {
            $response['success'] = true;
            $response['message'] = "Statut de l'avis ID " . $reviewIdNumeric . " mis à jour à '" . $newStatus . "'.";
            http_response_code(200);

            // Récupérer les infos du trajet et du chauffeur pour les emails et crédits
            $sqlRideAndDriverInfo = "SELECT 
                                        r.driver_id, 
                                        r.price_per_seat, 
                                        r.id as ride_id_sql,
                                        r.departure_city,
                                        r.arrival_city,
                                        r.departure_time,
                                        driver.email as driver_email,
                                        driver.username as driver_username,
                                        author.username as author_username,
                                        rev.comment as review_comment_content,
                                        (SELECT SUM(b.seats_booked) FROM Bookings b WHERE b.ride_id = r.id AND b.booking_status = 'confirmed') as total_confirmed_seats
                                    FROM Reviews rev
                                    JOIN Rides r ON rev.ride_id = r.id
                                    JOIN Users driver ON r.driver_id = driver.id
                                    JOIN Users author ON rev.author_id = author.id
                                    WHERE rev.id = :review_id_for_processing";
            
            $stmtRideInfo = $pdo->prepare($sqlRideAndDriverInfo);
            $stmtRideInfo->bindParam(':review_id_for_processing', $reviewIdNumeric, PDO::PARAM_INT);
            $stmtRideInfo->execute();
            $rideAndDriverInfo = $stmtRideInfo->fetch(PDO::FETCH_ASSOC);

            if (!$rideAndDriverInfo) {
                throw new Exception("Impossible de récupérer les détails du trajet/chauffeur pour l'avis ID " . $reviewIdNumeric);
            }

            $rideDetailsForEmail = htmlspecialchars($rideAndDriverInfo['departure_city']) . 
                                    " -> " . htmlspecialchars($rideAndDriverInfo['arrival_city']) . 
                                    " du " . (new DateTime($rideAndDriverInfo['departure_time']))->format('d/m/Y à H:i');

            if ($newStatus === 'approved') {
                $platform_commission_per_seat = 2.00;
                $total_passengers = $rideAndDriverInfo['total_confirmed_seats'] ? (int)$rideAndDriverInfo['total_confirmed_seats'] : 0;
                $earnings_for_driver = 0;

                if ($total_passengers > 0) {
                    $price_per_seat = (float)$rideAndDriverInfo['price_per_seat'];
                    $gross_earnings = $price_per_seat * $total_passengers;
                    $total_commission_for_platform = $platform_commission_per_seat * $total_passengers;
                    $earnings_for_driver = $gross_earnings - $total_commission_for_platform;

                    if ($earnings_for_driver > 0) {
                        $stmtAddCredits = $pdo->prepare("UPDATE Users SET credits = credits + :earnings WHERE id = :driver_id");
                        $stmtAddCredits->bindParam(':earnings', $earnings_for_driver);
                        $stmtAddCredits->bindParam(':driver_id', $rideAndDriverInfo['driver_id'], PDO::PARAM_INT);
                        $stmtAddCredits->execute();
                        if ($stmtAddCredits->rowCount() > 0) {
                            $response['message'] .= " Le chauffeur a été crédité de " . number_format($earnings_for_driver, 2) . " crédits.";
                        } else {
                            $response['message'] .= " Erreur lors du crédit du chauffeur (pas de lignes affectées).";
                            error_log("Erreur update_review_status: Échec crédit chauffeur ID " . $rideAndDriverInfo['driver_id'] . " pour trajet ID " . $rideAndDriverInfo['ride_id_sql']);
                        }
                    } else {
                        $response['message'] .= " Aucun crédit net à attribuer au chauffeur pour ce trajet.";
                    }
                }
            } elseif ($newStatus === 'rejected') {
                // Envoyer un email au chauffeur pour l'informer du rejet et l'inviter à contacter le support
                if ($rideAndDriverInfo['driver_email']) {
                    $mail = new PHPMailer(true);
                    try {
                        // Paramètres SMTP (identiques à tes autres scripts d'email)
                        $mail->isSMTP();
                        $mail->Host       = 'smtp.gmail.com';
                        $mail->SMTPAuth   = true;
                        $mail->Username   = 'ecoride.ecf.dev@gmail.com';
                        $mail->Password   = 'nskmypmjzjmflaws';
                        $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
                        $mail->Port       = 465;
                        $mail->CharSet    = 'UTF-8';

                        $mail->setFrom('ecoride.ecf.dev@gmail.com', 'Support EcoRide');
                        $mail->addAddress($rideAndDriverInfo['driver_email'], $rideAndDriverInfo['driver_username']);
                        
                        $mail->isHTML(true);
                        $mail->Subject = 'Information concernant un avis sur votre trajet EcoRide';
                        $mail->Body    = "Bonjour " . htmlspecialchars($rideAndDriverInfo['driver_username']) . ",<br><br>" .
                                        "Un avis soumis par " . htmlspecialchars($rideAndDriverInfo['author_username']) . " pour votre trajet " . $rideDetailsForEmail . " (ID Avis: " . $reviewIdInput . ") n'a pas pu être approuvé.<br><br>" .
                                        "Commentaire de l'avis (si applicable) : <br><em>" . nl2br(htmlspecialchars($rideAndDriverInfo['review_comment_content'])) . "</em><br><br>" .
                                        "Pour discuter de cette situation et comprendre les raisons, nous vous invitons à contacter le support EcoRide à l'adresse support@ecoride.example.com (veuillez remplacer par une vraie adresse de support).<br><br>" .
                                        "Les crédits pour ce trajet ne seront pas versés tant que la situation n'est pas clarifiée.<br><br>" .
                                        "Cordialement,<br>L'équipe EcoRide";
                        $mail->AltBody = "Bonjour " . htmlspecialchars($rideAndDriverInfo['driver_username']) . ",\n\n" .
                                        "Un avis soumis par " . htmlspecialchars($rideAndDriverInfo['author_username']) . " pour votre trajet " . $rideDetailsForEmail . " (ID Avis: " . $reviewIdInput . ") n'a pas pu être approuvé.\n\n" .
                                        "Commentaire de l'avis (si applicable) : \n" . htmlspecialchars($rideAndDriverInfo['review_comment_content']) . "\n\n" .
                                        "Pour discuter de cette situation et comprendre les raisons, nous vous invitons à contacter le support EcoRide à l'adresse ecoride.ecf.dev@gmail.com.\n\n" .
                                        "Les crédits pour ce trajet ne seront pas versés tant que la situation n'est pas clarifiée.\n\n" .
                                        "Cordialement,\nL'équipe EcoRide";
                        
                        $mail->send();
                        $response['message'] .= " Un email a été envoyé au chauffeur pour l'informer du rejet de l'avis.";
                        error_log("Email de rejet d'avis envoyé au chauffeur " . $rideAndDriverInfo['driver_email'] . " pour avis ID " . $reviewIdInput);

                    } catch (Exception $e_mail) {
                        $response['message'] .= " L'avis a été rejeté, mais l'email au chauffeur n'a pas pu être envoyé. Erreur: " . $mail->ErrorInfo;
                        error_log("Erreur PHPMailer (update_review_status pour rejet) envoi à " . $rideAndDriverInfo['driver_email'] . ": " . $mail->ErrorInfo . " || Exception: " . $e_mail->getMessage());
                    }
                } else {
                    $response['message'] .= " L'avis a été rejeté, mais l'email du chauffeur n'a pas été trouvé pour notification.";
                    error_log("Erreur update_review_status: Email du chauffeur non trouvé pour avis ID " . $reviewIdInput . " (rejet).");
                }
            }
            $pdo->commit(); // Valider la transaction SQL (Mise à jour de l'avis ET potentiellement des crédits)
        } else {
            $pdo->rollBack(); // Annuler si la mise à jour du statut de l'avis a échoué
            $response['message'] = "Aucune modification effectuée. L'avis n'existe peut-être pas ou n'était pas en attente.";
            http_response_code(200); 
        }
    } else {
        $pdo->rollBack(); // Annuler si l'exécution de la requête a échoué
        http_response_code(500);
        $response['message'] = "Échec de la mise à jour du statut de l'avis en base de données.";
    }

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    $response['message'] = "Erreur PDO: " . $e->getMessage();
    error_log("Erreur employee_update_review_status.php (PDO): " . $e->getMessage());
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    $response['message'] = "Erreur générale: " . $e->getMessage();
    error_log("Erreur employee_update_review_status.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>