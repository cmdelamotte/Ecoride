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

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$email = trim($input['email'] ?? '');

if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Adresse email invalide ou manquante.']);
    exit();
}

$responseMessage = "Si cette adresse e-mail est associée à un compte, un lien de réinitialisation de mot de passe vient de vous être envoyé.";
$responseStatus = 200;
$success = true;

try {
    $pdo = getPDOConnection();
    $sql = "SELECT id, username FROM Users WHERE email = :email LIMIT 1";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':email', $email);
    $stmt->execute();
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($user) {
        // Générer un token unique
        $token = bin2hex(random_bytes(32)); // Token de 64 caractères hexadécimaux
        $expiresAt = (new DateTime())->modify('+1 hour')->format('Y-m-d H:i:s'); // Token expire dans 1 heure

        // Stocker le token et sa date d'expiration dans la table Users
        $sqlUpdateToken = "UPDATE Users SET reset_token = :token, reset_token_expires_at = :expires_at WHERE id = :user_id";
        $stmtUpdate = $pdo->prepare($sqlUpdateToken);
        $stmtUpdate->bindParam(':token', $token);
        $stmtUpdate->bindParam(':expires_at', $expiresAt);
        $stmtUpdate->bindParam(':user_id', $user['id'], PDO::PARAM_INT);
        
        if (!$stmtUpdate->execute()) {
            throw new Exception("Impossible de sauvegarder le jeton de réinitialisation.");
        }

        // Lien de réinitialisation
        $resetLink = "http://ecoride.local/reset-password?token=" . $token;

        // Envoyer l'email
        $mail = new PHPMailer(true);
        try {
            // Paramètres SMTP
            $mail->isSMTP();
            $mail->Host       = 'smtp.gmail.com';
            $mail->SMTPAuth   = true;
            $mail->Username   = 'ecoride.ecf.dev@gmail.com';
            $mail->Password   = 'nskmypmjzjmflaws';
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = 465;
            $mail->CharSet    = 'UTF-8';

            $mail->setFrom('no-reply@ecoride.local', 'EcoRide - Support');
            $mail->addAddress($email, $user['username']);
            
            $mail->isHTML(true);
            $mail->Subject = 'Réinitialisation de votre mot de passe EcoRide';
            $mail->Body    = "Bonjour " . htmlspecialchars($user['username']) . ",<br><br>" .
                            "Vous avez demandé une réinitialisation de votre mot de passe pour votre compte EcoRide.<br>" .
                            "Veuillez cliquer sur le lien ci-dessous pour choisir un nouveau mot de passe :<br>" .
                            "<a href='" . $resetLink . "'>" . $resetLink . "</a><br><br>" .
                            "Ce lien expirera dans une heure.<br>" .
                            "Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.<br><br>" .
                            "Cordialement,<br>L'équipe EcoRide";
            $mail->AltBody = "Bonjour " . htmlspecialchars($user['username']) . ",\n\n" .
                            "Vous avez demandé une réinitialisation de votre mot de passe pour votre compte EcoRide.\n" .
                            "Veuillez copier et coller le lien suivant dans votre navigateur pour choisir un nouveau mot de passe :\n" .
                            $resetLink . "\n\n" .
                            "Ce lien expirera dans une heure.\n" .
                            "Si vous n'avez pas demandé cette réinitialisation, veuillez ignorer cet email.\n\n" .
                            "Cordialement,\nL'équipe EcoRide";
            
            $mail->send();

        } catch (Exception $e_mail) {
            error_log("Erreur PHPMailer (request_password_reset.php) envoi à " . $email . ": " . $mail->ErrorInfo . " || Exception: " . $e_mail->getMessage());
            // On ne change pas le message au client pour des raisons de sécurité, mais on logue l'erreur.
            // Message plus générique d'erreur si l'email échoue ici.
            $responseMessage = "Une erreur s'est produite lors de la tentative d'envoi de l'email. Veuillez réessayer plus tard.";
            $success = false; // Marquer comme échec si l'email ne part pas
            $responseStatus = 500;
        }
    }
    // Si l'email n'est pas trouvé dans la base, on ne fait rien mais on renvoie quand même un message générique
    // pour ne pas révéler quels emails sont enregistrés (déjà géré par le message par défaut).

    http_response_code($responseStatus);
    echo json_encode(['success' => $success, 'message' => $responseMessage]);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur request_password_reset.php (Générale): " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur serveur est survenue.']);
}
?>