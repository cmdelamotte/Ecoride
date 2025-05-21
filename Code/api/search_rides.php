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

// Paramètres
$departureCity = trim($_GET['departure_city'] ?? '');
$arrivalCity = trim($_GET['arrival_city'] ?? '');
$dateStr = trim($_GET['date'] ?? '');
$seatsNeeded = filter_input(INPUT_GET, 'seats', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 1]]);
$maxPrice = filter_input(INPUT_GET, 'maxPrice', FILTER_VALIDATE_FLOAT);
$maxDuration = filter_input(INPUT_GET, 'maxDuration', FILTER_VALIDATE_FLOAT);
$animalsAllowed = isset($_GET['animalsAllowed']) ? $_GET['animalsAllowed'] : null;
$ecoOnly = isset($_GET['ecoOnly']) && $_GET['ecoOnly'] === 'true';
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
        $today = new DateTime('today'); // Pour la comparaison avec la date de recherche
        // La validation $searchDateObj < $today est bonne pour la date initiale, 
        // mais pour la recherche de date proche, on cherchera >= $today.
    } catch (Exception $e) {
        $errors['date'] = "Format de date invalide (AAAA-MM-JJ attendu).";
    }
}
if ($seatsNeeded === false || $seatsNeeded === null || $seatsNeeded < 1) {
    $errors['seats'] = "Nombre de places invalide (minimum 1)."; 
}

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Paramètres de recherche invalides.', 'errors' => $errors]);
    exit();
}

$response = [
    'success' => false, 
    'rides' => [], 
    'totalRides' => 0, 
    'page' => (int)$page, 
    'limit' => (int)$limit, 
    'totalPages' => 0, 
    'message' => '',
    'nextAvailableDate' => null
];

