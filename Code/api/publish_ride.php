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

// Récupérer le rôle fonctionnel depuis la session (mis à jour lors du login ou du changement de rôle)
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

// Récupération des données attendues du formulaire de publication de trajet
$departure_city = trim($input['departure_city'] ?? '');
$arrival_city = trim($input['arrival_city'] ?? '');
$departure_address = isset($input['departure_address']) ? trim($input['departure_address']) : null;
$arrival_address = isset($input['arrival_address']) ? trim($input['arrival_address']) : null;    
$departure_datetime_str = $input['departure_datetime'] ?? '';
$vehicle_id = filter_var($input['vehicle_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$seats_offered = filter_var($input['seats_offered'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 8]]); // Max 8 pour un véhicule standard
$price_per_seat = filter_var($input['price_per_seat'] ?? null, FILTER_VALIDATE_FLOAT);
$driver_message = isset($input['driver_message']) ? trim($input['driver_message']) : null; 

// --- Validation serveur détaillée des données du trajet ---
$errors = [];
$pdo = getPDOConnection();

// Villes de départ et d'arrivée
if (empty($departure_city)) { 
    $errors['departure_city'] = "La ville de départ est requise."; 
} elseif (strlen($departure_city) > 150) {
    $errors['departure_city'] = "Ville de départ trop longue (max 150 caractères).";
}

if (empty($arrival_city)) { 
    $errors['arrival_city'] = "La ville d'arrivée est requise."; 
} elseif (strlen($arrival_city) > 150) {
    $errors['arrival_city'] = "Ville d'arrivée trop longue (max 150 caractères).";
}

if (!empty($departure_city) && !empty($arrival_city) && strtolower($departure_city) === strtolower($arrival_city)) {
    $errors['arrival_city'] = "La ville d'arrivée doit être différente de la ville de départ.";
}

// Adresses précises (optionnelles, mais si fournies, on peut valider leur longueur)
if ($departure_address !== null && strlen($departure_address) > 255) {
    $errors['departure_address'] = "L'adresse de départ est trop longue.";
}
if ($arrival_address !== null && strlen($arrival_address) > 255) {
    $errors['arrival_address'] = "L'adresse d'arrivée est trop longue.";
}

// Date et heure de départ
$departure_datetime = null;
if (empty($departure_datetime_str)) {
    $errors['departure_datetime'] = "La date et l'heure de départ sont requises.";
} else {
    // Essayer de convertir la chaîne AAAA-MM-JJTHH:MM en objet DateTime
    try {
        $departure_datetime_obj = new DateTime($departure_datetime_str);
        $now = new DateTime();
        // Ajout d'une marge, par ex. le départ doit être au moins 15 mins dans le futur
        $minDepartureTime = (new DateTime())->modify('+15 minutes'); 

        if ($departure_datetime_obj < $minDepartureTime) {
            $errors['departure_datetime'] = "La date et l'heure de départ doivent être dans le futur (au moins 15 minutes à partir de maintenant).";
        } else {
            $departure_datetime = $departure_datetime_obj->format('Y-m-d H:i:s'); // Format pour la BDD
        }
    } catch (Exception $e) {
        $errors['departure_datetime'] = "Format de date/heure de départ invalide.";
    }
}

// Véhicule
$vehicle_capacity = 0;
$vehicle_is_electric = false;
if (empty($vehicle_id)) {
    $errors['vehicle_id'] = "Veuillez sélectionner un véhicule.";
} else {
    // Vérifier si le vehicle_id appartient à l'utilisateur et récupérer sa capacité et son statut électrique
    try {
        $stmtCheckVehicle = $pdo->prepare("SELECT passenger_capacity, is_electric FROM Vehicles WHERE id = :vehicle_id AND user_id = :user_id");
        $stmtCheckVehicle->bindParam(':vehicle_id', $vehicle_id, PDO::PARAM_INT);
        $stmtCheckVehicle->bindParam(':user_id', $current_user_id, PDO::PARAM_INT); // $current_user_id vient de la session
        $stmtCheckVehicle->execute();
        $vehicle_data = $stmtCheckVehicle->fetch(PDO::FETCH_ASSOC);

        if (!$vehicle_data) {
            $errors['vehicle_id'] = "Véhicule sélectionné invalide ou ne vous appartient pas.";
        } else {
            $vehicle_capacity = (int)$vehicle_data['passenger_capacity'];
            $vehicle_is_electric = (bool)$vehicle_data['is_electric'];
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO (publish_ride.php - vérif véhicule): " . $e->getMessage());
        $errors['database'] = "Erreur lors de la validation du véhicule.";
    }
}

// Places offertes
if ($seats_offered === false || $seats_offered === null || $seats_offered < 1 || $seats_offered > 8) { 
    $errors['seats_offered'] = "Le nombre de places offertes doit être entre 1 et 8.";
} elseif ($vehicle_capacity > 0 && $seats_offered > $vehicle_capacity) {
    // Vérifier seulement si vehicle_capacity a été récupérée et est positive
    $errors['seats_offered'] = "Le nombre de places offertes ne peut pas dépasser la capacité de votre véhicule (" . $vehicle_capacity . " places).";
}

// Prix par passager
$platform_commission = 2.00; // Définir la commission

if ($price_per_seat === null) { 
    $errors['price_per_seat'] = "Le prix par passager est requis.";
} elseif ($price_per_seat === false) {
    $errors['price_per_seat'] = "Format de prix invalide.";
} elseif ($price_per_seat < $platform_commission) {
    $errors['price_per_seat'] = "Le prix par passager doit être d'au moins " . $platform_commission . " crédits (commission plateforme incluse).";
} elseif ($price_per_seat > 9999.99) { // Limite supérieure arbitraire
    $errors['price_per_seat'] = "Le prix par passager est trop élevé.";
}

// Message du chauffeur (optionnel, mais on peut valider la longueur si fourni)
if ($driver_message !== null && strlen($driver_message) > 1000) { // TEXT peut prendre plus, mais c'est une limite raisonnable
    $errors['driver_message'] = "Le message est trop long (max 1000 caractères).";
}


// Si des erreurs de validation sont présentes, les renvoyer
if (!empty($errors)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation des données du trajet.', 'errors' => $errors]);
    exit();
}

// --- Logique métier supplémentaire ---

// 1. Déterminer is_eco_ride (on l'a déjà fait en récupérant $vehicle_is_electric lors de la validation du véhicule)
$is_eco_ride = $vehicle_is_electric; // Utilise la valeur récupérée de la table Vehicles

// 2. Calculer l'heure d'arrivée estimée.
$estimated_arrival_datetime_str = $input['estimated_arrival_datetime'] ?? '';
$departure_datetime = null; // Sera 'AAAA-MM-JJ HH:MM:SS'
$departure_datetime_obj = null; // Garder l'objet DateTime pour la comparaison

if (empty($departure_datetime_str)) {
    $errors['departure_datetime'] = "La date et l'heure de départ sont requises.";
} else {
    try {
        $departure_datetime_obj = new DateTime($departure_datetime_str); // Ligne A
        $minDepartureTime = (new DateTime())->modify('+15 minutes'); 
        if ($departure_datetime_obj < $minDepartureTime) {
            $errors['departure_datetime'] = "Le départ doit être au moins 15 minutes dans le futur.";
        } else {
            $departure_datetime = $departure_datetime_obj->format('Y-m-d H:i:s'); // Ligne B
        }
    } catch (Exception $e) {
        $errors['departure_datetime'] = "Format de date/heure de départ invalide.";
    }
}

$estimated_arrival_datetime = null; // Sera 'AAAA-MM-JJ HH:MM:SS'
$eta_obj = null; // Pour garder l'objet DateTime de l'arrivée

if (empty($estimated_arrival_datetime_str) && $departure_datetime_obj !== null) {
    $eta_obj = (clone $departure_datetime_obj)->modify('+3 hours');
    $estimated_arrival_datetime = $eta_obj->format('Y-m-d H:i:s');
} elseif (!empty($estimated_arrival_datetime_str)) {
    try {
        $eta_obj = new DateTime($estimated_arrival_datetime_str);
        // Vérification que le départ n'est pas après l'arrivée
        if ($departure_datetime_obj !== null && $eta_obj <= $departure_datetime_obj) { 
            $errors['estimated_arrival_datetime'] = "L'heure d'arrivée doit être après l'heure de départ.";
        } else {
            $estimated_arrival_datetime = $eta_obj->format('Y-m-d H:i:s');
        }
    } catch (Exception $e) {
        $errors['estimated_arrival_datetime'] = "Format de date/heure d'arrivée invalide.";
    }
}

if (!empty($errors)) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation...', 'errors' => $errors]);
    exit(); 
}


// --- Insertion en base de données ---
try {

    $pdo->beginTransaction(); // Commencer une transaction

    $sqlRide = "INSERT INTO Rides (driver_id, vehicle_id, departure_city, arrival_city, 
                                departure_address, arrival_address, departure_time, 
                                estimated_arrival_time, price_per_seat, seats_offered, 
                                ride_status, driver_message, is_eco_ride) 
                VALUES (:driver_id, :vehicle_id, :departure_city, :arrival_city, 
                        :departure_address, :arrival_address, :departure_time, 
                        :estimated_arrival_time, :price_per_seat, :seats_offered, 
                        :ride_status, :driver_message, :is_eco_ride)";
    
    $stmtRide = $pdo->prepare($sqlRide);

    $defaultRideStatus = 'planned'; // Statut par défaut pour un nouveau trajet

    $stmtRide->bindParam(':driver_id', $current_user_id, PDO::PARAM_INT);
    $stmtRide->bindParam(':vehicle_id', $vehicle_id, PDO::PARAM_INT);
    $stmtRide->bindParam(':departure_city', $departure_city);
    $stmtRide->bindParam(':arrival_city', $arrival_city);
    $stmtRide->bindParam(':departure_address', $departure_address);
    $stmtRide->bindParam(':arrival_address', $arrival_address);
    $stmtRide->bindParam(':departure_time', $departure_datetime);
    $stmtRide->bindParam(':estimated_arrival_time', $estimated_arrival_datetime);
    $stmtRide->bindParam(':price_per_seat', $price_per_seat);
    $stmtRide->bindParam(':seats_offered', $seats_offered, PDO::PARAM_INT);
    $stmtRide->bindParam(':ride_status', $defaultRideStatus);
    $stmtRide->bindParam(':driver_message', $driver_message);
    $stmtRide->bindParam(':is_eco_ride', $is_eco_ride, PDO::PARAM_BOOL);

    $stmtRide->execute();
    $newRideId = $pdo->lastInsertId();

    $pdo->commit(); // Valider la transaction

    // Récupérer le trajet complet avec les infos jointes pour le renvoyer
    $sqlGetNewRide = "SELECT r.*, 
                            u.username as driver_username, u.profile_picture_path as driver_photo, 
                            v.model_name as vehicle_model, b.name as vehicle_brand
                    FROM Rides r
                    JOIN Users u ON r.driver_id = u.id
                    JOIN Vehicles v ON r.vehicle_id = v.id
                    JOIN Brands b ON v.brand_id = b.id
                    WHERE r.id = :ride_id";
    $stmtGet = $pdo->prepare($sqlGetNewRide);
    $stmtGet->bindParam(':ride_id', $newRideId, PDO::PARAM_INT);
    $stmtGet->execute();
    $newRideData = $stmtGet->fetch(PDO::FETCH_ASSOC);
    if ($newRideData) { // Conversion des booléens pour la réponse JSON
        $newRideData['is_eco_ride'] = (bool)$newRideData['is_eco_ride'];
    }


    http_response_code(201);
    echo json_encode([
        'success' => true,
        'message' => 'Trajet publié avec succès !',
        'ride' => $newRideData 
    ]);

} catch (PDOException $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log("Erreur PDO (publish_ride.php - INSERT) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la publication du trajet.']);
} catch (Exception $e) { // Pour les erreurs de DateTime ou autres
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log("Erreur générale (publish_ride.php - INSERT) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>