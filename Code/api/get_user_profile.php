<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // Pour développement
header('Access-Control-Allow-Methods: GET, OPTIONS'); // Ce sera une requête GET
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
// header('Access-Control-Allow-Credentials: true'); 

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 1. Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); // Unauthorized
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$userId = $_SESSION['user_id'];
$response = ['success' => false, 'user' => null, 'vehicles' => []]; // Initialisation de la réponse

try {
    $pdo = getPDOConnection();

    // 2. Récupérer les informations de l'utilisateur depuis la table Users
    $sqlUser = "SELECT id, first_name, last_name, username, email, phone_number, 
                    birth_date, profile_picture_path, address, credits, 
                    account_status, driver_pref_smoker, driver_pref_animals, 
                    driver_pref_custom, functional_role, created_at, updated_at
                FROM Users
                WHERE id = :user_id";
    $stmtUser = $pdo->prepare($sqlUser);
    $stmtUser->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmtUser->execute();
    $user_data = $stmtUser->fetch(PDO::FETCH_ASSOC);

    if (!$user_data) {
        // Ne devrait pas arriver si user_id en session est valide, mais par sécurité
        http_response_code(404); 
        echo json_encode(['success' => false, 'message' => 'Utilisateur non trouvé.']);
        exit();
    }
    
    // Convertir les valeurs booléennes des préférences en vrais booléens pour JSON
    // car MySQL les stocke comme 0 ou 1 (TINYINT)
    if (isset($user_data['driver_pref_smoker'])) {
        $user_data['driver_pref_smoker'] = (bool)$user_data['driver_pref_smoker'];
    }
    if (isset($user_data['driver_pref_animals'])) {
        $user_data['driver_pref_animals'] = (bool)$user_data['driver_pref_animals'];
    }

    $response['user'] = $user_data;

    // 3. Récupérer les véhicules de l'utilisateur (s'il peut être chauffeur)
        $sqlVehicles = "SELECT v.id, v.brand_id, b.name as brand_name, v.model_name, v.color, 
                            v.license_plate, v.registration_date, v.passenger_capacity, 
                            v.is_electric, v.energy_type, v.created_at, v.updated_at
                        FROM Vehicles v
                        JOIN Brands b ON v.brand_id = b.id
                        WHERE v.user_id = :user_id
                        ORDER BY v.created_at DESC"; // Ou par un autre critère
        $stmtVehicles = $pdo->prepare($sqlVehicles);
        $stmtVehicles->bindParam(':user_id', $userId, PDO::PARAM_INT);
        $stmtVehicles->execute();
        $vehicles_data = $stmtVehicles->fetchAll(PDO::FETCH_ASSOC);
        
        // Convertir is_electric en booléen pour chaque véhicule
        foreach ($vehicles_data as $key => $vehicle) {
            if (isset($vehicle['is_electric'])) {
                $vehicles_data[$key]['is_electric'] = (bool)$vehicle['is_electric'];
            }
        }
        $response['vehicles'] = $vehicles_data;
    // }

    $response['success'] = true;
    http_response_code(200);
    echo json_encode($response);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (get_user_profile.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la récupération du profil.']);
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (get_user_profile.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}
?>