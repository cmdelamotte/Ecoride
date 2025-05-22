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

$vehicle_id_to_delete = filter_var($input['vehicle_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if (empty($vehicle_id_to_delete)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID du véhicule manquant ou invalide pour la suppression.']);
    exit();
}

try {
    $pdo = getPDOConnection();

    // 1. Vérifier si le véhicule appartient bien à l'utilisateur connecté AVANT de supprimer
    $sqlCheckOwner = "SELECT id FROM Vehicles WHERE id = :vehicle_id AND user_id = :user_id";
    $stmtCheckOwner = $pdo->prepare($sqlCheckOwner);
    $stmtCheckOwner->bindParam(':vehicle_id', $vehicle_id_to_delete, PDO::PARAM_INT);
    $stmtCheckOwner->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtCheckOwner->execute();

    if ($stmtCheckOwner->fetch() === false) {
        // Le véhicule n'existe pas OU n'appartient pas à cet utilisateur.
        // Dans les deux cas, l'utilisateur n'est pas autorisé à le supprimer.
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Véhicule non trouvé ou action non autorisée.']);
        exit();
    }

    // 2. Si la vérification est OK, procéder à la suppression
    $sqlDelete = "DELETE FROM Vehicles WHERE id = :vehicle_id AND user_id = :user_id";
    // On inclut user_id dans la clause WHERE du DELETE comme double sécurité,
    // même si on vient de vérifier la propriété.
    $stmtDelete = $pdo->prepare($sqlDelete);
    $stmtDelete->bindParam(':vehicle_id', $vehicle_id_to_delete, PDO::PARAM_INT);
    $stmtDelete->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);

    if ($stmtDelete->execute()) {
        if ($stmtDelete->rowCount() > 0) {
            // La suppression a affecté au moins une ligne (donc le véhicule a été supprimé)
            http_response_code(200); // OK
            echo json_encode([
                'success' => true,
                'message' => 'Véhicule supprimé avec succès.',
                'deleted_vehicle_id' => $vehicle_id_to_delete 
            ]);
        } else {
            http_response_code(404); // Not Found (ou 500 si on considère ça comme une erreur serveur)
            echo json_encode(['success' => false, 'message' => 'Véhicule non trouvé au moment de la suppression ou déjà supprimé.']);
        }
    } else {
        // La requête DELETE elle-même a échoué pour une raison non PDOException
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la suppression du véhicule en base de données.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (delete_vehicle.php) : " . $e->getMessage());
    // Attention : Si l'erreur est due à une contrainte de clé étrangère (ex: ce véhicule est utilisé dans un trajet 'planned'),
    // la suppression sera bloquée par la BDD à cause du ON DELETE RESTRICT sur fk_rides_vehicle.
    // Il faudrait informer l'utilisateur plus spécifiquement dans ce cas.
    // Pour l'instant, un message générique.
    if (isset($e->errorInfo[1]) && $e->errorInfo[1] == 1451) { // Code d'erreur pour violation de contrainte FK
        echo json_encode(['success' => false, 'message' => 'Impossible de supprimer ce véhicule car il est associé à des trajets planifiés. Veuillez d\'abord annuler ces trajets.']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la suppression du véhicule.']);
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (delete_vehicle.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>