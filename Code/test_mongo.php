<?php
require_once __DIR__ . '/api/config/mongodb_config.php';

use MongoDB\BSON\UTCDateTime;

$client = getMongoClient();
$collection = $client->ecoride->logs; // BDD "ecoride", collection "logs"

$logEntry = [
    'timestamp' => new UTCDateTime(),
    'level' => 'INFO',
    'userId' => '123',
    'action' => 'LOGIN_SUCCESS',
    'message' => 'Test de log Mongo réussi.',
    'details' => [
        'ipAddress' => $_SERVER['REMOTE_ADDR'],
        'userAgent' => $_SERVER['HTTP_USER_AGENT'] ?? 'N/A'
    ]
];

$result = $collection->insertOne($logEntry);

echo "✅ Log inséré avec l’ID : " . $result->getInsertedId();
