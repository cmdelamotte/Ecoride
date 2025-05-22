<?php

// VALEURS PAR DÉFAUT POUR UN ENVIRONNEMENT DE DÉVELOPPEMENT
// Ces valeurs seront surchargées par settings.local.php (non versionné pour le local)
// ou par settings.prod.php en production (non versionné).

$db_host_val = 'YOUR_LOCAL_DB_HOST'; 
$db_name_val = 'YOUR_LOCAL_DB_NAME'; 
$db_user_val = 'YOUR_LOCAL_DB_USER'; 
$db_pass_val = 'YOUR_LOCAL_DB_PASSWORD'; 
$db_charset_val = 'utf8mb4';

$mongo_uri_val = 'mongodb://YOUR_LOCAL_MONGO_HOST:27017/YOUR_LOCAL_MONGO_DB_NAME';

$smtp_host_val = 'YOUR_SMTP_HOST';         
$smtp_username_val = 'YOUR_SMTP_USERNAME'; 
$smtp_password_val = 'YOUR_SMTP_PASSWORD'; 

$app_base_url_val = 'http://YOUR_LOCAL_APP_URL'; 
$cors_allowed_origin_val = 'http://YOUR_LOCAL_CORS_ORIGIN'; 
$app_env_val = 'development'; 

if (file_exists(__DIR__ . '/settings.local.php')) {
    require_once __DIR__ . '/settings.local.php';
}


if (file_exists(__DIR__ . '/settings.prod.php')) {
    require_once __DIR__ . '/settings.prod.php';
}

// DÉFINITION DES CONSTANTES
if (!defined('APP_ENV')) define('APP_ENV', $app_env_val);
if (!defined('DB_HOST')) define('DB_HOST', $db_host_val);
if (!defined('DB_NAME')) define('DB_NAME', $db_name_val);
if (!defined('DB_USER')) define('DB_USER', $db_user_val);
if (!defined('DB_PASS')) define('DB_PASS', $db_pass_val);
if (!defined('DB_CHARSET')) define('DB_CHARSET', $db_charset_val);
if (!defined('MONGO_URI')) define('MONGO_URI', $mongo_uri_val);
if (!defined('SMTP_HOST')) define('SMTP_HOST', $smtp_host_val);
if (!defined('SMTP_USERNAME')) define('SMTP_USERNAME', $smtp_username_val);
if (!defined('SMTP_PASSWORD')) define('SMTP_PASSWORD', $smtp_password_val);
if (!defined('APP_BASE_URL')) define('APP_BASE_URL', $app_base_url_val);
if (!defined('CORS_ALLOWED_ORIGIN')) define('CORS_ALLOWED_ORIGIN', $cors_allowed_origin_val);
?>