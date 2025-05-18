<?php

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: GET, OPTIONS'); // Cette API utilisera GET
header('Access-Control-Allow-Headers: Content-Type'); // Pas besoin d'Authorization ici, la recherche est publique


if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// S'assurer que la requête est de type GET
if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode GET est acceptée.']);
    exit();
}

// 1. Récupérer les paramètres de recherche depuis $_GET
// Utiliser filter_input pour une récupération plus sûre.

$departureCity = trim($_GET['departure_city'] ?? '');
$arrivalCity = trim($_GET['arrival_city'] ?? '');
$dateStr = trim($_GET['date'] ?? '');
$seatsNeeded = filter_input(INPUT_GET, 'seats', FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'default' => 1]]);


$errors = [];
if (empty($departureCity)) {
    $errors['departure_city'] = "La ville de départ est requise pour la recherche.";
}
if (empty($arrivalCity)) {
    $errors['arrival_city'] = "La ville d'arrivée est requise pour la recherche.";
}
if (empty($dateStr)) {
    $errors['date'] = "La date est requise pour la recherche.";
} else {
    // Valider le format de la date AAAA-MM-JJ et qu'elle n'est pas trop dans le passé (ou est aujourd'hui ou futur)
    try {
        $searchDateObj = new DateTime($dateStr);
        $today = new DateTime('today'); // Aujourd'hui à minuit
        if ($searchDateObj < $today) {
            $errors['date'] = "La date de recherche ne peut pas être dans le passé.";
        }
    } catch (Exception $e) {
        $errors['date'] = "Format de date invalide (AAAA-MM-JJ attendu).";
    }
}
if ($seatsNeeded === false || $seatsNeeded === null || $seatsNeeded < 1) {
    $errors['seats'] = "Le nombre de places requis doit être d'au moins 1.";
}

if (!empty($errors)) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Paramètres de recherche invalides.', 'errors' => $errors]);
    exit();
}

$response = ['success' => false, 'rides' => [], 'message' => ''];

try {
    $pdo = getPDOConnection();

    // Construction de la base de la requête SQL
    $sqlBase = "SELECT 
                    r.id as ride_id, r.departure_city, r.arrival_city, 
                    r.departure_time, r.estimated_arrival_time, r.price_per_seat,
                    r.is_eco_ride,
                    u.username as driver_username, u.profile_picture_path as driver_photo,
                    v.model_name as vehicle_model, br.name as vehicle_brand,
                    (r.seats_offered - COALESCE(SUM(b.seats_booked), 0)) as seats_available
                FROM Rides r
                JOIN Users u ON r.driver_id = u.id
                JOIN Vehicles v ON r.vehicle_id = v.id
                JOIN Brands br ON v.brand_id = br.id
                LEFT JOIN Bookings b ON r.id = b.ride_id AND b.booking_status = 'confirmed'
                WHERE r.ride_status = 'planned' 
                AND r.departure_time >= :search_date_start ";

    $queryParams = []; 
    $whereConditions = []; 

    // Critère : Ville de départ
    if (!empty($departureCity)) {
        $whereConditions[] = "LOWER(r.departure_city) LIKE LOWER(:departure_city)";
        $queryParams[':departure_city'] = '%' . $departureCity . '%';
    }

    // Critère : Ville d'arrivée
    if (!empty($arrivalCity)) {
        $whereConditions[] = "LOWER(r.arrival_city) LIKE LOWER(:arrival_city)";
        $queryParams[':arrival_city'] = '%' . $arrivalCity . '%';
    }
    
    
    $queryParams[':search_date_start'] = $dateStr . ' 00:00:00';
    // Pour ne prendre que les trajets du jour J (et non ceux des jours suivants)
    $whereConditions[] = "r.departure_time < DATE_ADD(CAST(:search_date_exact AS DATE), INTERVAL 1 DAY)";
    $queryParams[':search_date_exact'] = $dateStr;


    if (!empty($whereConditions)) {
        $sqlBase .= " AND " . implode(" AND ", $whereConditions);
    }

    $sqlBase .= " GROUP BY r.id, u.id, v.id, br.id "; 

    if ($seatsNeeded > 0) {
        $sqlBase .= " HAVING seats_available >= :seats_needed"; 
        $queryParams[':seats_needed'] = $seatsNeeded;
    }

    $sqlBase .= " ORDER BY r.departure_time ASC";

    $stmt = $pdo->prepare($sqlBase);
    $stmt->execute($queryParams);
    
    $rides = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($rides) {
        foreach ($rides as $key => $ride) {
            if (isset($ride['is_eco_ride'])) {
                $rides[$key]['is_eco_ride'] = (bool)$ride['is_eco_ride'];
            }
            $rides[$key]['seats_available'] = (int)($ride['seats_available'] ?? 0);
        }
        $response['success'] = true;
        $response['rides'] = $rides;
        http_response_code(200);
    } else {
        $response['success'] = true;
        $response['rides'] = [];
        $response['message'] = "Aucun trajet trouvé pour ces critères.";
        http_response_code(200); 
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (search_rides.php) : " . $e->getMessage());
    $response['message'] = 'Erreur serveur lors de la recherche de trajets.';
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (search_rides.php) : " . $e->getMessage());
    $response['message'] = 'Une erreur inattendue est survenue.';
}

echo json_encode($response);
?>