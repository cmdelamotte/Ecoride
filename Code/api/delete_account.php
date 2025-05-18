<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';

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

// 1. Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$current_user_id = $_SESSION['user_id'];

// L'action est confirmée par le fait que l'utilisateur est connecté et a initié cette requête POST
// Amélioration voulu si le temps le permet : Redemander le MdP dans la modale de confirmation de suppression de compte

try {
    $pdo = getPDOConnection();

    $sql = "DELETE FROM Users WHERE id = :user_id";
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) {
            // L'utilisateur a été supprimé. Maintenant, détruire sa session.
            session_unset();   // Vider les données de $_SESSION
            session_destroy(); // Détruire la session côté serveur
            
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
                'message' => 'Votre compte a été supprimé avec succès. Vous allez être déconnecté.'
            ]);
        } else {
            // Aucune ligne affectée : l'utilisateur n'existait déjà plus (très improbable si la session existait)
            http_response_code(404); 
            echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé pour la suppression.']);
        }
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la suppression du compte en base de données.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (delete_account.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la suppression du compte.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (delete_account.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>