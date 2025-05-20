<?php
require_once __DIR__ . '/config/mongodb_config.php'; // à créer

use MongoDB\Client;

function logEvent($level, $action, $message, $userId = null, $details = []) {
    try {
        global $mongoClient;
        $logsCollection = $mongoClient->ecoride->logs;

        $log = [
            'timestamp' => new MongoDB\BSON\UTCDateTime(), 
            'level' => $level,
            'action' => $action,
            'message' => $message,
            'userId' => $userId,
            'details' => $details
        ];

        $logsCollection->insertOne($log);

    } catch (Exception $e) {
        error_log("Erreur lors de l'enregistrement du log MongoDB : " . $e->getMessage());
    }
}
