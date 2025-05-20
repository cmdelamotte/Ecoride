<?php
require_once __DIR__ . '/../../vendor/autoload.php';

use MongoDB\Client;

function getMongoClient(): Client {
    return new Client("mongodb://localhost:27017");
}
