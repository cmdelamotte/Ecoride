<?php

require_once __DIR__ . '/config/database.php';
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

// Vérification du rôle Admin
$isAdmin = false;
if (isset($_SESSION['user_id']) && isset($_SESSION['roles_system']) && is_array($_SESSION['roles_system'])) {
    if (in_array('ROLE_ADMIN', $_SESSION['roles_system'])) {
        $isAdmin = true;
    }
}

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Accès non autorisé.']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée.']);
    exit();
}

// Récupérer les données JSON envoyées
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$userIdToUpdate = filter_var($input['user_id'] ?? null, FILTER_VALIDATE_INT);
$newStatus = trim($input['new_status'] ?? '');

$response = ['success' => false, 'message' => 'Données invalides.'];

if (!$userIdToUpdate || !in_array($newStatus, ['active', 'suspended'])) {
    http_response_code(400);
    echo json_encode($response);
    exit();
}

try {
    $pdo = getPDOConnection();
    
    // On ne permet pas à l'admin de suspendre son propre compte via cette interface
    if ($userIdToUpdate === (int)$_SESSION['user_id']) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'L\'administrateur ne peut pas modifier son propre statut via cette interface.']);
        exit();
    }

    $sql = "UPDATE Users SET account_status = :new_status WHERE id = :user_id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':new_status', $newStatus, PDO::PARAM_STR);
    $stmt->bindParam(':user_id', $userIdToUpdate, PDO::PARAM_INT);

    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) {
            $response['success'] = true;
            $response['message'] = "Statut de l'utilisateur ID " . $userIdToUpdate . " mis à jour à '" . $newStatus . "'.";
            http_response_code(200);
        } else {
            // Aucune ligne affectée, l'utilisateur n'existe peut-être pas ou le statut était déjà le même.
            $response['message'] = "Aucune modification effectuée. L'utilisateur n'existe peut-être pas ou le statut est déjà à jour.";
            // On peut renvoyer 200 OK car la requête a été traitée sans erreur, même si rien n'a changé.
            // Ou 404 si on veut être plus strict sur l'existence de l'utilisateur. Pour l'instant, 200.
            http_response_code(200); 
        }
    } else {
        http_response_code(500);
        $response['message'] = "Échec de la mise à jour du statut en base de données.";
    }

} catch (PDOException $e) {
    http_response_code(500);
    $response['message'] = "Erreur PDO: " . $e->getMessage();
    error_log("Erreur admin_update_user_status.php (PDO): " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur générale: " . $e->getMessage();
    error_log("Erreur admin_update_user_status.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>