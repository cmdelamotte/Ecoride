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
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

// Paramètres de recherche principaux
$departureCity = trim($_GET['departure_city'] ?? '');
$arrivalCity = trim($_GET['arrival_city'] ?? '');
$dateStr = trim($_GET['date'] ?? '');
$seatsNeeded = filter_input(INPUT_GET, 'seats', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 1]]);

// Paramètres de filtre
$maxPrice = filter_input(INPUT_GET, 'maxPrice', FILTER_VALIDATE_FLOAT);
$maxDuration = filter_input(INPUT_GET, 'maxDuration', FILTER_VALIDATE_FLOAT); // En heures
$animalsAllowed = isset($_GET['animalsAllowed']) ? $_GET['animalsAllowed'] : null; 
$minRating = filter_input(INPUT_GET, 'minRating', FILTER_VALIDATE_FLOAT); // Récupéré mais pas encore utilisé en SQL pour MVP
$ecoOnly = isset($_GET['ecoOnly']) && $_GET['ecoOnly'] === 'true';

// Paramètres de pagination
$page = filter_input(INPUT_GET, 'page', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 1]]);
$limit = filter_input(INPUT_GET, 'limit', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 5]]);
$offset = ($page - 1) * $limit;

$errors = [];
if (empty($departureCity)) { $errors['departure_city'] = "La ville de départ est requise."; }
if (empty($arrivalCity)) { $errors['arrival_city'] = "La ville d'arrivée est requise."; }
if (empty($dateStr)) {
    $errors['date'] = "La date est requise.";
} else {
    try {
        $searchDateObj = new DateTime($dateStr);
        $today = new DateTime('today');
        if ($searchDateObj < $today) {
            $errors['date'] = "La date de recherche ne peut pas être dans le passé.";
        }
    } catch (Exception $e) {
        $errors['date'] = "Format de date invalide (AAAA-MM-JJ attendu).";
    }
}
if ($seatsNeeded === false || $seatsNeeded === null || $seatsNeeded < 1) { // Vérification plus stricte
    $errors['seats'] = "Nombre de places invalide (minimum 1)."; 
}


if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Paramètres de recherche invalides.', 'errors' => $errors]);
    exit();
}

$response = ['success' => false, 'rides' => [], 'totalRides' => 0, 'page' => (int)$page, 'limit' => (int)$limit, 'totalPages' => 0, 'message' => ''];

