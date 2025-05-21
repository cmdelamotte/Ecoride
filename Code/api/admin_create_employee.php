<?php

require_once __DIR__ . '/config/database.php';

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Vérification du rôle Admin
$isAdmin = false;
if (isset($_SESSION['user_id']) && isset($_SESSION['roles_system']) && is_array($_SESSION['roles_system'])) {
    if (in_array('ROLE_ADMIN', $_SESSION['roles_system'])) {
        $isAdmin = true;
    }
}

if (!$isAdmin) {
    http_response_code(403);
    echo json_encode(['success' => false, 'message' => 'Accès non autorisé.']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Récupération et validation des données (côté serveur)
$firstName = trim($input['first_name'] ?? '');
$lastName = trim($input['last_name'] ?? '');
$username = trim($input['username'] ?? ''); // Le JS génère un pseudo
$email = trim($input['email'] ?? '');
$password = $input['password'] ?? ''; // Mot de passe en clair

$errors = [];
if (empty($firstName) || strlen($firstName) < 2) { $errors['first_name'] = "Prénom requis (2 caractères min)."; }
if (empty($lastName) || strlen($lastName) < 2) { $errors['last_name'] = "Nom requis (2 caractères min)."; }
if (empty($username)) { $errors['username'] = "Pseudo requis."; } // Peut être généré plus robustement ici aussi
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors['email'] = "Email invalide ou requis."; }
if (empty($password) || strlen($password) < 8) { $errors['password'] = "Mot de passe requis (8 caractères min)."; }

if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Données invalides.', 'errors' => $errors]);
    exit();
}

$pdo = getPDOConnection(); // Pour la transaction

try {
    $pdo->beginTransaction();

    // Vérifier si username ou email existent déjà
    $stmtCheck = $pdo->prepare("SELECT id FROM Users WHERE username = :username OR email = :email");
    $stmtCheck->bindParam(':username', $username);
    $stmtCheck->bindParam(':email', $email);
    $stmtCheck->execute();
    if ($stmtCheck->fetch()) {
        $pdo->rollBack();
        http_response_code(409); // Conflict
        echo json_encode(['success' => false, 'message' => 'Ce pseudo ou cet email est déjà utilisé.']);
        exit();
    }

    // Hasher le mot de passe
    $password_hash = password_hash($password, PASSWORD_DEFAULT);

    // Insérer dans la table Users
    $sqlUser = "INSERT INTO Users (first_name, last_name, username, email, password_hash, phone_number, birth_date, functional_role, account_status) 
                VALUES (:first_name, :last_name, :username, :email, :password_hash, :phone_number, :birth_date, :functional_role, :account_status)";
    
    $stmtUser = $pdo->prepare($sqlUser);

    // Valeurs pour un employé
    // Un employé a besoin d'un numéro de téléphone et d'une date de naissance fictifs pour respecter la contrainte NOT NULL de la table Users
    // TODO : Créer les champs dans le formulaire, pour l'instant : placeholders
    $defaultPhoneNumber = '0000000000'; 
    $defaultBirthDate = '1970-01-01';  
    $defaultFunctionalRole = 'passenger'; // Rôle par défaut de la table users, vrai userRole attribué ensuite
    $defaultAccountStatus = 'active';

    $stmtUser->bindParam(':first_name', $firstName);
    $stmtUser->bindParam(':last_name', $lastName);
    $stmtUser->bindParam(':username', $username);
    $stmtUser->bindParam(':email', $email);
    $stmtUser->bindParam(':password_hash', $password_hash);
    $stmtUser->bindParam(':phone_number', $defaultPhoneNumber);
    $stmtUser->bindParam(':birth_date', $defaultBirthDate);
    $stmtUser->bindParam(':functional_role', $defaultFunctionalRole);
    $stmtUser->bindParam(':account_status', $defaultAccountStatus);

    $stmtUser->execute();
    $newUserId = $pdo->lastInsertId();

    // Assigner le rôle ROLE_EMPLOYEE (ID 2)
    $roleEmployeeId = 2;
    $sqlUserRole = "INSERT INTO UserRoles (user_id, role_id) VALUES (:user_id, :role_id)";
    $stmtUserRole = $pdo->prepare($sqlUserRole);
    $stmtUserRole->bindParam(':user_id', $newUserId, PDO::PARAM_INT);
    $stmtUserRole->bindParam(':role_id', $roleEmployeeId, PDO::PARAM_INT);
    $stmtUserRole->execute();

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'success' => true, 
        'message' => 'Compte employé créé avec succès !', 
        'employee' => [ 
            'id' => 'EMP' . str_pad($newUserId, 3, '0', STR_PAD_LEFT),
            'nom' => $lastName,
            'prenom' => $firstName,
            'email' => $email,
            'statut' => ucfirst($defaultAccountStatus)
        ]
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log("Erreur PDO (admin_create_employee.php): " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la création de l\'employé.']);
} catch (Exception $e) {
    if (isset($pdo) && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    http_response_code(500);
    error_log("Erreur Générale (admin_create_employee.php): " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}
?>