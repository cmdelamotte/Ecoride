<?php

require_once 'config/database.php';


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type'); 

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode GET est acceptée.']);
    exit();
}

// 1. Récupérer et valider le ride_id depuis $_GET
$ride_id = filter_input(INPUT_GET, 'ride_id', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);

if ($ride_id === false || $ride_id === null) { 
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID du trajet manquant ou invalide.']);
    exit();
}

$response = ['success' => false, 'details' => [], 'message' => ''];

try {
    $pdo = getPDOConnection();

    // 1. Récupérer le driver_id à partir du ride_id et les préférences du chauffeur
    $sqlDriverPrefs = "SELECT 
                        u.id as driver_id, 
                        u.driver_pref_smoker, 
                        u.driver_pref_animals, 
                        u.driver_pref_custom
                        FROM Rides r
                        JOIN Users u ON r.driver_id = u.id
                        WHERE r.id = :ride_id";
    $stmtDriverPrefs = $pdo->prepare($sqlDriverPrefs);
    $stmtDriverPrefs->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtDriverPrefs->execute();
    $driverData = $stmtDriverPrefs->fetch(PDO::FETCH_ASSOC);

    if (!$driverData) {
        http_response_code(404);
        $response['message'] = "Trajet non trouvé ou informations du chauffeur inaccessibles.";
        echo json_encode($response);
        exit();
    }

    // Convertir les booléens des préférences
    $driverData['driver_pref_smoker'] = (bool)$driverData['driver_pref_smoker'];
    $driverData['driver_pref_animals'] = (bool)$driverData['driver_pref_animals'];
    
    $response['details']['driver_preferences'] = [
        'smoker' => $driverData['driver_pref_smoker'],
        'animals' => $driverData['driver_pref_animals'],
        'custom' => $driverData['driver_pref_custom']
    ];
    
    $driver_id = $driverData['driver_id']; // On a besoin de l'ID du chauffeur pour ses avis

    // 2. Récupérer les avis approuvés pour ce chauffeur
    $sqlReviews = "SELECT 
                        rev.rating, 
                        rev.comment, 
                        rev.submission_date,
                        author.username as author_username 
                    FROM Reviews rev
                    JOIN Users author ON rev.author_id = author.id
                    WHERE rev.driver_id = :driver_id AND rev.review_status = 'approved'
                   ORDER BY rev.submission_date DESC"; // Les plus récents d'abord
    $stmtReviews = $pdo->prepare($sqlReviews);
    $stmtReviews->bindParam(':driver_id', $driver_id, PDO::PARAM_INT);
    $stmtReviews->execute();
    $reviews = $stmtReviews->fetchAll(PDO::FETCH_ASSOC);

    $response['details']['reviews'] = $reviews ?: []; // Tableau vide si pas d'avis

    $response['success'] = true;
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (get_ride_details.php) : " . $e->getMessage());
    $response['message'] = 'Erreur serveur lors de la récupération des détails du trajet.';
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (get_ride_details.php) : " . $e->getMessage());
    $response['message'] = 'Une erreur inattendue est survenue.';
}

echo json_encode($response);
?>