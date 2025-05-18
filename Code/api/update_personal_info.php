<?php

if (session_status() == PHP_SESSION_NONE) {
    session_start();
}

require_once 'config/database.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); 
header('Access-Control-Allow-Methods: POST, OPTIONS'); 
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'message' => 'Méthode non autorisée.']);
    exit();
}

// 1. Vérifier si l'utilisateur est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Utilisateur non authentifié.']);
    exit();
}

$current_user_id = $_SESSION['user_id'];

// 2. Récupérer les données JSON envoyées
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Récupération des nouvelles informations et du mot de passe actuel
$firstName = trim($input['firstName'] ?? '');
$lastName = trim($input['lastName'] ?? '');
$username = trim($input['username'] ?? '');
$email = trim($input['email'] ?? '');
$birthdate = $input['birthdate'] ?? null; // Format AAAA-MM-JJ
$phoneNumber = trim($input['phone'] ?? '');
$currentPassword = $input['currentPassword'] ?? ''; // Mot de passe actuel pour vérification

// --- Validation serveur des nouvelles données ET du mot de passe actuel ---
$errors = [];

// 1. Valider le mot de passe actuel
if (empty($currentPassword)) {
    $errors['currentPassword'] = "Le mot de passe actuel est requis pour confirmer les modifications.";
} else {
    // Récupérer le hash du mot de passe actuel de l'utilisateur en BDD
    try {
        $pdo = getPDOConnection();
        $stmtCheckPass = $pdo->prepare("SELECT password_hash FROM Users WHERE id = :user_id");
        $stmtCheckPass->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtCheckPass->execute();
        $user_db_data = $stmtCheckPass->fetch(PDO::FETCH_ASSOC);

        if (!$user_db_data || !password_verify($currentPassword, $user_db_data['password_hash'])) {
            $errors['currentPassword'] = "Le mot de passe actuel est incorrect.";
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO (update_personal_info.php - vérif mdp) : " . $e->getMessage());
        $errors['database'] = "Erreur serveur lors de la vérification des informations.";
        // Si une erreur BDD survient ici, on arrête et renvoie les erreurs collectées
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Erreur serveur.', 'errors' => $errors]);
        exit();
    }
}

// 2. Valider les nouvelles informations personnelles
// Prenom
if (empty($firstName)) { $errors['firstName'] = "Le prénom est requis."; }
elseif (strlen($firstName) < 2) { $errors['firstName'] = "Prénom trop court (min 2 caractères)."; }
elseif (strlen($firstName) > 100) { $errors['firstName'] = "Prénom trop long (max 100 caractères)."; }

// Nom
if (empty($lastName)) { $errors['lastName'] = "Le nom est requis."; }
elseif (strlen($lastName) < 2) { $errors['lastName'] = "Nom trop court (min 2 caractères)."; }
elseif (strlen($lastName) > 100) { $errors['lastName'] = "Nom trop long (max 100 caractères)."; }

// Username (si modifié, vérifier l'unicité par rapport aux AUTRES utilisateurs)
if (empty($username)) { $errors['username'] = "Le pseudo est requis."; }
elseif (strlen($username) < 3) { $errors['username'] = "Pseudo trop court (min 3 caractères)."; }
elseif (strlen($username) > 50) { $errors['username'] = "Pseudo trop long (max 50 caractères)."; }
else {
    // Vérifier l'unicité du nouveau username, on vérifie juste s'il existe pour un AUTRE user_id
    if (!isset($pdo)) { $pdo = getPDOConnection(); } 
    try {
        $stmtCheckUsername = $pdo->prepare("SELECT id FROM Users WHERE username = :username AND id != :user_id");
        $stmtCheckUsername->bindParam(':username', $username);
        $stmtCheckUsername->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtCheckUsername->execute();
        if ($stmtCheckUsername->fetch()) {
            $errors['username'] = "Ce pseudo est déjà utilisé.";
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO (update_personal_info.php - check username) : " . $e->getMessage());
        $errors['database'] = "Erreur serveur validation pseudo.";
    }
}

// Email (si modifié, vérifier l'unicité par rapport aux AUTRES utilisateurs)
if (empty($email)) { $errors['email'] = "L'email est requis."; }
elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) { $errors['email'] = "Format email invalide."; }
elseif (strlen($email) > 255) { $errors['email'] = "Email trop long (max 255 caractères)."; }
else {
    if (!isset($pdo)) { $pdo = getPDOConnection(); }
    try {
        $stmtCheckEmail = $pdo->prepare("SELECT id FROM Users WHERE email = :email AND id != :user_id");
        $stmtCheckEmail->bindParam(':email', $email);
        $stmtCheckEmail->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);
        $stmtCheckEmail->execute();
        if ($stmtCheckEmail->fetch()) {
            $errors['email'] = "Cet email est déjà utilisé.";
        }
    } catch (PDOException $e) {
        error_log("Erreur PDO (update_personal_info.php - check email) : " . $e->getMessage());
        $errors['database'] = "Erreur serveur validation email.";
    }
}

