<?php

define('DB_HOST', 'localhost');
define('DB_NAME', 'ecoride');
define('DB_USER', 'ecoride_admin');
define('DB_PASS', '01v_.fGZ$A26');
define('DB_CHARSET', 'utf8mb4');

define('MONGO_URI', 'mongodb://localhost:27017'); 

define('CORS_ALLOWED_ORIGIN', 'http://ecoride.local');
define('APP_BASE_URL', 'http://ecoride.local');

define('SMTP_HOST', 'smtp.gmail.com');
define('SMTP_USERNAME', 'ecoride.ecf.dev@gmail.com');
define('SMTP_PASSWORD', 'nskmypmjzjmflaws');

if (file_exists(__DIR__ . '/settings.prod.php')) {
    require_once __DIR__ . '/settings.prod.php';
}

?>