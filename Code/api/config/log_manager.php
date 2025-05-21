<?php
// require_once __DIR__ . 'mongodb_config.php';

// function logEvent(string $level, ?int $userId, string $action, string $message, array $details = []): ?string {
//     try {
//         global $mongoClient;
//         $collection = $mongoClient->ecoride_logs->logs; // Base "ecoride_logs", collection "logs"

//         $logDocument = [
//             'timestamp' => new MongoDB\BSON\UTCDateTime(), // Heure actuelle en UTC
//             'level' => strtoupper($level), // INFO, ERROR, etc.
//             'userId' => $userId,
//             'action' => $action,
//             'message' => $message,
//             'details' => $details
//         ];

//         $insertResult = $collection->insertOne($logDocument);
//         return (string) $insertResult->getInsertedId(); // Renvoie l’ID MongoDB du log inséré

//     } catch (Exception $e) {
//         error_log("Erreur lors de l'insertion du log MongoDB : " . $e->getMessage());
//         return null;
//     }
// }
