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
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode GET est acceptée pour récupérer les marques.']);
    exit();
}

$response = ['success' => false, 'brands' => []];

try {
    $pdo = getPDOConnection();

    // Récupérer toutes les marques, triées par nom pour un affichage ordonné
    $sql = "SELECT id, name FROM Brands ORDER BY name ASC";
    $stmt = $pdo->query($sql);

    // fetchAll() récupère toutes les lignes de résultat
    $brands = $stmt->fetchAll(PDO::FETCH_ASSOC);

    if ($brands) {
        $response['success'] = true;
        $response['brands'] = $brands;
        http_response_code(200); // OK
    } else {
        // Même si la table est vide, ce n'est pas une erreur serveur.
        // On renvoie un succès mais avec un tableau de marques vide.
        $response['success'] = true;
        $response['brands'] = [];
        http_response_code(200);
    }

} catch (PDOException $e) {
    http_response_code(500);
    error_log("Erreur PDO (get_brands.php) : " . $e->getMessage());
    $response['message'] = 'Erreur serveur lors de la récupération des marques.';
} catch (Exception $e) {
    http_response_code(500);
    error_log("Erreur générale (get_brands.php) : " . $e->getMessage());
    $response['message'] = 'Une erreur inattendue est survenue.';
}

echo json_encode($response);
?>