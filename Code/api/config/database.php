<?php

require_once __DIR__ . '/settings.php';

// Options pour PDO
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION, 
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,     
    PDO::ATTR_EMULATE_PREPARES   => false,                
];

// Data Source Name (DSN)
$dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=" . DB_CHARSET;

/**
 * Fonction pour obtenir une instance de connexion PDO.
 * Utilise un pattern Singleton simple pour ne créer la connexion qu'une fois.
 * @return PDO L'instance de PDO.
 * @throws PDOException Si la connexion échoue.
 */
function getPDOConnection() {
    static $pdo = null; 

    if ($pdo === null) { // Si la connexion n'a pas encore été établie
        global $dsn, $options; // Accède aux variables $dsn et $options définies plus haut
        
        try {
            // Crée l'instance de PDO
            $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
        } catch (\PDOException $e) {
            error_log("Erreur de connexion PDO : " . $e->getMessage());
            if (defined('APP_ENV') && APP_ENV === 'production') {
                http_response_code(503);
                echo json_encode(['success' => false, 'message' => 'Erreur de connexion à la base de données. Veuillez réessayer plus tard.']);
                exit;
            } else {
                die("Erreur critique BDD (PDO). Vérifiez les logs serveur et la configuration. Message: " . $e->getMessage());
            }
        }
    }
    return $pdo;
}
?>