try {
    $pdo = getPDOConnection();
    $queryParams = [];
    $whereConditions = ["r.ride_status = 'planned'"]; 

    // Conditions de base pour la date initiale
    $whereConditions[] = "DATE(r.departure_time) = :search_date_exact"; // Chercher pour le jour exact
    $queryParams[':search_date_exact'] = $dateStr;
    
    // Filtres
    if (!empty($departureCity)) {
        $whereConditions[] = "LOWER(r.departure_city) LIKE LOWER(:departure_city)";
        $queryParams[':departure_city'] = '%' . $departureCity . '%';
    }
    if (!empty($arrivalCity)) {
        $whereConditions[] = "LOWER(r.arrival_city) LIKE LOWER(:arrival_city)";
        $queryParams[':arrival_city'] = '%' . $arrivalCity . '%';
    }
    if ($maxPrice !== null && $maxPrice >= 0) {
        $whereConditions[] = "r.price_per_seat <= :maxPrice";
        $queryParams[':maxPrice'] = $maxPrice;
    }
    if ($ecoOnly) {
        $whereConditions[] = "v.is_electric = TRUE";
    }
    if ($maxDuration !== null && $maxDuration > 0) {
        $whereConditions[] = "TIMESTAMPDIFF(MINUTE, r.departure_time, r.estimated_arrival_time) <= :maxDurationMinutes";
        $queryParams[':maxDurationMinutes'] = $maxDuration * 60;
    }
    if ($animalsAllowed !== null && $animalsAllowed !== "") {
        $whereConditions[] = "u.driver_pref_animals = :animalsAllowed";
        $queryParams[':animalsAllowed'] = ($animalsAllowed === 'true' ? 1 : 0);
    }
    
    $baseWhereSql = "WHERE " . implode(" AND ", $whereConditions);

    // 1. Compter le total des trajets pour la date demandée
    $sqlCountBase = "SELECT COUNT(*) 
                    FROM (
                        SELECT r.id, r.seats_offered
                        FROM Rides r
                        JOIN Users u ON r.driver_id = u.id
                        JOIN Vehicles v ON r.vehicle_id = v.id 
                        LEFT JOIN Bookings b ON r.id = b.ride_id AND b.booking_status = 'confirmed'
                        $baseWhereSql
                        GROUP BY r.id, r.seats_offered 
                        HAVING (r.seats_offered - COALESCE(SUM(b.seats_booked), 0)) >= :seats_needed_count
                    ) AS SubQueryAlias";
    
    $stmtCount = $pdo->prepare($sqlCountBase);
    $queryParamsForCount = $queryParams;
    $queryParamsForCount[':seats_needed_count'] = $seatsNeeded;
    $stmtCount->execute($queryParamsForCount);
    $totalRides = (int) $stmtCount->fetchColumn();
    $response['totalRides'] = $totalRides;
    $response['totalPages'] = ($limit > 0 && $totalRides > 0) ? ceil($totalRides / $limit) : 0;

    if ($totalRides > 0) {
        // Récupérer les trajets pour la date demandée (avec pagination)
        $sqlRides = "SELECT 
                        r.id as ride_id, r.departure_city, r.arrival_city, r.departure_address, r.arrival_address, 
                        r.departure_time, r.estimated_arrival_time, r.price_per_seat,
                        v.is_electric as is_eco_ride, 
                        u.username as driver_username, u.profile_picture_path as driver_photo,
                        u.driver_pref_smoker, u.driver_pref_animals, u.driver_pref_custom,
                        v.model_name as vehicle_model, br.name as vehicle_brand,
                        v.energy_type as vehicle_energy, v.registration_date as vehicle_registration_date,
                        (r.seats_offered - COALESCE(SUM(b.seats_booked), 0)) as seats_available
                    FROM Rides r
                    JOIN Users u ON r.driver_id = u.id
                    JOIN Vehicles v ON r.vehicle_id = v.id
                    JOIN Brands br ON v.brand_id = br.id
                    LEFT JOIN Bookings b ON r.id = b.ride_id AND b.booking_status = 'confirmed'
                    $baseWhereSql 
                    GROUP BY r.id, r.departure_city, r.arrival_city, r.departure_address, r.arrival_address, 
                            r.departure_time, r.estimated_arrival_time, r.price_per_seat, r.seats_offered,
                            v.is_electric, u.username, u.profile_picture_path, u.driver_pref_smoker, u.driver_pref_animals, u.driver_pref_custom,
                            v.model_name, v.energy_type, v.registration_date, br.name
                    HAVING seats_available >= :seats_needed_main
                    ORDER BY r.departure_time ASC 
                    LIMIT :limit OFFSET :offset";
        
        $stmtRides = $pdo->prepare($sqlRides);
        $queryParamsForRides = $queryParams;
        $queryParamsForRides[':seats_needed_main'] = $seatsNeeded;
        $queryParamsForRides[':limit'] = $limit;
        $queryParamsForRides[':offset'] = $offset;
        $stmtRides->execute($queryParamsForRides);
        $rides = $stmtRides->fetchAll(PDO::FETCH_ASSOC);

        if ($rides) { // Ceci est redondant si totalRides > 0, mais je garde pour la structure
            foreach ($rides as $key => $ride) {
                $rides[$key]['is_eco_ride'] = (bool)$ride['is_eco_ride'];
                $rides[$key]['seats_available'] = (int)($ride['seats_available'] ?? 0);
                if (isset($rides[$key]['driver_pref_animals'])) $rides[$key]['driver_pref_animals'] = (bool)$rides[$key]['driver_pref_animals'];
                if (isset($rides[$key]['driver_pref_smoker'])) $rides[$key]['driver_pref_smoker'] = (bool)$rides[$key]['driver_pref_smoker'];
            }
            $response['success'] = true;
            $response['rides'] = $rides;
        }
    } else {
        // Aucun trajet trouvé pour la date demandée, on cherche une date proche
        $response['message'] = "Aucun trajet trouvé pour le " . (new DateTime($dateStr))->format('d/m/Y') . ".";

        // Reconstruire les conditions WHERE sans le filtre de date exact,
        // mais avec une condition pour chercher à partir de demain
        $queryParamsNextDate = [];
        $whereConditionsNextDate = ["r.ride_status = 'planned'"];

        // La date de départ pour la recherche de "date proche" doit être >= aujourd'hui
        // et > que la date initialement cherchée si cette dernière était aujourd'hui ou dans le futur.
        $startDateForNextSearch = new DateTime('today');
        $initialSearchDateObj = new DateTime($dateStr);
        if ($initialSearchDateObj >= $startDateForNextSearch) {
            $startDateForNextSearch = (clone $initialSearchDateObj)->modify('+1 day');
        }
        
        $whereConditionsNextDate[] = "r.departure_time >= :start_date_next_search";
        $queryParamsNextDate[':start_date_next_search'] = $startDateForNextSearch->format('Y-m-d H:i:s');


        // Réappliquer les filtres de ville, prix, eco, animaux, etc.
        if (!empty($departureCity)) {
            $whereConditionsNextDate[] = "LOWER(r.departure_city) LIKE LOWER(:departure_city)";
            $queryParamsNextDate[':departure_city'] = '%' . $departureCity . '%';
        }
        if (!empty($arrivalCity)) {
            $whereConditionsNextDate[] = "LOWER(r.arrival_city) LIKE LOWER(:arrival_city)";
            $queryParamsNextDate[':arrival_city'] = '%' . $arrivalCity . '%';
        }
        if ($maxPrice !== null && $maxPrice >= 0) {
            $whereConditionsNextDate[] = "r.price_per_seat <= :maxPrice";
            $queryParamsNextDate[':maxPrice'] = $maxPrice;
        }
        if ($ecoOnly) {
            $whereConditionsNextDate[] = "v.is_electric = TRUE";
        }
        if ($maxDuration !== null && $maxDuration > 0) {
            $whereConditionsNextDate[] = "TIMESTAMPDIFF(MINUTE, r.departure_time, r.estimated_arrival_time) <= :maxDurationMinutes";
            $queryParamsNextDate[':maxDurationMinutes'] = $maxDuration * 60;
        }
        if ($animalsAllowed !== null && $animalsAllowed !== "") {
            $whereConditionsNextDate[] = "u.driver_pref_animals = :animalsAllowed";
            $queryParamsNextDate[':animalsAllowed'] = ($animalsAllowed === 'true' ? 1 : 0);
        }

        $nextDateWhereSql = "WHERE " . implode(" AND ", $whereConditionsNextDate);

        $sqlNextDate = "SELECT DATE(r.departure_time) as next_ride_date
                        FROM Rides r
                        JOIN Users u ON r.driver_id = u.id
                        JOIN Vehicles v ON r.vehicle_id = v.id
                        LEFT JOIN Bookings b ON r.id = b.ride_id AND b.booking_status = 'confirmed'
                        $nextDateWhereSql
                        GROUP BY r.id, r.seats_offered -- Pour le HAVING
                        HAVING (r.seats_offered - COALESCE(SUM(b.seats_booked), 0)) >= :seats_needed_next_date
                        ORDER BY r.departure_time ASC
                        LIMIT 1";
        
        $stmtNextDate = $pdo->prepare($sqlNextDate);
        $queryParamsNextDate[':seats_needed_next_date'] = $seatsNeeded;
        $stmtNextDate->execute($queryParamsNextDate);
        $nextAvailable = $stmtNextDate->fetch(PDO::FETCH_ASSOC);

        if ($nextAvailable && isset($nextAvailable['next_ride_date'])) {
            $response['nextAvailableDate'] = $nextAvailable['next_ride_date'];
            $response['message'] .= " Le prochain trajet disponible pour cet itinéraire est le " . (new DateTime($nextAvailable['next_ride_date']))->format('d/m/Y') . ".";
        }
        $response['success'] = true; // La recherche s'est bien passée, même si pas de résultat pour la date initiale
    }
    http_response_code(200);

} catch (PDOException $e) { /* ... */ } 
  catch (Exception $e) { /* ... */ }

echo json_encode($response);
?>