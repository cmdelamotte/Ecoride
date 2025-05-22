<?php

require_once __DIR__ . '/config/settings.php';
require_once __DIR__ . '/../lib/PHPMailer/Exception.php';
require_once __DIR__ . '/../lib/PHPMailer/PHPMailer.php';
require_once __DIR__ . '/../lib/PHPMailer/SMTP.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

// Pas besoin de session_start() ici, le formulaire de contact est public

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

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$contactName = trim($input['name'] ?? '');
$contactEmail = trim($input['email'] ?? '');
$contactSubject = trim($input['subject'] ?? '');
$contactMessage = trim($input['message'] ?? '');

$errors = [];
if (empty($contactName)) { $errors['name'] = "Le nom est requis."; }
if (empty($contactEmail) || !filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) { $errors['email'] = "Un email valide est requis."; }
if (empty($contactSubject)) { $errors['subject'] = "Le sujet est requis."; }
if (empty($contactMessage) || strlen($contactMessage) < 10) { $errors['message'] = "Le message doit contenir au moins 10 caractères."; }

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Données invalides.', 'errors' => $errors]);
    exit();
}

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

    // Destinataire
    $mail->setFrom(SMTP_USERNAME, 'EcoRide Contact Form');
    $mail->addAddress('ecoride.ecf.dev@gmail.com', 'Support EcoRide'); // Où les messages arrivent
    $mail->addReplyTo($contactEmail, $contactName); // Pour pouvoir répondre directement à l'utilisateur

    // Contenu de l'email
    $mail->isHTML(true);
    $mail->Subject = 'Nouveau message de contact EcoRide: ' . htmlspecialchars($contactSubject);
    
    $emailBody = "Bonjour,<br><br>";
    $emailBody .= "Vous avez reçu un nouveau message via le formulaire de contact EcoRide :<br><br>";
    $emailBody .= "<strong>Nom :</strong> " . htmlspecialchars($contactName) . "<br>";
    $emailBody .= "<strong>Email :</strong> " . htmlspecialchars($contactEmail) . "<br>";
    $emailBody .= "<strong>Sujet :</strong> " . htmlspecialchars($contactSubject) . "<br>";
    $emailBody .= "<strong>Message :</strong><br>" . nl2br(htmlspecialchars($contactMessage)) . "<br><br>";
    $emailBody .= "---<br>Ce message a été envoyé depuis le formulaire de contact du site EcoRide.";
    $mail->Body = $emailBody;

    $mail->AltBody = "Nouveau message de contact EcoRide :\n\n" .
                    "Nom : " . htmlspecialchars($contactName) . "\n" .
                    "Email : " . htmlspecialchars($contactEmail) . "\n" .
                    "Sujet : " . htmlspecialchars($contactSubject) . "\n" .
                    "Message :\n" . htmlspecialchars($contactMessage) . "\n\n" .
                    "---\nEnvoyé depuis le formulaire de contact EcoRide.";

    $mail->send();
    http_response_code(200);
    echo json_encode(['success' => true, 'message' => 'Votre message a bien été envoyé ! Nous vous répondrons dès que possible.']);

} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur PHPMailer (submit_contact_form.php): " . $mail->ErrorInfo . " || Exception: " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => "Le message n'a pas pu être envoyé. Erreur : " . $mail->ErrorInfo]);
}
?>