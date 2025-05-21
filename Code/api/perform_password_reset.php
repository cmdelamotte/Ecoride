<?php

require_once __DIR__ . '/config/database.php';

if (session_status() == PHP_SESSION_NONE) {
    // Pas besoin de session_start() ici, cette action ne dépend pas d'une session connectée
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

$token = trim($input['token'] ?? '');
$newPassword = $input['new_password'] ?? ''; // Pas de trim pour le mot de passe
$confirmNewPassword = $input['confirm_new_password'] ?? '';

$errors = [];
if (empty($token)) {
    $errors['token'] = "Jeton de réinitialisation manquant.";
}
if (empty($newPassword)) {
    $errors['new_password'] = "Le nouveau mot de passe est requis.";
} elseif (strlen($newPassword) < 8) {
    $errors['new_password'] = "Le nouveau mot de passe doit faire au moins 8 caractères.";
}
if ($newPassword !== $confirmNewPassword) {
    $errors['confirm_new_password'] = "La confirmation ne correspond pas au nouveau mot de passe.";
}
// Regex pour la complexité (identique à celle du JS)
$passwordRegex = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/';
if (!empty($newPassword) && !preg_match($passwordRegex, $newPassword)) {
    $errors['new_password'] = "Le nouveau mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";
}


if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Données invalides.', 'errors' => $errors]);
    exit();
}

try {
    $pdo = getPDOConnection();

    // 1. Vérifier le token et sa date d'expiration
    $sqlCheckToken = "SELECT id FROM Users WHERE reset_token = :token AND reset_token_expires_at > NOW() LIMIT 1";
    $stmtCheckToken = $pdo->prepare($sqlCheckToken);
    $stmtCheckToken->bindParam(':token', $token);
    $stmtCheckToken->execute();
    $user = $stmtCheckToken->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Jeton invalide ou expiré. Veuillez refaire une demande de réinitialisation.']);
        exit();
    }

    // 2. Mettre à jour le mot de passe
    $newPasswordHash = password_hash($newPassword, PASSWORD_DEFAULT);
    $sqlUpdatePassword = "UPDATE Users SET password_hash = :password_hash, reset_token = NULL, reset_token_expires_at = NULL WHERE id = :user_id";
    $stmtUpdatePassword = $pdo->prepare($sqlUpdatePassword);
    $stmtUpdatePassword->bindParam(':password_hash', $newPasswordHash);
    $stmtUpdatePassword->bindParam(':user_id', $user['id'], PDO::PARAM_INT);

    if ($stmtUpdatePassword->execute()) {
        http_response_code(200);
        echo json_encode(['success' => true, 'message' => 'Votre mot de passe a été réinitialisé avec succès. Vous pouvez maintenant vous connecter.']);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur lors de la mise à jour du mot de passe.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (perform_password_reset.php): " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la réinitialisation.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur Générale (perform_password_reset.php): " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}
?>