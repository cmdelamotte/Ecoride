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
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée.']);
    exit();
}

// 1. Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$current_user_id = $_SESSION['user_id'];
$userFunctionalRole = $_SESSION['functional_role'] ?? 'passenger'; 

// 2. Vérifier si l'utilisateur a le droit de publier (est chauffeur)
if ($userFunctionalRole !== 'driver' && $userFunctionalRole !== 'passenger_driver') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Action non autorisée. Seuls les chauffeurs peuvent publier des trajets.']);
    exit();
}

// 3. Récupérer les données JSON envoyées par le client
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Récupération des données
$departure_city = trim($input['departure_city'] ?? '');
$arrival_city = trim($input['arrival_city'] ?? '');
$departure_address = isset($input['departure_address']) ? trim($input['departure_address']) : null;
$arrival_address = isset($input['arrival_address']) ? trim($input['arrival_address']) : null;
$departure_datetime_input_str = $input['departure_datetime'] ?? '';
$estimated_arrival_datetime_input_str = $input['estimated_arrival_datetime'] ?? '';
$vehicle_id = filter_var($input['vehicle_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$seats_offered = filter_var($input['seats_offered'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 8]]);
$price_per_seat = filter_var($input['price_per_seat'] ?? null, FILTER_VALIDATE_FLOAT);
$driver_message = isset($input['driver_message']) ? trim($input['driver_message']) : null; 

// --- Validation serveur détaillée ---
$errors = [];
$pdo = getPDOConnection();

// Initialisation des variables pour la BDD
$departure_datetime_for_db = null;
$estimated_arrival_datetime_for_db = null;
$departure_datetime_obj = null; // Pour la comparaison


// Validation Date et Heure de Départ
if (empty($departure_datetime_input_str)) {
    $errors['departure_datetime'] = "La date et l'heure de départ sont requises.";
} else {
    try {
        $departure_datetime_obj = new DateTime($departure_datetime_input_str);
        $minDepartureTime = (new DateTime())->modify('+15 minutes');
        if ($departure_datetime_obj < $minDepartureTime) {
            $errors['departure_datetime'] = "Le départ doit être au moins 15 minutes dans le futur.";
        } else {
            $departure_datetime_for_db = $departure_datetime_obj->format('Y-m-d H:i:s');
        }
    } catch (Exception $e) {
        $errors['departure_datetime'] = "Format de date/heure de départ invalide (AAAA-MM-JJTHH:MM attendu).";
    }
}

// Validation Date et Heure d'Arrivée Estimée
if (empty($estimated_arrival_datetime_input_str)) {
    $errors['estimated_arrival_datetime'] = "La date et l'heure d'arrivée estimées sont requises.";
} elseif ($departure_datetime_obj !== null && !isset($errors['departure_datetime'])) { 
    // On ne valide l'arrivée que si l'objet DateTime du départ est valide et qu'il n'y a pas déjà d'erreur sur le départ
    try {
        $eta_obj = new DateTime($estimated_arrival_datetime_input_str);
        if ($eta_obj <= $departure_datetime_obj) {
            $errors['estimated_arrival_datetime'] = "L'heure d'arrivée estimée doit être après l'heure de départ.";
        } else {
            $estimated_arrival_datetime_for_db = $eta_obj->format('Y-m-d H:i:s');
        }
    } catch (Exception $e) {
        $errors['estimated_arrival_datetime'] = "Format de date/heure d'arrivée invalide (AAAA-MM-JJTHH:MM attendu).";
    }
}

// --- FIN DE LA VALIDATION DES DATES ---

// Villes de départ et d'arrivée
if (empty($departure_city)) { $errors['departure_city'] = "Ville de départ requise."; }
if (empty($arrival_city)) { $errors['arrival_city'] = "Ville d'arrivée requise."; }
if (!empty($departure_city) && !empty($arrival_city) && strtolower($departure_city) === strtolower($arrival_city)) {
    $errors['arrival_city'] = "La ville d'arrivée doit être différente de la ville de départ.";
}

// Véhicule
$vehicle_capacity = 0;
$vehicle_is_electric = false;
if (empty($vehicle_id)) { $errors['vehicle_id'] = "Veuillez sélectionner un véhicule."; } 
else {
    try {
        $stmtCheckVehicle = $pdo->prepare("SELECT passenger_capacity, is_electric FROM Vehicles WHERE id = :vehicle_id AND user_id = :user_id");
        $stmtCheckVehicle->bindParam(':vehicle_id', $vehicle_id, PDO::PARAM_INT);
        $stmtCheckVehicle->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtCheckVehicle->execute();
        $vehicle_data = $stmtCheckVehicle->fetch(PDO::FETCH_ASSOC);
        if (!$vehicle_data) { $errors['vehicle_id'] = "Véhicule invalide ou ne vous appartient pas."; } 
        else {
            $vehicle_capacity = (int)$vehicle_data['passenger_capacity'];
            $vehicle_is_electric = (bool)$vehicle_data['is_electric'];
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO (publish_ride.php - vérif véhicule): " . $e->getMessage());
        $errors['database_vehicle_check'] = "Erreur lors de la validation du véhicule sélectionné.";
    }
}

// Places offertes 
if ($seats_offered === false || $seats_offered === null || $seats_offered < 1 || $seats_offered > 8) {
    $errors['seats_offered'] = "Places (1-8)."; } 
elseif ($vehicle_capacity > 0 && $seats_offered > $vehicle_capacity) {
    $errors['seats_offered'] = "Places offertes > capacité véhicule ($vehicle_capacity)."; }

// Prix par passager
$platform_commission = 2.00;
if ($price_per_seat === null) {
    $errors['price_per_seat'] = "Prix requis."; } 
elseif ($price_per_seat < $platform_commission) {
    $errors['price_per_seat'] = "Prix min " . $platform_commission . " crédits.";}

// Message du chauffeur
if ($driver_message !== null && strlen($driver_message) > 1000) { $errors['driver_message'] = "Message trop long."; }


// Si des erreurs de validation sont présentes, les renvoyer MAINTENANT
if (!empty($errors)) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation des données du trajet.', 'errors' => $errors]);
    exit(); // Arrêt si erreurs
}

// Si on arrive ici, $errors est vide. Toutes les validations sont passées.
// Et $departure_datetime_for_db, $estimated_arrival_datetime_for_db, $vehicle_is_electric sont définies.

$is_eco_ride = $vehicle_is_electric; // Utilise la valeur récupérée

// --- Insertion en base de données ---
try {
    $pdo->beginTransaction();

    $sqlRide = "INSERT INTO Rides (driver_id, vehicle_id, departure_city, arrival_city, 
                                departure_address, arrival_address, departure_time, 
                                estimated_arrival_time, price_per_seat, seats_offered, 
                                ride_status, driver_message, is_eco_ride) 
                VALUES (:driver_id, :vehicle_id, :departure_city, :arrival_city, 
                        :departure_address, :arrival_address, :departure_time, 
                        :estimated_arrival_time, :price_per_seat, :seats_offered, 
                        :ride_status, :driver_message, :is_eco_ride)";
    
    $stmtRide = $pdo->prepare($sqlRide);
    $defaultRideStatus = 'planned';

    $stmtRide->bindParam(':driver_id', $current_user_id, PDO::PARAM_INT);
    $stmtRide->bindParam(':vehicle_id', $vehicle_id, PDO::PARAM_INT);
    $stmtRide->bindParam(':departure_city', $departure_city);
    $stmtRide->bindParam(':arrival_city', $arrival_city);
    $stmtRide->bindParam(':departure_address', $departure_address);
    $stmtRide->bindParam(':arrival_address', $arrival_address);
    $stmtRide->bindParam(':departure_time', $departure_datetime_for_db);
    $stmtRide->bindParam(':estimated_arrival_time', $estimated_arrival_datetime_for_db);
    $stmtRide->bindParam(':price_per_seat', $price_per_seat);
    $stmtRide->bindParam(':seats_offered', $seats_offered, PDO::PARAM_INT);
    $stmtRide->bindParam(':ride_status', $defaultRideStatus);
    $stmtRide->bindParam(':driver_message', $driver_message);
    $stmtRide->bindParam(':is_eco_ride', $is_eco_ride, PDO::PARAM_BOOL);

    $stmtRide->execute();
    $newRideId = $pdo->lastInsertId();
    $pdo->commit();

    // Récupérer le trajet complet pour le renvoyer
    $sqlGetNewRide = "SELECT r.*, u.username as driver_username, u.profile_picture_path as driver_photo, v.model_name as vehicle_model, b.name as vehicle_brand FROM Rides r JOIN Users u ON r.driver_id = u.id JOIN Vehicles v ON r.vehicle_id = v.id JOIN Brands b ON v.brand_id = b.id WHERE r.id = :ride_id";
    $stmtGet = $pdo->prepare($sqlGetNewRide);
    $stmtGet->bindParam(':ride_id', $newRideId, PDO::PARAM_INT);
    $stmtGet->execute();
    $newRideData = $stmtGet->fetch(PDO::FETCH_ASSOC);
    if ($newRideData) { $newRideData['is_eco_ride'] = (bool)$newRideData['is_eco_ride']; }

    http_response_code(201);
    echo json_encode(['success' => true, 'message' => 'Trajet publié avec succès !', 'ride' => $newRideData ]);

} catch (PDOException $e) {
    if ($pdo && $pdo->inTransaction()) { // S'assurer que $pdo existe et qu'une transaction est en cours
        $pdo->rollBack(); // Annuler la transaction en cas d'erreur PDO
    }
    http_response_code(500); 
    error_log("Erreur PDO (publish_ride.php - INSERT/COMMIT) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la publication du trajet. Veuillez réessayer.']);
    exit(); 
} catch (Exception $e) { // Pour attraper d'autres types d'erreurs (ex: si $pdo n'était pas défini avant le try)
    if (isset($pdo) && $pdo && $pdo->inTransaction()) { // Vérifier si $pdo est défini avant de l'utiliser
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log("Erreur générale (publish_ride.php - INSERT/COMMIT) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue lors de la publication du trajet.']);
    exit(); 
}

?>