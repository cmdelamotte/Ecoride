<?php

require_once __DIR__ . '/config/database.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérification du rôle Employé ou Admin (un admin peut aussi faire les tâches d'un employé)
$isAllowed = false;
if (isset($_SESSION['user_id']) && isset($_SESSION['roles_system']) && is_array($_SESSION['roles_system'])) {
    if (in_array('ROLE_EMPLOYEE', $_SESSION['roles_system']) || in_array('ROLE_ADMIN', $_SESSION['roles_system'])) {
        $isAllowed = true;
    }
}

if (!$isAllowed) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Accès non autorisé.']);
    exit();
}

$response = ['success' => false, 'reviews' => []];

try {
    $pdo = getPDOConnection();
    // Récupérer les avis en attente avec les détails nécessaires
    $sql = "SELECT 
                r.id as reviewId, 
                r.ride_id as rideId,
                r.rating, 
                r.comment, 
                r.submission_date as submittedDate,
                author.username as passengerName,
                driver.username as driverName,
                ride.departure_city,
                ride.arrival_city
            FROM Reviews r
            JOIN Users author ON r.author_id = author.id
            JOIN Users driver ON r.driver_id = driver.id
            JOIN Rides ride ON r.ride_id = ride.id
            WHERE r.review_status = 'pending_approval'
            ORDER BY r.submission_date ASC"; // Les plus anciens d'abord

    $stmt = $pdo->query($sql);
    $reviews = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($reviews) {
        $response['success'] = true;
        // Formatter les données pour correspondre à ce que le JS employeeDashboardHandler attend
        $response['reviews'] = array_map(function($review) {
            return [
                'reviewId' => 'REV' . str_pad($review['reviewId'], 3, '0', STR_PAD_LEFT),
                'passengerName' => $review['passengerName'],
                'driverName' => $review['driverName'],
                'rating' => (int) $review['rating'],
                'comment' => $review['comment'],
                'submittedDate' => (new DateTime($review['submittedDate']))->format('Y-m-d'),
                'rideId' => 'RIDE' . str_pad($review['rideId'], 3, '0', STR_PAD_LEFT),
                'rideDetails' => $review['departure_city'] . ' -> ' . $review['arrival_city']
            ];
        }, $reviews);
    } else {
        $response['success'] = true; // Succès, mais pas d'avis
        $response['message'] = "Aucun avis en attente de modération.";
    }
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    $response['message'] = "Erreur PDO: " . $e->getMessage();
    error_log("Erreur employee_get_pending_reviews.php (PDO): " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur générale: " . $e->getMessage();
    error_log("Erreur employee_get_pending_reviews.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>