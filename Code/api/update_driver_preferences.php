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

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Récupération et validation des préférences
// Le JavaScript enverra true/false pour les booléens, et une chaîne pour le texte
$prefSmoker = filter_var($input['pref_smoker'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$prefAnimals = filter_var($input['pref_animals'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$prefCustom = isset($input['pref_custom']) ? trim($input['pref_custom']) : null; // Peut être une chaîne vide ou null

// filter_var avec FILTER_NULL_ON_FAILURE retournera null si la valeur n'est pas un booléen valide.
// On s'assure que ce ne sont pas null pour les booléens pour éviter des erreurs en BDD si la colonne ne l'accepte pas (même si nos booléens ont un DEFAULT)
if ($prefSmoker === null || $prefAnimals === null) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Valeurs invalides pour les préférences fumeur/animaux.']);
    exit();
}


$userId = $_SESSION['user_id'];

try {
    $pdo = getPDOConnection();

    $sql = "UPDATE Users 
            SET driver_pref_smoker = :pref_smoker, 
                driver_pref_animals = :pref_animals, 
                driver_pref_custom = :pref_custom 
            WHERE id = :user_id";
    
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':pref_smoker', $prefSmoker, PDO::PARAM_BOOL);
    $stmt->bindParam(':pref_animals', $prefAnimals, PDO::PARAM_BOOL);
    // Pour pref_custom, si c'est une chaîne vide, on peut stocke NULL
    $prefCustomToStore = ($prefCustom === '') ? null : $prefCustom;
    $stmt->bindParam(':pref_custom', $prefCustomToStore, PDO::PARAM_STR);
    
    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Mettre à jour la session PHP
        $_SESSION['driver_pref_smoker'] = $prefSmoker;   // Stocker le booléen
        $_SESSION['driver_pref_animals'] = $prefAnimals; // Stocker le booléen
        $_SESSION['driver_pref_custom'] = $prefCustomToStore; 

        http_response_code(200); // OK
        echo json_encode([
            'success' => true,
            'message' => 'Préférences du chauffeur mises à jour avec succès.',
            'updated_preferences' => [
                'driver_pref_smoker' => $prefSmoker,
                'driver_pref_animals' => $prefAnimals,
                'driver_pref_custom' => $prefCustomToStore
            ]
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la mise à jour des préférences en base de données.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (update_driver_preferences.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la mise à jour des préférences.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (update_driver_preferences.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}
?>