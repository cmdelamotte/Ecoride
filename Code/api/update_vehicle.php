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

// 1. Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$current_user_id = $_SESSION['user_id'];

// 2. Récupérer les données JSON envoyées
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);


// Récupération de l'ID du véhicule à modifier
$vehicle_id_to_update = filter_var($input['id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);


if (empty($vehicle_id_to_update)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'ID du véhicule manquant ou invalide pour la mise à jour.']);
    exit();
}

// Récupération des autres données du véhicule
$brand_id = filter_var($input['brand_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$model_name = trim($input['model_name'] ?? '');
$color = isset($input['color']) ? trim($input['color']) : null;
$license_plate = trim($input['license_plate'] ?? '');
$registration_date = $input['registration_date'] ?? null;
if ($registration_date === '') {
    $registration_date = null;
} 
$passenger_capacity = filter_var($input['passenger_capacity'] ?? 0, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 8]]);
$is_electric = filter_var($input['is_electric'] ?? false, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$energy_type = isset($input['energy_type']) ? trim($input['energy_type']) : null;

// --- Validation serveur détaillée des nouvelles données du véhicule ---
$errors = [];

// 1. Vérifier si le véhicule appartient bien à l'utilisateur connecté
//    et récupérer les données actuelles du véhicule si besoin (ex: pour comparer l'ancienne plaque)
$vehicle_owned_by_user = false;
$old_license_plate = null; // Pour stocker l'ancienne plaque si on la modifie

try {
    $pdo = getPDOConnection(); // Récupérer la connexion une seule fois pour toutes les opérations BDD
    $stmtCheckOwner = $pdo->prepare("SELECT license_plate FROM Vehicles WHERE id = :vehicle_id AND user_id = :user_id");
    $stmtCheckOwner->bindParam(':vehicle_id', $vehicle_id_to_update, PDO::PARAM_INT);
    $stmtCheckOwner->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtCheckOwner->execute();
    $vehicle_current_data = $stmtCheckOwner->fetch(PDO::FETCH_ASSOC);

    if ($vehicle_current_data) {
        $vehicle_owned_by_user = true;
        $old_license_plate = $vehicle_current_data['license_plate'];
    } else {
        http_response_code(403); 
        echo json_encode(['success' => false, 'message' => 'Véhicule non trouvé ou action non autorisée.']);
        exit();
    }

    // 2. Valider les nouvelles données reçues
    if (empty($brand_id)) {
        $errors['brand_id'] = "La marque du véhicule est requise.";
    } else {
        $stmtCheckBrand = $pdo->prepare("SELECT id FROM Brands WHERE id = :brand_id");
        $stmtCheckBrand->bindParam(':brand_id', $brand_id, PDO::PARAM_INT);
        $stmtCheckBrand->execute();
        if ($stmtCheckBrand->fetch() === false) {
            $errors['brand_id'] = "La marque sélectionnée n'est pas valide.";
        }
    }

    if (empty($model_name)) { 
        $errors['model_name'] = "Le nom du modèle est requis."; 
    } elseif (strlen($model_name) > 100) {
        $errors['model_name'] = "Le nom du modèle trop long."; }

    if (empty($license_plate)) {
        $errors['license_plate'] = "La plaque est requise."; 
    } elseif (strlen($license_plate) > 20) {
        $errors['license_plate'] = "Plaque trop longue."; }
    // Si la plaque a changé, vérifier son unicité par rapport aux AUTRES véhicules
    elseif ($license_plate !== $old_license_plate) {
        $stmtCheckPlate = $pdo->prepare("SELECT id FROM Vehicles WHERE license_plate = :license_plate AND id != :vehicle_id_to_update");
        $stmtCheckPlate->bindParam(':license_plate', $license_plate);
        $stmtCheckPlate->bindParam(':vehicle_id_to_update', $vehicle_id_to_update, PDO::PARAM_INT);
        $stmtCheckPlate->execute();
        if ($stmtCheckPlate->fetch() !== false) {
            $errors['license_plate'] = "Cette plaque d'immatriculation est déjà utilisée par un autre véhicule.";
        }
    }

    if ($passenger_capacity === false || $passenger_capacity === null || $passenger_capacity < 1 || $passenger_capacity > 8) { 
        $errors['passenger_capacity'] = "Capacité passagers invalide (1-8)."; 
    }

    if ($registration_date !== null && $registration_date !== '') {
        $dateParts = explode('-', $registration_date);
        if (count($dateParts) !== 3 || !checkdate($dateParts[1], $dateParts[2], $dateParts[0])) {
            $errors['registration_date'] = "Format date invalide (AAAA-MM-JJ).";
        } else {
            $today = date('Y-m-d');
            if ($registration_date > $today) {
                $errors['registration_date'] = "Date d'immatriculation ne peut être future.";
            }
        }
    } // Rappel : ce champ est nullable

    if ($is_electric === null) { 
        $errors['is_electric'] = "Valeur 'véhicule électrique' invalide.";
    }

    if (isset($color) && strlen($color) > 50) { 
        $errors['color'] = "Couleur trop longue."; }
    if (isset($energy_type) && strlen($energy_type) > 50) {
        $errors['energy_type'] = "Type d'énergie trop long."; }

} catch (PDOException $e) { // Attraper les erreurs PDO pendant les vérifications
    error_log("Erreur PDO pendant la validation (update_vehicle.php): " . $e->getMessage());
    $errors['database_validation'] = "Erreur serveur lors de la validation des données du véhicule.";
}


if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation des données du véhicule.', 'errors' => $errors]);
    exit();
}

