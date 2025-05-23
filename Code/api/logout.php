<?php

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
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée pour la déconnexion.']);
    exit();
}

// --- Logique de déconnexion ---

// 1. Vider le tableau de session $_SESSION
session_unset();

// 2. Détruire le cookie de session côté client
if (ini_get("session.use_cookies")) { // Vérifie si les sessions utilisent des cookies
    $params = session_get_cookie_params(); // Récupère les paramètres du cookie de session
    setcookie(
        session_name(), // Nom du cookie de session 
        '',
        time() - 42000, // Timestamp d'expiration dans le passé
        $params["path"],
        $params["domain"],
        $params["secure"],
        $params["httponly"]
    );
}

// 3. Détruire la session côté serveur
session_destroy();

// 4. Renvoyer une réponse de succès
http_response_code(200); // OK
echo json_encode(['success' => true, 'message' => 'Déconnexion réussie.']);
exit();

?>