<?php

require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/settings.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

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

$response = ['success' => false, 'users' => []];

try {
    $pdo = getPDOConnection();
    // Récupérer les utilisateurs qui ont le rôle 'ROLE_USER' (ID de rôle 1)
    $sql = "SELECT u.id, u.username, u.email, u.credits, u.account_status
            FROM Users u
            JOIN UserRoles ur ON u.id = ur.user_id
            WHERE ur.role_id = 1"; // ID 1 pour ROLE_USER // Exclure employés et admins

    $stmt = $pdo->query($sql);
    $users = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($users) {
        $response['success'] = true;
        $response['users'] = array_map(function($user) {
            return [
                'id' => 'USR' . str_pad($user['id'], 3, '0', STR_PAD_LEFT),
                'pseudo' => $user['username'],
                'email' => $user['email'],
                'credits' => (float) $user['credits'],
                'statut' => ucfirst($user['account_status'])
            ];
        }, $users);
    } else {
        $response['success'] = true;
        $response['message'] = "Aucun utilisateur client trouvé.";
    }
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    $response['message'] = "Erreur PDO: " . $e->getMessage();
    error_log("Erreur admin_get_users.php (PDO): " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur générale: " . $e->getMessage();
    error_log("Erreur admin_get_users.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>