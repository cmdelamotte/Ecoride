<?php

require_once __DIR__ . '/config/analytics_manager.php'; 
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/config/settings.php';


if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérifier si l'utilisateur est connecté et est un admin
$isAdmin = false;
if (isset($_SESSION['user_id']) && isset($_SESSION['roles_system']) && is_array($_SESSION['roles_system'])) {
    if (in_array('ROLE_ADMIN', $_SESSION['roles_system'])) {
        $isAdmin = true;
    }
}

if (!$isAdmin) {
    http_response_code(403); // Forbidden
    echo json_encode(['success' => false, 'message' => 'Accès non autorisé.']);
    exit();
}


$response = [
    'success' => false,
    'totalPlatformRevenueOverall' => 0,
    'ridesPerDay' => [],
    'revenuePerDay' => []
];

try {
    $statsCollection = getPlatformStatsCollection();
    $analyticsCollection = getRideAnalyticsCollection();

    // 1. Récupérer le total des revenus de la plateforme
    $globalStatsDoc = $statsCollection->findOne(['_id' => 'globalMetrics']);
    if ($globalStatsDoc && isset($globalStatsDoc['totalPlatformRevenue'])) {
        $response['totalPlatformRevenueOverall'] = (float) $globalStatsDoc['totalPlatformRevenue'];
    }

    // 2. Agréger le nombre de trajets terminés par jour
    // On va chercher les 30 derniers jours 
    $daysLimit = new MongoDB\BSON\UTCDateTime(strtotime("-30 days") * 1000);

    $pipelineRidesPerDay = [
        [
            '$match' => [
                'eventType' => 'rideCompleted',
                'completedAt' => ['$gte' => $daysLimit] 
            ]
        ],
        [
            '$group' => [
                '_id' => '$dateDimension', // Group by dateDimension (YYYY-MM-DD string)
                'count' => ['$sum' => 1]
            ]
        ],
        [
            '$sort' => ['_id' => 1] // Trie par date croissante
        ],
        [
            '$project' => [ // Reformate la sortie pour être plus jolie
                '_id' => 0, // Ne pas inclure l'ancien _id (qui était la date)
                'date' => '$_id', // Renommer _id en 'date'
                'count' => '$count'
            ]
        ]
    ];
    $ridesPerDayCursor = $analyticsCollection->aggregate($pipelineRidesPerDay);
    $response['ridesPerDay'] = $ridesPerDayCursor->toArray();


    // 3. Agréger les revenus de la plateforme par jour
    $pipelineRevenuePerDay = [
        [
            '$match' => [
                'eventType' => 'platformRevenue',
                'collectedAt' => ['$gte' => $daysLimit] 
            ]
        ],
        [
            '$group' => [
                '_id' => '$dateDimension',
                'totalRevenue' => ['$sum' => '$revenueAmount']
            ]
        ],
        [
            '$sort' => ['_id' => 1]
        ],
        [
            '$project' => [
                '_id' => 0,
                'date' => '$_id',
                'totalRevenue' => '$totalRevenue'
            ]
        ]
    ];
    $revenuePerDayCursor = $analyticsCollection->aggregate($pipelineRevenuePerDay);
    $response['revenuePerDay'] = $revenuePerDayCursor->toArray();

    $response['success'] = true;
    http_response_code(200);

} catch (MongoDB\Driver\Exception\Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur MongoDB lors de la récupération des statistiques: " . $e->getMessage();
    error_log("Erreur get_admin_stats.php (MongoDB): " . $e->getMessage());
} catch (Exception $e) {
    http_response_code(500);
    $response['message'] = "Erreur générale lors de la récupération des statistiques: " . $e->getMessage();
    error_log("Erreur get_admin_stats.php (Générale): " . $e->getMessage());
}

echo json_encode($response);
?>