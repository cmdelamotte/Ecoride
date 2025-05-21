<?php
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/settings.php';

use MongoDB\Client;

function getMongoClient(): Client {
    return new Client(MONGO_URI);
}
?>