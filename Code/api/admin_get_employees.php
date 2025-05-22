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

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}


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

$response = ['success' => false, 'employees' => []];

try {
    $pdo = getPDOConnection();
    // Récupérer les utilisateurs qui ont le rôle 'ROLE_EMPLOYEE' (ID de rôle 2)
    // On sélectionne les champs nécessaires pour l'affichage dans le dashboard admin.
    $sql = "SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.account_status
            FROM Users u
            JOIN UserRoles ur ON u.id = ur.user_id
            WHERE ur.role_id = 2";

    $stmt = $pdo->query($sql);
    $employees = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($employees) {
        $response['success'] = true;
        // Renommer les clés pour correspondre à ce que le JS attend (nom, prenom, statut)
        $response['employees'] = array_map(function($emp) {
            return [
                'id' => 'EMP' . str_pad($emp['id'], 3, '0', STR_PAD_LEFT), // Formatage de l'ID
                'nom' => $emp['last_name'],
                'prenom' => $emp['first_name'],
                'email' => $emp['email'],
                'statut' => ucfirst($emp['account_status']) // Met la première lettre en majuscule (Active, Suspended)
            ];
        }, $employees);
    } else {
        $response['success'] = true; // Succès, mais pas d'employés
        $response['message'] = "Aucun employé trouvé.";
    }
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    $response['message'] = "Erreur PDO: " . $e->getMessage();
    error_log("Erreur admin_get_employees.php (PDO): " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur générale: " . $e->getMessage();
    error_log("Erreur admin_get_employees.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>