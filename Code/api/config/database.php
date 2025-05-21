<?php

// Paramètres de connexion à la base de données
define('DB_HOST', 'localhost'); 
define('DB_NAME', 'ecoride');
define('DB_USER', 'ecoride_admin');
define('DB_PASS', '01v_.fGZ$A26'); 
define('DB_CHARSET', 'utf8mb4');

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
            // En cas d'erreur de connexion:
            // En phase de développement, il est utile de voir l'erreur.
            // En production, il faudra logger cette erreur de manière sécurisée et afficher un message générique à l'utilisateur.
            error_log("Erreur de connexion PDO : " . $e->getMessage()); // Log l'erreur 
            // Arrête le script avec un message d'erreur.
            die("Erreur critique : Impossible de se connecter à la base de données. Veuillez contacter l'administrateur.");
        }
    }
    return $pdo; // Retourne l'objet de connexion PDO
}

/*
// --- Section de test simple ---
http://localhost/chemin_vers_ton_projet/api/config/database.php
*/

// echo "Tentative de connexion...<br>";
// try {
//     $db = getPDOConnection();
//     if ($db) {
//         echo "Connexion à la base de données '" . DB_NAME . "' réussie via PDO !<br>";
//         // Optionnel: faire une petite requête simple pour être sûr
//         // $stmt = $db->query("SELECT DATABASE();");
//         // $currentDb = $stmt->fetchColumn();
//         // echo "Base de données actuelle sélectionnée par PDO : " . $currentDb;
//     } else {
//         echo "getPDOConnection() a retourné null, ce qui ne devrait pas arriver si aucune exception n'est levée.";
//     }
// } catch (\PDOException $e) {
//     echo "Échec de la connexion lors du test : " . $e->getMessage();
// }
?>