<?php

require_once __DIR__ . '/config/settings.php';
require_once 'config/database.php';


header('Content-Type: application/json');
header('Access-Control-Allow-Origin: ' . CORS_ALLOWED_ORIGIN);
header('Access-Control-Allow-Methods: POST, GET, OPTIONS'); 
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée. Seule la méthode POST est acceptée.']);
    exit();
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$username = trim($input['username'] ?? '');
$firstName = trim($input['firstName'] ?? '');
$lastName = trim($input['lastName'] ?? '');
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? '';
$birthdate = $input['birthdate'] ?? '';
$phoneNumber = trim($input['phone'] ?? '');

$errors = [];

if (empty($username)) { $errors[] = "Le nom d'utilisateur est requis."; }
elseif (strlen($username) < 3) { $errors[] = "Le nom d'utilisateur doit contenir au moins 3 caractères."; }

if (empty($firstName)) { $errors[] = "Le prénom est requis."; }
elseif (strlen($firstName) < 2) { $errors[] = "Le prénom doit contenir au moins 2 caractères."; }

if (empty($lastName)) { $errors[] = "Le nom de famille est requis."; }
elseif (strlen($lastName) < 2) { $errors[] = "Le nom de famille doit contenir au moins 2 caractères."; }

if (empty($email)) { $errors[] = "L'email est requis."; }
elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors[] = "Le format de l'email est invalide."; }

if (empty($password)) { $errors[] = "Le mot de passe est requis."; }
elseif (strlen($password) < 8) { $errors[] = "Le mot de passe doit contenir au moins 8 caractères."; }

if (empty($birthdate)) { $errors[] = "La date de naissance est requise."; }

if (empty($phoneNumber)) { $errors[] = "Le numéro de téléphone est requis."; }

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation.', 'errors' => $errors]);
    exit();
}

// --- Si les données sont valides, procéder à l'insertion ---

// 1. Hasher le mot de passe
$password_hash = password_hash($password, PASSWORD_DEFAULT);

// 2. Préparer l'insertion dans la table `Users`
try {
    $pdo = getPDOConnection();

    // Commencer une transaction (si plusieurs requêtes doivent réussir ensemble)
    $pdo->beginTransaction();

    // Vérifier si username ou email existent déjà 
    $stmtCheck = $pdo->prepare("SELECT id FROM Users WHERE username = :username OR email = :email");
    $stmtCheck->bindParam(':username', $username);
    $stmtCheck->bindParam(':email', $email);
    $stmtCheck->execute();
    if ($stmtCheck->fetch()) {
        $pdo->rollBack(); // Annuler la transaction
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => `Le nom d''utilisateur ou l''email existe déjà.`]);
        exit();
    }

    $sqlUser = "INSERT INTO Users (first_name, last_name, username, email, password_hash, phone_number, birth_date, functional_role, account_status) 
                VALUES (:first_name, :last_name, :username, :email, :password_hash, :phone_number, :birth_date, :functional_role, :account_status)";
    
    $stmtUser = $pdo->prepare($sqlUser);

    // Valeurs par défaut pour les nouveaux utilisateurs
    $defaultFunctionalRole = 'passenger';
    $defaultAccountStatus = 'active';

    $stmtUser->bindParam(':first_name', $firstName);
    $stmtUser->bindParam(':last_name', $lastName);
    $stmtUser->bindParam(':username', $username);
    $stmtUser->bindParam(':email', $email);
    $stmtUser->bindParam(':password_hash', $password_hash);
    $stmtUser->bindParam(':phone_number', $phoneNumber);
    $stmtUser->bindParam(':birth_date', $birthdate);
    $stmtUser->bindParam(':functional_role', $defaultFunctionalRole);
    $stmtUser->bindParam(':account_status', $defaultAccountStatus);

    $stmtUser->execute();
    $newUserId = $pdo->lastInsertId(); // Récupérer l'ID de l'utilisateur nouvellement créé

    // 3. Assigner le rôle ROLE_USER
    $roleUserId = 1;
    $sqlUserRole = "INSERT INTO UserRoles (user_id, role_id) VALUES (:user_id, :role_id)";
    $stmtUserRole = $pdo->prepare($sqlUserRole);
    $stmtUserRole->bindParam(':user_id', $newUserId);
    $stmtUserRole->bindParam(':role_id', $roleUserId);
    $stmtUserRole->execute();

    // Valider la transaction
    $pdo->commit();

    // 4. Envoyer une réponse de succès
    http_response_code(201);
    echo json_encode([
        'success' => true, 
        'message' => 'Inscription réussie !', 
        'userId' => $newUserId // renvoyer l'ID du nouvel utilisateur
    ]);

} catch (PDOException $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack(); // Annuler la transaction en cas d'erreur
    }
    http_response_code(500);
    error_log("Erreur PDO lors de l'inscription : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => `Une erreur est survenue lors de l''inscription. Veuillez réessayer.`]);
} catch (Exception $e) {
    if ($pdo && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log("Erreur générale lors de l'inscription : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>