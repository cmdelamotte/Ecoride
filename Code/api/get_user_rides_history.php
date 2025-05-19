<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode GET uniquement.']);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    http_response_code(401);
    echo json_encode(['success' => false, 'message' => 'Authentification requise.']);
    exit();
}

$current_user_id = (int)$_SESSION['user_id'];
$response = ['success' => false, 'driven_rides' => [], 'booked_rides' => [], 'message' => ''];

try {
    $pdo = getPDOConnection();

    $rideDetailsSelectSQL = "
        r.id as ride_id, r.departure_city, r.arrival_city, r.departure_address, r.arrival_address,
        r.departure_time, r.estimated_arrival_time, r.price_per_seat, r.seats_offered,
        r.ride_status, r.driver_message, r.is_eco_ride,
        u_driver.username as driver_username, u_driver.profile_picture_path as driver_photo,
        v.model_name as vehicle_model, br.name as vehicle_brand, v.energy_type as vehicle_energy,
        (r.seats_offered - COALESCE((SELECT SUM(b_inner.seats_booked) FROM Bookings b_inner WHERE b_inner.ride_id = r.id AND b_inner.booking_status = 'confirmed'), 0)) as seats_available
    ";

    // 1. Trajets où l'utilisateur est chauffeur
    $sqlDrivenRides = "SELECT $rideDetailsSelectSQL
                        FROM Rides r
                        JOIN Users u_driver ON r.driver_id = u_driver.id
                        JOIN Vehicles v ON r.vehicle_id = v.id
                        JOIN Brands br ON v.brand_id = br.id
                        WHERE r.driver_id = :user_id
                        ORDER BY r.departure_time DESC";
    $stmtDriven = $pdo->prepare($sqlDrivenRides);
    $stmtDriven->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtDriven->execute();
    $driven_rides_raw = $stmtDriven->fetchAll(PDO::FETCH_ASSOC);

    $driven_rides = [];
    foreach ($driven_rides_raw as $ride) {
        $ride['is_eco_ride'] = (bool)$ride['is_eco_ride'];
        $ride['seats_available'] = (int)($ride['seats_available'] ?? 0);
        // On peut ajouter le rôle "Chauffeur" ici pour le JS
        $ride['user_role_in_ride'] = 'driver';
        $driven_rides[] = $ride;
    }
    $response['driven_rides'] = $driven_rides;

    // 2. Trajets où l'utilisateur est passager (via Bookings)
    $sqlBookedRides = "SELECT $rideDetailsSelectSQL,
                            b.seats_booked, b.booking_status, b.booking_date
                        FROM Bookings b
                        JOIN Rides r ON b.ride_id = r.id
                        JOIN Users u_driver ON r.driver_id = u_driver.id
                        JOIN Vehicles v ON r.vehicle_id = v.id
                        JOIN Brands br ON v.brand_id = br.id
                        WHERE b.user_id = :user_id 
                        AND b.booking_status = 'confirmed' 
                        ORDER BY r.departure_time DESC";
                        error_log("SQL pour Booked Rides: " . $sqlBookedRides);
    $stmtBooked = $pdo->prepare($sqlBookedRides);
    $stmtBooked->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
    $stmtBooked->execute();
    $booked_rides_raw = $stmtBooked->fetchAll(PDO::FETCH_ASSOC);
    
    $booked_rides = [];
    foreach ($booked_rides_raw as $ride) {
        $ride['is_eco_ride'] = (bool)$ride['is_eco_ride'];
        $ride['seats_available'] = (int)($ride['seats_available'] ?? 0);
        $ride['user_role_in_ride'] = 'passenger';
        $booked_rides[] = $ride;
    }
    $response['booked_rides'] = $booked_rides;

    $response['success'] = true;
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (get_user_rides_history.php) : " . $e->getMessage());
    $response['message'] = 'Erreur serveur lors de la récupération de l\'historique des trajets.';
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (get_user_rides_history.php) : " . $e->getMessage());
    $response['message'] = 'Une erreur inattendue est survenue.';
}

echo json_encode($response);
?>