try {
    $pdo = getPDOConnection();
    $queryParams = [];
    $whereConditions = [];

    // Conditions de base toujours appliquées
    $whereConditions[] = "r.ride_status = 'planned'";
    $whereConditions[] = "r.departure_time >= :search_date_start";
    $queryParams[':search_date_start'] = $dateStr . ' 00:00:00';
    $whereConditions[] = "r.departure_time < DATE_ADD(CAST(:search_date_exact AS DATE), INTERVAL 1 DAY)";
    $queryParams[':search_date_exact'] = $dateStr;

    if (!empty($departureCity)) {
        $whereConditions[] = "LOWER(r.departure_city) LIKE LOWER(:departure_city)";
        $queryParams[':departure_city'] = '%' . $departureCity . '%';
    }
    if (!empty($arrivalCity)) {
        $whereConditions[] = "LOWER(r.arrival_city) LIKE LOWER(:arrival_city)";
        $queryParams[':arrival_city'] = '%' . $arrivalCity . '%';
    }
    
    // Application des filtres supplémentaires
    if ($maxPrice !== null && $maxPrice >= 0) {
        $whereConditions[] = "r.price_per_seat <= :maxPrice";
        $queryParams[':maxPrice'] = $maxPrice;
    }
    if ($ecoOnly) { // v est l'alias pour Vehicles
        $whereConditions[] = "v.is_electric = TRUE";
    }
    if ($maxDuration !== null && $maxDuration > 0) {
        $whereConditions[] = "TIMESTAMPDIFF(MINUTE, r.departure_time, r.estimated_arrival_time) <= :maxDurationMinutes";
        $queryParams[':maxDurationMinutes'] = $maxDuration * 60;
    }
    if ($animalsAllowed !== null && $animalsAllowed !== "") { // u est l'alias pour Users (le chauffeur)
        $whereConditions[] = "u.driver_pref_animals = :animalsAllowed";
        $queryParams[':animalsAllowed'] = ($animalsAllowed === 'true' ? 1 : 0);
    }
    // Le filtre minRating n'est pas ajouté aux conditions SQL pour l'instant (MVP)

    $baseWhereSql = "WHERE " . implode(" AND ", $whereConditions);

    // 1. Compter le nombre total de trajets avec tous les filtres
    $sqlCountBase = "SELECT COUNT(*) 
                    FROM (
                        SELECT r.id, r.seats_offered -- r.seats_offered est nécessaire pour le HAVING
                        FROM Rides r
                        JOIN Users u ON r.driver_id = u.id
                        JOIN Vehicles v ON r.vehicle_id = v.id 
                        LEFT JOIN Bookings b ON r.id = b.ride_id AND b.booking_status = 'confirmed'
                        $baseWhereSql -- Inclut tous les filtres
                        GROUP BY r.id, r.seats_offered 
                        HAVING (r.seats_offered - COALESCE(SUM(b.seats_booked), 0)) >= :seats_needed_count
                    ) AS SubQueryAlias";
    
    $stmtCount = $pdo->prepare($sqlCountBase);
    $queryParamsForCount = $queryParams; // $queryParams contient déjà les placeholders de $baseWhereSql
    $queryParamsForCount[':seats_needed_count'] = $seatsNeeded;
    $stmtCount->execute($queryParamsForCount);
    $totalRides = (int) $stmtCount->fetchColumn();
    $response['totalRides'] = $totalRides;
    $response['totalPages'] = ($limit > 0 && $totalRides > 0) ? ceil($totalRides / $limit) : 0; // Assurer 0 si pas de trajets


    // 2. Récupérer les trajets pour la page actuelle
    if ($totalRides > 0) { // Inutile de faire la seconde requête si le compte est à 0
        $sqlRides = "SELECT 
                        r.id as ride_id, r.departure_city, r.arrival_city, r.departure_address, r.arrival_address, 
                        r.departure_time, r.estimated_arrival_time, r.price_per_seat,
                        v.is_electric as is_eco_ride, 
                        u.username as driver_username, u.profile_picture_path as driver_photo,
                        u.driver_pref_smoker, u.driver_pref_animals, u.driver_pref_custom,
                        v.model_name as vehicle_model,
                        br.name as vehicle_brand,
                        v.energy_type as vehicle_energy,
                        v.registration_date as vehicle_registration_date,
                        (r.seats_offered - COALESCE(SUM(b.seats_booked), 0)) as seats_available
                    FROM Rides r
                    JOIN Users u ON r.driver_id = u.id
                    JOIN Vehicles v ON r.vehicle_id = v.id
                    JOIN Brands br ON v.brand_id = br.id
                    LEFT JOIN Bookings b ON r.id = b.ride_id AND b.booking_status = 'confirmed'
                    $baseWhereSql -- Inclut tous les filtres
                    GROUP BY r.id, r.departure_city, r.arrival_city, r.departure_address, r.arrival_address, 
                            r.departure_time, r.estimated_arrival_time, r.price_per_seat, r.seats_offered,
                            v.is_electric,
                            u.username, u.profile_picture_path, u.driver_pref_smoker, u.driver_pref_animals, u.driver_pref_custom,
                            v.model_name, v.energy_type, v.registration_date,
                            br.name
                    HAVING seats_available >= :seats_needed_main
                    ORDER BY r.departure_time ASC 
                    LIMIT :limit OFFSET :offset";
        
        $stmtRides = $pdo->prepare($sqlRides);
        $queryParamsForRides = $queryParams; // $queryParams contient déjà les placeholders de $baseWhereSql
        $queryParamsForRides[':seats_needed_main'] = $seatsNeeded;
        $queryParamsForRides[':limit'] = $limit;
        $queryParamsForRides[':offset'] = $offset;

        $stmtRides->execute($queryParamsForRides);
        $rides = $stmtRides->fetchAll(PDO::FETCH_ASSOC);

        if ($rides) {
            foreach ($rides as $key => $ride) {
                $rides[$key]['is_eco_ride'] = (bool)$ride['is_eco_ride'];
                $rides[$key]['seats_available'] = (int)($ride['seats_available'] ?? 0);
                if (isset($rides[$key]['driver_pref_animals'])) {
                    $rides[$key]['driver_pref_animals'] = (bool)$rides[$key]['driver_pref_animals'];
                }
                if (isset($rides[$key]['driver_pref_smoker'])) {
                    $rides[$key]['driver_pref_smoker'] = (bool)$rides[$key]['driver_pref_smoker'];
                }
            }
            $response['success'] = true;
            $response['rides'] = $rides;
        } else {
             // Cela peut arriver si la page demandée est au-delà du nombre total de pages valides
            $response['success'] = true; 
            $response['rides'] = [];
            $response['message'] = "Aucun trajet trouvé pour cette page avec ces critères.";
        }
    } else { // Si totalRides est 0
        $response['success'] = true;
        $response['rides'] = [];
        $response['message'] = "Aucun trajet trouvé pour ces critères.";
    }
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (search_rides.php) : " . $e->getMessage() . " QueryParams: " . var_export($queryParams, true) . " QueryParamsForCount: " . var_export($queryParamsForCount ?? null, true) . " QueryParamsForRides: " . var_export($queryParamsForRides ?? null, true));
    $response['message'] = 'Erreur serveur lors de la recherche de trajets.';
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (search_rides.php) : " . $e->getMessage());
    $response['message'] = 'Une erreur inattendue est survenue.';
}

echo json_encode($response);
?>