// Phone Number 
$phoneRegex = '/^(0[1-79])\d{8}$/'; 
if (empty($phoneNumber)) { $errors['phone'] = "Le téléphone est requis."; }
elseif (!preg_match($phoneRegex, $phoneNumber)) { $errors['phone'] = "Format téléphone incorrect (ex: 0612345678)."; }
elseif (strlen($phoneNumber) > 20) { $errors['phone'] = "Téléphone trop long (max 20 caractères)."; }

// Birthdate
if (empty($birthdate)) { $errors['birthdate'] = "La date de naissance est requise."; }
elseif ($birthdate !== null) { 
    $dateParts = explode('-', $birthdate);
    if (count($dateParts) !== 3 || !checkdate((int)$dateParts[1], (int)$dateParts[2], (int)$dateParts[0])) {
        $errors['birthdate'] = "Format date de naissance invalide (AAAA-MM-JJ).";
    } else {
        $today = new DateTime();
        $birthDateObj = DateTime::createFromFormat('Y-m-d', $birthdate);
        if ($birthDateObj > $today) {
            $errors['birthdate'] = "La date de naissance ne peut pas être dans le futur.";
        } else {
            $age = $today->diff($birthDateObj)->y;
            if ($age < 16) {
                $errors['birthdate'] = "Vous devez avoir au moins 16 ans.";
            }
        }
    }
}


// 3. Si des erreurs de validation sont présentes, les renvoyer
if (!empty($errors)) {
    http_response_code(400); // Bad Request
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation des données.', 'errors' => $errors]);
    exit();
}

try { // Pour simplifier, on va mettre à jour tous les champs, même s'ils n'ont pas changé.
    $sql = "UPDATE Users 
            SET first_name = :first_name, 
                last_name = :last_name, 
                username = :username, 
                email = :email, 
                phone_number = :phone_number, 
                birth_date = :birth_date
            WHERE id = :user_id"; 
            // On ne met PAS à jour les crédits, le statut du compte, ou les préférences ici.
    
    $stmt = $pdo->prepare($sql);

    $stmt->bindParam(':first_name', $firstName);
    $stmt->bindParam(':last_name', $lastName);
    $stmt->bindParam(':username', $username);
    $stmt->bindParam(':email', $email);
    $stmt->bindParam(':phone_number', $phoneNumber);
    $stmt->bindParam(':birth_date', $birthdate); // Sera null si l'utilisateur a vidé le champ et qu'on l'a traité
    $stmt->bindParam(':user_id', $current_user_id, PDO::PARAM_INT);

    if ($stmt->execute()) {
        // Mettre à jour les informations dans la session PHP pour une cohérence immédiate
        // si ces informations sont utilisées ailleurs depuis la session.
        $_SESSION['username'] = $username; 
        $_SESSION['first_name'] = $firstName;
        $_SESSION['email'] = $email;

        // Récupérer les données utilisateur mises à jour pour les renvoyer
        $updatedUserData = [
            'first_name' => $firstName,
            'last_name' => $lastName,
            'username' => $username,
            'email' => $email,
            'phone_number' => $phoneNumber,
            'birth_date' => $birthdate
        ];

        http_response_code(200);
        echo json_encode([
            'success' => true,
            'message' => 'Informations personnelles mises à jour avec succès.',
            'updated_user_info' => $updatedUserData 
        ]);
    } else {
        http_response_code(500);
        echo json_encode(['success' => false, 'message' => 'Échec de la mise à jour des informations en base de données.']);
    }

} catch (PDOException $e) { // Ce catch doit englober aussi la logique d'UPDATE
    http_response_code(500);
    // Gérer les erreurs de contrainte d'unicité pour username/email si elles surviennent ici
    // (normalement attrapées par la validation en amont, mais par sécurité)
    if (isset($e->errorInfo[1]) && $e->errorInfo[1] == 1062) { 
        error_log("Erreur PDO (update_personal_info.php) - Doublon : " . $e->getMessage());
        // Gérer les erreurs de doublon
        echo json_encode(['success' => false, 'message' => 'Un conflit de données est survenu (ex: pseudo ou email déjà utilisé).']);
    } else {
        error_log("Erreur PDO (update_personal_info.php) : " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la mise à jour des informations.']);
    }
} catch (Exception $e) { // Catch générique
    http_response_code(500);
    error_log("Erreur générale (update_personal_info.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}

?>