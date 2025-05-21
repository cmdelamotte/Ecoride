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

// Vérification du rôle Employé ou Admin
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

$response = ['success' => false, 'reports' => []];

try {
    $pdo = getPDOConnection();
    // Récupérer les signalements, par exemple ceux avec le statut 'new' ou 'under_investigation'
    // Et joindre les informations nécessaires.
    $sql = "SELECT 
                rep.id as reportId, 
                rep.ride_id as rideIdSQL, -- ID SQL du trajet
                rep.reason, 
                rep.report_status as reportStatus,
                rep.submission_date as reportSubmissionDate,
                reporter.username as passengerName,
                reporter.email as passengerEmail,
                driver.username as driverName,
                driver.email as driverEmail,
                ride.departure_city as rideDeparture,
                ride.arrival_city as rideArrival,
                ride.departure_time as rideDate
            FROM Reports rep
            JOIN Users reporter ON rep.reporter_id = reporter.id
            JOIN Users driver ON rep.reported_driver_id = driver.id
            JOIN Rides ride ON rep.ride_id = ride.id
            WHERE rep.report_status IN ('new', 'under_investigation')
            ORDER BY rep.submission_date ASC"; // Les plus anciens d'abord pour traitement

    $stmt = $pdo->query($sql);
    $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($reports) {
        $response['success'] = true;
        // Formatter les données pour correspondre à ce que le JS employeeDashboardHandler attend
        $response['reports'] = array_map(function($report) {
            return [
                'reportId' => 'REP' . str_pad($report['reportId'], 3, '0', STR_PAD_LEFT),
                'rideId' => 'RIDE' . str_pad($report['rideIdSQL'], 3, '0', STR_PAD_LEFT),
                'rideDeparture' => $report['rideDeparture'],
                'rideArrival' => $report['rideArrival'],
                'rideDate' => (new DateTime($report['rideDate']))->format('Y-m-d'),
                'reportSubmissionDate' => (new DateTime($report['reportSubmissionDate']))->format('Y-m-d H:i'),
                'passengerName' => $report['passengerName'],
                'passengerEmail' => $report['passengerEmail'],
                'driverName' => $report['driverName'],
                'driverEmail' => $report['driverEmail'],
                'reasonComment' => $report['reason'],
                'status' => $report['reportStatus'] // Pour un éventuel affichage du statut du signalement
            ];
        }, $reports);
    } else {
        $response['success'] = true;
        $response['message'] = "Aucun signalement actif à traiter.";
    }
    http_response_code(200);

} catch (PDOException $e) {
    http_response_code(500);
    $response['message'] = "Erreur PDO: " . $e->getMessage();
    error_log("Erreur employee_get_reports.php (PDO): " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur générale: " . $e->getMessage();
    error_log("Erreur employee_get_reports.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>