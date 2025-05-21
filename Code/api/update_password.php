<?php

require_once 'config/database.php';
require_once __DIR__ . '/config/settings.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

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
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$current_user_id = $_SESSION['user_id'];


$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);


$oldPassword = $input['oldPassword'] ?? '';
$newPassword = $input['newPassword'] ?? '';
$confirmNewPassword = $input['confirmNewPassword'] ?? '';


$errors = [];


$passwordRegex = '/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/';


if (empty($oldPassword)) {
    $errors['oldPassword'] = "L'ancien mot de passe est requis.";
}
if (empty($newPassword)) {
    $errors['newPassword'] = "Le nouveau mot de passe est requis.";
}
if (empty($confirmNewPassword)) {
    $errors['confirmNewPassword'] = "La confirmation du nouveau mot de passe est requise.";
}


if (!empty($newPassword) && !empty($confirmNewPassword) && $newPassword !== $confirmNewPassword) {
    $errors['confirmNewPassword'] = "La confirmation ne correspond pas au nouveau mot de passe.";
}


if (!empty($newPassword) && !isset($errors['confirmNewPassword']) && !preg_match($passwordRegex, $newPassword)) {
    $errors['newPassword'] = "Le nouveau mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";
}


if (empty($errors['oldPassword']) && empty($errors['newPassword']) && empty($errors['confirmNewPassword'])) {
    try {
        $pdo = getPDOConnection();
        $stmtCheckPass = $pdo->prepare("SELECT password_hash FROM Users WHERE id = :user_id");
        $stmtCheckPass->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtCheckPass->execute();
        $user_db_data = $stmtCheckPass->fetch(PDO::FETCH_ASSOC);

        if (!$user_db_data || !password_verify($oldPassword, $user_db_data['password_hash'])) {
            $errors['oldPassword'] = "L'ancien mot de passe est incorrect.";
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO (update_password.php - vérif ancien mdp) : " . $e->getMessage());
        $errors['database'] = "Erreur serveur lors de la vérification des informations.";
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur serveur.', 'errors' => $errors]);
        exit();
    }
}


if (!empty($errors)) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation.', 'errors' => $errors]);
    exit();
}

try {
    // 1. Hasher le nouveau mot de passe
    $new_password_hash = password_hash($newPassword, PASSWORD_DEFAULT);

    // 2. Préparer la requête UPDATE
    $sql = "UPDATE Users SET password_hash = :new_password_hash WHERE id = :user_id";
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':new_password_hash', $new_password_hash);
    $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Mot de passe mis à jour avec succès en BDD.

        // Détruire la session actuelle pour des raisons de sécurité.
        // Cela déconnectera l'utilisateur de toutes ses sessions actives
        // et le forcera à se reconnecter avec le nouveau mot de passe.
        session_unset();
        session_destroy();
        
        // Dit au navigateur d'effacer le cookie de session
        if (ini_get("session.use_cookies")) {
            $params = session_get_cookie_params();
            setcookie(session_name(), '', time() - 42000,
                $params["path"], $params["domain"],
                $params["secure"], $params["httponly"]
            );
        }

        http_response_code(200); // OK
        echo json_encode([
            'success' => true,
            'message' => 'Votre mot de passe a été mis à jour avec succès. Vous allez être déconnecté pour des raisons de sécurité et devrez vous reconnecter.'
            // On n'a plus besoin de renvoyer d'infos utilisateur ici puisqu'il sera déconnecté.
        ]);
    } else {
        // La requête UPDATE elle-même a échoué
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la mise à jour du mot de passe en base de données.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (update_password.php - UPDATE) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la mise à jour du mot de passe.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (update_password.php - UPDATE) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>