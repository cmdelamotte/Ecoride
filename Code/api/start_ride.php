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
    echo json_encode(['success' => false, 'message' => 'Authentification requise.']);
    exit();
}

$current_user_id = (int)$_SESSION['user_id'];

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$ride_id = filter_var($input['ride_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if (!$ride_id) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID du trajet manquant ou invalide.']);
    exit();
}

$pdo = getPDOConnection();
$response = ['success' => false, 'message' => 'Une erreur est survenue.'];

try {
    // Vérifier si l'utilisateur est bien le chauffeur et si le trajet est 'planned'
    $stmtCheck = $pdo->prepare("SELECT driver_id, ride_status FROM Rides WHERE id = :ride_id");
    $stmtCheck->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtCheck->execute();
    $ride = $stmtCheck->fetch(PDO::FETCH_ASSOC);

    if (!$ride) {
        $response['message'] = "Trajet non trouvé.";
        http_response_code(404);
        throw new Exception($response['message']);
    }

    if ((int)$ride['driver_id'] !== $current_user_id) {
        $response['message'] = "Action non autorisée. Vous n'êtes pas le chauffeur de ce trajet.";
        http_response_code(403); 
        throw new Exception($response['message']);
    }

    if ($ride['ride_status'] !== 'planned') {
        $response['message'] = "Ce trajet ne peut pas être démarré (statut actuel: " . $ride['ride_status'] . "). Il doit être 'planned'.";
        http_response_code(400);
        throw new Exception($response['message']);
    }
    
    // Mettre à jour le statut du trajet
    $new_status = 'ongoing';
    $stmtUpdate = $pdo->prepare("UPDATE Rides SET ride_status = :new_status WHERE id = :ride_id AND driver_id = :driver_id");
    $stmtUpdate->bindParam(':new_status', $new_status);
    $stmtUpdate->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtUpdate->bindParam(':driver_id', $current_user_id, PDO::PARAM_INT);

    if ($stmtUpdate->execute()) {
        if ($stmtUpdate->rowCount() > 0) {
            $response['success'] = true;
            $response['message'] = "Trajet démarré avec succès !";
            http_response_code(200);
        } else {
            $response['message'] = "Le trajet n'a pas pu être démarré ou était déjà en cours/terminé.";
            http_response_code(400); 
        }
    } else {
        $response['message'] = "Erreur lors de la mise à jour du statut du trajet.";
        http_response_code(500);
    }

} catch (Exception $e) { 
    if (http_response_code() < 400) { 
        http_response_code(500);
    }
    error_log("Erreur (start_ride.php): RideID $ride_id, UserID $current_user_id - " . $e->getMessage());
    if (empty($response['message']) || http_response_code() == 500) {
        $response['message'] = 'Erreur serveur lors du démarrage du trajet.';
    }
}

echo json_encode($response);
?>