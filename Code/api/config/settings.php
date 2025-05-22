<?php
// --- VALEURS PAR DÉFAUT (pour environnement local) ---

// Base de données MySQL Locale
$db_host_val = 'localhost';
$db_name_val = 'ecoride';
$db_user_val = 'ecoride_admin';
$db_pass_val = '01v_.fGZ$A26';
$db_charset_val = 'utf8mb4';

// MongoDB Local
$mongo_uri_val = 'mongodb://localhost:27017/ecoride';

// SMTP (Gmail pour le développement)
$smtp_host_val = 'smtp.gmail.com';
$smtp_username_val = 'ecoride.ecf.dev@gmail.com';
$smtp_password_val = 'nskmypmjzjmflaws'; // Ton mot de passe d'application Gmail

// URLs de l'application
$app_base_url_val = 'http://ecoride.local'; // Ton URL locale
$cors_allowed_origin_val = 'http://ecoride.local'; // Pour le développement

// Environnement (optionnel, mais utile)
$app_env_val = 'development';

// --- CHARGEMENT DE LA CONFIGURATION DE PRODUCTION
if (file_exists(__DIR__ . '/settings.prod.php')) {
    require_once __DIR__ . '/settings.prod.php';
}

// --- DÉFINITION DES CONSTANTES
// Elles utiliseront les valeurs des variables (locales ou surchargées par settings.prod.php)

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