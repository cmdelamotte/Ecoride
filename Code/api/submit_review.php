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

// 1. Vérifier si l'utilisateur (l'auteur de l'avis) est connecté
if (!isset($_SESSION['user_id'])) {
    http_response_code(401); 
    echo json_encode(['success' => false, 'message' => 'Authentification requise pour soumettre un avis.']);
    exit();
}

$author_id = (int)$_SESSION['user_id'];

// 2. Récupérer les données JSON envoyées
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

$ride_id = filter_var($input['ride_id'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1]]);
$rating = filter_var($input['rating'] ?? null, FILTER_VALIDATE_INT, ['options' => ['min_range' => 1, 'max_range' => 5]]);
$comment = isset($input['comment']) ? trim($input['comment']) : null;
$trip_experience_good = filter_var($input['trip_experience_good'] ?? true, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
$report_comment = null;
if ($trip_experience_good === false && isset($input['report_comment'])) {
    $report_comment = trim($input['report_comment']);
}

// --- Validation serveur ---
$errors = [];
$pdo = getPDOConnection();
$driver_id = null; // Pour stocker l'ID du chauffeur du trajet

if (!$ride_id) {
    $errors['ride_id'] = "ID du trajet manquant ou invalide.";
} else {
    // Vérifier si le trajet existe, s'il est terminé, et si l'utilisateur y a participé (et n'est pas le chauffeur)
    // Et récupérer l'ID du chauffeur
    $stmtCheckRide = $pdo->prepare(
        "SELECT r.driver_id, r.ride_status, b.id as booking_id 
                FROM Rides r
                LEFT JOIN Bookings b ON r.id = b.ride_id AND b.user_id = :author_id AND b.booking_status = 'confirmed'
                WHERE r.id = :ride_id"
    );
    $stmtCheckRide->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtCheckRide->bindParam(':author_id', $author_id, PDO::PARAM_INT);
    $stmtCheckRide->execute();
    $ride_info = $stmtCheckRide->fetch(PDO::FETCH_ASSOC);

    if (!$ride_info) {
        $errors['ride_id'] = "Trajet non trouvé.";
    } else {
        $driver_id = (int)$ride_info['driver_id'];
        if ($driver_id === $author_id) {
            $errors['general'] = "Vous ne pouvez pas laisser d'avis sur votre propre trajet.";
        }
        if ($ride_info['ride_status'] !== 'completed') {
            $errors['ride_id'] = "Vous ne pouvez laisser un avis que pour un trajet terminé.";
        }
        if (!$ride_info['booking_id']) { // Vérifie si l'auteur était un passager confirmé
            $errors['general'] = "Vous devez avoir participé à ce trajet pour laisser un avis.";
        }
        
        // Vérifier si un avis n'a pas déjà été soumis par cet auteur pour ce trajet/chauffeur
        $stmtCheckExistingReview = $pdo->prepare(
            "SELECT id FROM Reviews WHERE ride_id = :ride_id AND author_id = :author_id"
        );
        $stmtCheckExistingReview->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtCheckExistingReview->bindParam(':author_id', $author_id, PDO::PARAM_INT);
        $stmtCheckExistingReview->execute();
        if ($stmtCheckExistingReview->fetch()) {
            $errors['general'] = "Vous avez déjà soumis un avis pour ce trajet.";
        }
    }
}

if ($rating === null || $rating === false) { // filter_var retourne false si non valide
    $errors['rating'] = "Une note entre 1 et 5 est requise.";
}
// Commentaire est optionnel, mais si fourni, on peut limiter sa longueur
if ($comment !== null && strlen($comment) > 1000) {
    $errors['comment'] = "Le commentaire est trop long (max 1000 caractères).";
}
if ($trip_experience_good === null) { // Si FILTER_NULL_ON_FAILURE a retourné null
    $errors['trip_experience_good'] = "Indication sur le déroulement du trajet invalide.";
}
if ($trip_experience_good === false && empty($report_comment)) {
    $errors['report_comment'] = "Veuillez décrire le problème si le trajet s'est mal passé.";
} elseif ($trip_experience_good === false && $report_comment !== null && strlen($report_comment) > 1000) {
    $errors['report_comment'] = "La description du problème est trop longue (max 1000 caractères).";
}


if (!empty($errors)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'message' => 'Erreurs de validation.', 'errors' => $errors]);
    exit();
}

// Si toutes les validations sont OK :
try {
    $pdo->beginTransaction();

    // Insérer l'avis
    $review_status = 'pending_approval'; 
    $sqlInsertReview = "INSERT INTO Reviews (ride_id, author_id, driver_id, rating, comment, review_status, submission_date) 
                        VALUES (:ride_id, :author_id, :driver_id, :rating, :comment, :review_status, NOW())";
    $stmtReview = $pdo->prepare($sqlInsertReview);
    $stmtReview->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
    $stmtReview->bindParam(':author_id', $author_id, PDO::PARAM_INT);
    $stmtReview->bindParam(':driver_id', $driver_id, PDO::PARAM_INT);
    $stmtReview->bindParam(':rating', $rating, PDO::PARAM_INT);
    $stmtReview->bindParam(':comment', $comment); 
    $stmtReview->bindParam(':review_status', $review_status, PDO::PARAM_STR);
    $stmtReview->execute();
    $newReviewId = $pdo->lastInsertId();

    // Si le trajet s'est mal passé, insérer un signalement
    if ($trip_experience_good === false && !empty($report_comment)) {
        $report_status = 'new';
        $sqlInsertReport = "INSERT INTO Reports (ride_id, reporter_id, reported_driver_id, reason, report_status)
                            VALUES (:ride_id, :reporter_id, :reported_driver_id, :reason, :report_status)";
        $stmtReport = $pdo->prepare($sqlInsertReport);
        $stmtReport->bindParam(':ride_id', $ride_id, PDO::PARAM_INT);
        $stmtReport->bindParam(':reporter_id', $author_id, PDO::PARAM_INT);
        $stmtReport->bindParam(':reported_driver_id', $driver_id, PDO::PARAM_INT);
        $stmtReport->bindParam(':reason', $report_comment);
        $stmtReport->bindParam(':report_status', $report_status, PDO::PARAM_STR);
        $stmtReport->execute();
    }

    $pdo->commit();

    http_response_code(201);
    echo json_encode([
        'success' => true, 
        'message' => 'Votre avis a été soumis et est en attente de modération.' . ($trip_experience_good === false ? ' Un signalement a également été créé.' : ''),
        'review_id' => $newReviewId
    ]);

} catch (PDOException $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    error_log("Erreur PDO (submit_review.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Erreur serveur lors de la soumission de l\'avis.']);
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(500);
    error_log("Erreur générale (submit_review.php) : " . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Une erreur inattendue est survenue.']);
}
?>