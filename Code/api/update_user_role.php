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
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée.']);
    exit();
}


if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}


$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$newFunctionalRole = trim($input['role'] ?? ''); 


$allowedFunctionalRoles = ['passenger', 'driver', 'passenger_driver'];
if (empty($newFunctionalRole) || !in_array($newFunctionalRole, $allowedFunctionalRoles)) {
    http_response_code(400); 
    echo json_encode([
        'success' => false, 
        'message' => 'Rôle fonctionnel invalide ou manquant.',
        'errors' => ['role' => 'Le rôle doit être passenger, driver, ou passenger_driver.']
    ]);
    exit();
}

$userId = $_SESSION['user_id'];

try {
    $pdo = getPDOConnection();

    $sql = "UPDATE Users SET functional_role = :functional_role WHERE id = :user_id";
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':functional_role', $newFunctionalRole);
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // La mise à jour a réussi en BDD
        // Mettre à jour également la session PHP pour une cohérence immédiate
        $_SESSION['functional_role'] = $newFunctionalRole;

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Rôle fonctionnel mis à jour avec succès.',
            'new_functional_role' => $newFunctionalRole // Renvoyer le nouveau rôle
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la mise à jour du rôle en base de données.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (update_user_role.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la mise à jour du rôle.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (update_user_role.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}


?>