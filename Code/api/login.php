<?php

if (session_status() == PHP_SESSION_NONE) { // Vérifie si une session n'est pas déjà active
    session_start();
}

// Inclure le fichier de configuration de la base de données
require_once 'config/database.php';

// Définir le type de contenu de la réponse en JSON
header('Content-Type: application/json');
// Autoriser les requêtes Cross-Origin (CORS) - pour le développement
header('Access-Control-Allow-Origin: *'); // À sécuriser en production
header('Access-Control-Allow-Methods: POST, OPTIONS'); // Méthodes autorisées
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
// Important pour la gestion des sessions avec fetch et les requêtes cross-origin si besoin :

// Gérer les requêtes OPTIONS (pré-vérification CORS)
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// S'assurer que la requête est de type POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405); // Method Not Allowed
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée pour la connexion.']);
    exit();
}

// Récupérer les données envoyées en JSON depuis le corps de la requête
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE); // Convertit le JSON en tableau associatif PHP

// Validation basique des entrées
$identifier = trim($input['identifier'] ?? ''); // Peut être username ou email
$password = $input['password'] ?? '';

$errors = [];
if (empty($identifier)) { 
    $errors[] = "L'identifiant (pseudo ou email) est requis."; 
}
if (empty($password)) { 
    $errors[] = "Le mot de passe est requis."; 
}

if (!empty($errors)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Données invalides fournies.', 'errors' => $errors]);
    exit();
}

try {
    $pdo = getPDOConnection(); // Récupère la connexion PDO depuis database.php

    // Rechercher l'utilisateur par username OU par email
    // On récupère aussi les rôles via une jointure et GROUP_CONCAT
    $sql = "SELECT u.id, u.username, u.email, u.first_name, u.last_name, u.password_hash, 
                u.credits, u.functional_role, u.account_status,
                GROUP_CONCAT(r.name) AS roles_system
            FROM Users u
            LEFT JOIN UserRoles ur ON u.id = ur.user_id
            LEFT JOIN Roles r ON ur.role_id = r.id
            WHERE (u.username = :username_identifier OR u.email = :email_identifier)
            GROUP BY u.id";
            
    $stmt = $pdo->prepare($sql);
    $stmt->bindParam(':username_identifier', $identifier);
    $stmt->bindParam(':email_identifier', $identifier);
    $stmt->execute();
    
    $user = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$user) {
        // Utilisateur non trouvé
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Identifiant ou mot de passe incorrect.']);
        exit();
    }

    if ($user['account_status'] === 'suspended') {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Votre compte est actuellement suspendu. Veuillez contacter le support.']);
        exit();
    }

    // Vérifier le mot de passe
    if (password_verify($password, $user['password_hash'])) {
        // Mot de passe correct et compte actif
        
        // Stocker les informations essentielles en session PHP
        $_SESSION['user_id'] = (int) $user['id']; // S'assurer que l'ID est un entier
        $_SESSION['username'] = $user['username'];
        $_SESSION['first_name'] = $user['first_name'];
        $_SESSION['last_name'] = $user['last_name'];
        // Convertir la chaîne de rôles système en tableau
        $_SESSION['roles_system'] = $user['roles_system'] ? explode(',', $user['roles_system']) : [];
        $_SESSION['functional_role'] = $user['functional_role'];
        
        // Préparer les données utilisateur à renvoyer au frontend
        // Il est crucial de ne PAS renvoyer le hash du mot de passe !
        $userDataForFrontend = [
            'id' => (int) $user['id'],
            'username' => $user['username'],
            'email' => $user['email'],
            'firstName' => $user['first_name'],
            'lastName' => $user['last_name'],
            'credits' => (float) $user['credits'], // S'assurer que c'est un nombre
            'functional_role' => $user['functional_role'],
            'roles_system' => $_SESSION['roles_system'] // Utiliser le tableau de la session
        ];
        
        http_response_code(200); // OK
        echo json_encode([
            'success' => true, 
            'message' => 'Connexion réussie !',
            'user' => $userDataForFrontend
        ]);

    } else {
        // Mot de passe incorrect
        http_response_code(401);
        echo json_encode(['success' => false, 'message' => 'Identifiant ou mot de passe incorrect.']);
    }

    } catch (PDOException $e) {
        http_response_code(500);
        error_log("Erreur PDO lors de la connexion (login.php) : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la tentative de connexion. Veuillez réessayer.']);
    } catch (Exception $e) { // Pour attraper d'autres types d'erreurs potentielles
        http_response_code(500);
        error_log("Erreur générale lors de la connexion (login.php) : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue lors de la connexion.']);
    }
?>