try {
    $sql = "UPDATE Vehicles 
            SET brand_id = :brand_id, 
                model_name = :model_name, 
                color = :color, 
                license_plate = :license_plate, 
                registration_date = :registration_date, 
                passenger_capacity = :passenger_capacity, 
                is_electric = :is_electric, 
                energy_type = :energy_type
            WHERE id = :vehicle_id AND user_id = :user_id"; // Important de garder user_id dans le WHERE pour la sécurité
    
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':brand_id', $brand_id, PDO::PARAM_INT);
    $stmt->bindParam(':model_name', $model_name);
    $stmt->bindParam(':color', $color);
    $stmt->bindParam(':license_plate', $license_plate);
    $stmt->bindParam(':registration_date', $registration_date);
    $stmt->bindParam(':passenger_capacity', $passenger_capacity, PDO::PARAM_INT);
    $stmt->bindParam(':is_electric', $is_electric, PDO::PARAM_BOOL);
    $stmt->bindParam(':energy_type', $energy_type);
    $stmt->bindParam(':vehicle_id', $vehicle_id_to_update, PDO::PARAM_INT);
    $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT); // Répéter user_id dans le WHERE

    if ($stmt->execute()) {
        if ($stmt->rowCount() > 0) { // Vérifie si au moins une ligne a été affectée
            // Récupérer le véhicule mis à jour pour le renvoyer
            $sqlGetUpdatedVehicle = "SELECT v.*, b.name as brand_name 
                                    FROM Vehicles v 
                                    JOIN Brands b ON v.brand_id = b.id 
                                    WHERE v.id = :vehicle_id";
            $stmtGet = $pdo->prepare($sqlGetUpdatedVehicle);
            $stmtGet->bindParam(':vehicle_id', $vehicle_id_to_update, PDO::PARAM_INT);
            $stmtGet->execute();
            $updatedVehicleData = $stmtGet->fetch(PDO::FETCH_ASSOC);
            if ($updatedVehicleData && isset($updatedVehicleData['is_electric'])) {
                $updatedVehicleData['is_electric'] = (bool)$updatedVehicleData['is_electric'];
            }

            http_response_code(200);
            echo json_encode([
                'success' => true,
                'message' => 'Véhicule mis à jour avec succès.',
                'vehicle' => $updatedVehicleData 
            ]);
        } else {
            http_response_code(200);
            echo json_encode([
                'success' => true, // L'opération n'a pas échoué, mais n'a rien été modifié
                'message' => 'Aucune modification détectée pour le véhicule ou véhicule non trouvé avec les bons droits.',
            ]);
        }
    } else {
        // La requête UPDATE elle-même a échoué pour une raison non PDOException
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la mise à jour du véhicule en base de données.']);
    }

} catch (PDOException $e) { 
    http_response_code(500);
    if ($e->errorInfo[1] == 1062) { // Doublon de plaque si la vérification précédente a été contournée ou pour un autre champ UNIQUE
        error_log("Erreur PDO (update_vehicle.php) - Entrée dupliquée : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => "Un conflit de données est survenu."]);
    } else {
        error_log("Erreur PDO (update_vehicle.php) : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la mise à jour du véhicule.']);
    }
} catch (Exception $e) { // Catch générique
    http_response_code(500);
    error_log("Erreur générale (update_vehicle.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>