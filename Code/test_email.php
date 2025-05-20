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
    // $mail->SMTPDebug = SMTP::DEBUG_SERVER; // Pour avoir des logs de debug SMTP détaillés si besoin
    $mail->SMTPDebug = SMTP::DEBUG_OFF;    // DEBUG_OFF une fois que ça marche
    $mail->isSMTP();                                      // Utiliser SMTP
    $mail->Host       = 'smtp.gmail.com';                 // Serveur SMTP de Gmail
    $mail->SMTPAuth   = true;                             // Activer l'authentification SMTP
    $mail->Username   = 'ecoride.ecf.dev@gmail.com'; // TON adresse email Gmail complète
    $mail->Password   = 'nskmypmjzjmflaws'; // Le mot de passe d'application à 16 caractères généré par Google
    $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;       // Activer le cryptage TLS implicite (ou PHPMailer::ENCRYPTION_STARTTLS)
    $mail->Port       = 465;                              // Port TCP pour SMTPS (ou 587 pour STARTTLS)

    // --- Destinataires ---
    $mail->setFrom('ecoride.ecf.dev@gmail.com', 'EcoRide Test Email'); // L'expéditeur (doit souvent être le même que Username)
    $mail->addAddress('charlesmax.delamotte@gmail.com', 'Mon adresse');     // Adresse du destinataire
    // $mail->addReplyTo('info@example.com', 'Information');
    // $mail->addCC('cc@example.com');
    // $mail->addBCC('bcc@example.com');

    // --- Contenu de l'email ---
    $mail->isHTML(true);                                  // Définir le format de l'email en HTML
    $mail->Subject = 'Test Email EcoRide avec PHPMailer';
    $mail->Body    = 'Bonjour !<br>Ceci est un email de test envoyé par PHPMailer depuis votre application EcoRide.<br>Si vous recevez ceci, la configuration est <b>correcte</b> !';
    $mail->AltBody = 'Bonjour ! Ceci est un email de test envoyé par PHPMailer depuis votre application EcoRide. Si vous recevez ceci, la configuration est correcte !'; // Corps pour les clients mail non-HTML

    $mail->send();
    echo 'Message de test envoyé avec succès ! Vérifiez votre boîte de réception.';

} catch (Exception $e) {
    echo "Le message n'a pas pu être envoyé. Erreur PHPMailer: {$mail->ErrorInfo}";
    // Logguer l'erreur complète pour le débogage
    error_log("Erreur PHPMailer (test_email.php): " . $e->getMessage() . " | PHPMailer ErrorInfo: " . $mail->ErrorInfo);
}
?>