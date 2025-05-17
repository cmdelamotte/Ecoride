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

// 1. Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

// 2. Vérifier si l'utilisateur est un chauffeur
// On lit le functional_role stocké en session lors du login
$userFunctionalRole = $_SESSION['functional_role'] ?? 'passenger'; 
if ($userFunctionalRole !== 'driver' && $userFunctionalRole !== 'passenger_driver') {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Action non autorisée. Seuls les chauffeurs peuvent ajouter des véhicules.']);
    exit();
}

// 3. Récupérer les données JSON envoyées
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Récupération des données du véhicule (avec des valeurs par défaut ou null si non fournies)
// Le JavaScript enverra les clés correspondant aux colonnes de la BDD
$brand_id = filter_var($input['brand_id'] ?? null, FILTER_VALIDATE_INT);
$model_name = trim($input['model_name'] ?? '');
$color = isset($input['color']) ? trim($input['color']) : null; // Couleur est nullable
$license_plate = trim($input['license_plate'] ?? '');
$registration_date = $input['registration_date'] ?? null; // Format YYYY-MM-DD, nullable
$passenger_capacity = filter_var($input['passenger_capacity'] ?? 0, FILTER_VALIDATE_INT);
$is_electric = filter_var($input['is_electric'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$energy_type = isset($input['energy_type']) ? trim($input['energy_type']) : null; // Nullable

// Récupération des données du véhicule (avec des valeurs par défaut ou null si non fournies)
$userId = $_SESSION['user_id']; // L'ID de l'utilisateur connecté
$brand_id = filter_var($input['brand_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$model_name = trim($input['model_name'] ?? '');
$color = isset($input['color']) ? trim($input['color']) : null;
$license_plate = trim($input['license_plate'] ?? '');
$registration_date = $input['registration_date'] ?? null;
$passenger_capacity = filter_var($input['passenger_capacity'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 8]]);
$is_electric = filter_var($input['is_electric'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$energy_type = isset($input['energy_type']) ? trim($input['energy_type']) : null;


// --- Validation serveur détaillée des données du véhicule ---
$errors = [];

if (empty($brand_id)) {
    $errors['brand_id'] = "La marque du véhicule est requise.";
} else {
    // Vérifier si brand_id existe dans la table Brands
    try {
        $pdoCheck = getPDOConnection();
        $stmtCheckBrand = $pdoCheck->prepare("SELECT id FROM Brands WHERE id = :brand_id");
        $stmtCheckBrand->bindParam(':brand_id', $brand_id, PDO::PARAM_INT);
        $stmtCheckBrand->execute();
        if ($stmtCheckBrand->fetch() === false) {
            $errors['brand_id'] = "La marque sélectionnée n'est pas valide.";
        }
    } catch (PDOException $e) {
        // Ne pas exposer l'erreur PDO, mais la logger et mettre une erreur générique
        error_log("Erreur PDO lors de la vérification de brand_id (add_vehicle.php): " . $e->getMessage());
        $errors['database'] = "Erreur lors de la validation de la marque.";
    }
}

if (empty($model_name)) { 
    $errors['model_name'] = "Le nom du modèle est requis."; 
} elseif (strlen($model_name) > 100) {
    $errors['model_name'] = "Le nom du modèle ne doit pas dépasser 100 caractères.";
}

if (empty($license_plate)) { 
    $errors['license_plate'] = "La plaque d'immatriculation est requise."; 
} elseif (strlen($license_plate) > 20) {
    $errors['license_plate'] = "La plaque d'immatriculation ne doit pas dépasser 20 caractères.";
} else {
    // Vérifier l'unicité de la plaque d'immatriculation (la BDD a aussi une contrainte UNIQUE)
    try {
        $pdoCheckPlate = getPDOConnection(); // Ré-obtenir ou utiliser la même instance PDO si possible
        $stmtCheckPlate = $pdoCheckPlate->prepare("SELECT id FROM Vehicles WHERE license_plate = :license_plate");
        $stmtCheckPlate->bindParam(':license_plate', $license_plate);
        $stmtCheckPlate->execute();
        if ($stmtCheckPlate->fetch() !== false) {
            $errors['license_plate'] = "Cette plaque d'immatriculation est déjà enregistrée.";
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO lors de la vérification de license_plate (add_vehicle.php): " . $e->getMessage());
        $errors['database'] = "Erreur lors de la validation de la plaque.";
    }
}

if ($passenger_capacity === false || $passenger_capacity === null || $passenger_capacity < 1 || $passenger_capacity > 8) { 
    // filter_var retourne false si la validation échoue et null si FILTER_NULL_ON_FAILURE est utilisé et que l'input n'est pas valide
    $errors['passenger_capacity'] = "La capacité passagers doit être un nombre entre 1 et 8."; 
}

if ($registration_date !== null && $registration_date !== '') { // Si fournie
    // Valider le format YYYY-MM-DD et que la date n'est pas dans le futur
    $dateParts = explode('-', $registration_date);
    if (count($dateParts) !== 3 || !checkdate($dateParts[1], $dateParts[2], $dateParts[0])) {
        $errors['registration_date'] = "Format de date d'immatriculation invalide (AAAA-MM-JJ attendu).";
    } else {
        $today = date('Y-m-d');
        if ($registration_date > $today) {
            $errors['registration_date'] = "La date d'immatriculation ne peut pas être dans le futur.";
        }
    }
} // Ce champ est nullable, donc on ne valide que s'il est fourni

if ($is_electric === null) { // filter_var avec FILTER_NULL_ON_FAILURE retourne null si pas un booléen valide
    $errors['is_electric'] = "La valeur pour 'véhicule électrique' est invalide.";
}

if (isset($color) && strlen($color) > 50) {
    $errors['color'] = "La couleur ne doit pas dépasser 50 caractères.";
}
if (isset($energy_type) && strlen($energy_type) > 50) {
    $errors['energy_type'] = "Le type d'énergie ne doit pas dépasser 50 caractères.";
}


if (!empty($errors)) {
    http_response_code(400); 
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation des données du véhicule.', 'errors' => $errors]);
    exit();
}

// --- Si toutes les validations sont OK, on insère en BDD ---
try {
    $pdo = getPDOConnection();

    $sql = "INSERT INTO Vehicles (user_id, brand_id, model_name, color, license_plate, registration_date, passenger_capacity, is_electric, energy_type) 
            VALUES (:user_id, :brand_id, :model_name, :color, :license_plate, :registration_date, :passenger_capacity, :is_electric, :energy_type)";
    
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
    $stmt->bindParam(':brand_id', $brand_id, PDO::PARAM_INT);
    $stmt->bindParam(':model_name', $model_name);
    $stmt->bindParam(':color', $color); // PDO::PARAM_STR par défaut, gère NULL
    $stmt->bindParam(':license_plate', $license_plate);
    $stmt->bindParam(':registration_date', $registration_date); // PDO::PARAM_STR, gère NULL
    $stmt->bindParam(':passenger_capacity', $passenger_capacity, PDO::PARAM_INT);
    $stmt->bindParam(':is_electric', $is_electric, PDO::PARAM_BOOL);
    $stmt->bindParam(':energy_type', $energy_type); // PDO::PARAM_STR, gère NULL

    if ($stmt->execute()) {
        $newVehicleId = $pdo->lastInsertId();
        // Récupérer le véhicule complet avec le nom de la marque pour le renvoyer
        $sqlGetNewVehicle = "SELECT v.*, b.name as brand_name 
                            FROM Vehicles v 
                            JOIN Brands b ON v.brand_id = b.id 
                            WHERE v.id = :vehicle_id";
        $stmtGet = $pdo->prepare($sqlGetNewVehicle);
        $stmtGet->bindParam(':vehicle_id', $newVehicleId, PDO::PARAM_INT);
        $stmtGet->execute();
        $newVehicleData = $stmtGet->fetch(PDO::FETCH_ASSOC);
        if ($newVehicleData && isset($newVehicleData['is_electric'])) { // Assurer la conversion booléenne pour la réponse
            $newVehicleData['is_electric'] = (bool)$newVehicleData['is_electric'];
        }

        http_response_code(201);
        echo json_encode([
            'success' => true,
            'message' => 'Véhicule ajouté avec succès.',
            'vehicle' => $newVehicleData // Renvoyer les données du véhicule créé
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de l\'ajout du véhicule en base de données.']);
    }

} catch (PDOException $e) {
    http_response_code(500);
    // Vérifier si c'est une erreur de contrainte d'unicité (ex: plaque d'immatriculation)
    if ($e->errorInfo[1] == 1062) { // Code d'erreur MySQL pour entrée dupliquée
        error_log("Erreur PDO (add_vehicle.php) - Entrée dupliquée : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => "Cette plaque d'immatriculation est déjà enregistrée. Veuillez en utiliser une autre."]);
    } else {
        error_log("Erreur PDO (add_vehicle.php) : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de l\'ajout du véhicule.']);
    }
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (add_vehicle.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>