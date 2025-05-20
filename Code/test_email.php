<?php

// Charger les classes PHPMailer
use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;


require 'lib/PHPMailer/Exception.php';
require 'lib/PHPMailer/PHPMailer.php';
require 'lib/PHPMailer/SMTP.php';

// Créer une instance de PHPMailer; `true` active les exceptions
$mail = new PHPMailer(true);

try {
    // Paramètres du serveur SMTP
    // $mail->SMTPDebug = SMTP::DEBUG_SERVER;
    $mail->SMTPDebug = SMTP::DEBUG_OFF; 
    $mail->isSMTP();                                      // Utiliser SMTP
    $mail->Host       = 'smtp.gmail.com';                 // Serveur SMTP de Gmail
    $mail->SMTPAuth   = true;                             // Activer l'authentification SMTP
    $mail->Username   = 'ecoride.ecf.dev@gmail.com'; 
    $mail->Password   = 'nskmypmjzjmflaws';
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;       // Activer le cryptage TLS implicite (ou PHPMailer::ENCRYPTION_STARTTLS)
    $mail->Port       = 465;                              // Port TCP pour SMTPS (ou 587 pour STARTTLS)

    // --- Destinataires ---
    $mail->setFrom('ecoride.ecf.dev@gmail.com', 'EcoRide Test Email'); 
    $mail->addAddress('charlesmax.delamotte@gmail.com', 'Mon adresse');  
    // $mail->addReplyTo('info@example.com', 'Information');
    // $mail->addCC('cc@example.com');
    // $mail->addBCC('bcc@example.com');

    // --- Contenu de l'email ---
    $mail->isHTML(true);                                  // Définir le format de l'email en HTML
    $mail->Subject = 'Test Email EcoRide avec PHPMailer';
    $mail->Body    = 'Bonjour ! Ceci est un email de test envoyé par PHPMailer EcoRide. La configuration est correcte !';
    $mail->AltBody = 'Bonjour ! Ceci est un email de test envoyé par PHPMailer EcoRide. La configuration est correcte !'; // Corps pour les clients mail non-HTML

    $mail->send();
    echo 'Message de test envoyé avec succès ! Vérifiez votre boîte de réception.';

} catch (Exception $e) {
    echo "Le message n'a pas pu être envoyé. Erreur PHPMailer: {$mail->ErrorInfo}";
    // Logguer l'erreur complète pour le débogage
    error_log("Erreur PHPMailer (test_email.php): " . $e->getMessage() . " | PHPMailer ErrorInfo: " . $mail->ErrorInfo);
}
?>