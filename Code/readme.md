# EcoRide - Plateforme de Covoiturage Responsable

EcoRide est une application web de covoiturage conçue pour encourager une mobilité plus écologique et économique. Ce projet a été réalisé dans le cadre de l'Évaluation en Cours de Formation (ECF) pour le titre professionnel Développeur Web et Web Mobile.

**Lien vers l'application déployée :** [https://cmdecoride.alwaysdata.net]

## Fonctionnalités Principales

* Inscription et connexion des utilisateurs (clients, employés, administrateurs).
* Recherche de trajets par ville de départ, d'arrivée et date.
* Filtrage des trajets (prix, durée, écologique, animaux, etc.).
* Pagination des résultats de recherche.
* Suggestion de date proche si aucun trajet n'est trouvé pour la date initiale.
* Publication de trajets pour les chauffeurs (avec sélection de véhicule).
* Gestion de profil utilisateur (informations personnelles, mot de passe, rôle fonctionnel).
* Gestion des véhicules par les chauffeurs (CRUD).
* Réservation de places sur les trajets par les passagers (avec gestion des crédits).
* Historique des trajets pour les passagers et les chauffeurs.
* Annulation de réservations et de trajets (avec notifications email).
* Démarrage et finalisation des trajets par les chauffeurs.
* Système d'avis et de notation des chauffeurs par les passagers après un trajet.
* Formulaire de contact.
* **Dashboard Employé :**
    * Modération des avis (validation/refus).
    * Consultation des signalements de trajets.
    * Logique de crédit chauffeur liée à l'approbation des avis.
* **Dashboard Administrateur :**
    * Affichage de statistiques clés (total des crédits plateforme, nombre de covoiturages/jour, revenus plateforme/jour) via MongoDB.
    * Gestion des comptes employés (création).
    * Gestion des comptes utilisateurs et employés (suspension/réactivation).

## Technologies Utilisées

* **Frontend :** HTML5, CSS3 (Bootstrap 5), JavaScript (Vanilla JS) pour une Single Page Application (SPA) avec un routeur JS.
* **Backend :** PHP 8.2 (orienté API RESTful).
* **Base de Données Relationnelle :** MySQL (via MariaDB sur XAMPP pour le développement local, MySQL sur Alwaysdata pour la production) avec accès via PDO.
* **Base de Données NoSQL :** MongoDB (locale pour le développement, MongoDB Atlas en production) pour les statistiques et potentiellement les logs.
* **Serveur de Développement Local :** XAMPP (Apache, MariaDB, PHP).
* **Dépendances PHP :**
    * `mongodb/mongodb` (via Composer) pour l'interaction avec MongoDB.
    * PHPMailer (via le dossier `lib/`) pour l'envoi d'emails.
* **Gestion de version :** Git et GitHub.
* **Outil de gestion de projet :** Trello.
* **Hébergement de Production :**
    * PHP/MySQL : Alwaysdata
    * MongoDB : MongoDB Atlas

## Installation et Déploiement en Local (pour test/développement)

### Prérequis

* Un serveur web local supportant PHP 8.2+ et MySQL/MariaDB (XAMPP recommandé).
* Composer (gestionnaire de dépendances PHP).
* Un serveur MongoDB local (ou un compte MongoDB Atlas pour se connecter à une instance distante).
* Un navigateur web moderne.
* Git.

### Étapes d'installation

1.  **Cloner le dépôt Git :**
    ```bash
    git clone [https://github.com/cmdelamotte/Ecoride/] EcoRide
    cd EcoRide
    ```

2.  **Installer les dépendances Composer :**
    À la racine du dossier `EcoRide/Code/` (là où se trouve `composer.json`), exécutez :
    ```bash
    composer install
    ```
    Cela installera la librairie `mongodb/mongodb` dans le dossier `vendor/`.

3.  **Configurer la base de données MySQL :**
    * Assurez-vous que votre serveur MySQL (via XAMPP ou un autre) est démarré.
    * Ouvrez un client SQL. Pour cet exemple, nous utiliserons le **Shell MySQL accessible depuis le panneau de contrôle XAMPP** (bouton "Shell" sur la ligne MySQL), mais d'autres clients comme DBeaver, SQL Workbench, ou l'interface SQL de votre IDE fonctionnent aussi.
    * Une fois dans le shell MySQL (vous serez connecté en tant qu'utilisateur root de MariaDB), créez une nouvelle base de données pour le projet :
        ```sql
        CREATE DATABASE IF NOT EXISTS ecoride CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
        ```
    * Sélectionnez la base de données nouvellement créée :
        ```sql
        USE ecoride;
        ```
    * Exécutez le contenu du script de création de la structure des tables. Pour cela, vous pouvez copier-coller le contenu de `Code/sql/01_ecoride_schema.sql` (ou le nom que vous lui avez donné) directement dans le shell, ou utiliser la commande `source` si vous naviguez au bon endroit dans le shell :
        ```sql
        source C:/xampp/htdocs/EcoRide/Code/sql/01_ecoride_schema.sql
        ```
    * Faites de même pour exécuter le contenu du script d'insertion des données de test : `Code/sql/02_ecoride_data.sql` (ou le nom que vous lui avez donné). Ce script devrait également créer l'utilisateur `ecoride_admin` avec les droits nécessaires.
        ```sql
        source C:/xampp/htdocs/EcoRide/Code/sql/02_ecoride_data.sql
        ```
    * Si l'utilisateur `ecoride_admin` n'a pas été créé par le script de données ou si vous souhaitez vérifier/recréer ses privilèges manuellement, exécutez les commandes SQL suivantes dans le shell MariaDB (toujours en tant que root) :
        ```sql
        CREATE USER IF NOT EXISTS 'ecoride_admin'@'localhost' IDENTIFIED BY '01v_.fGZ$A26';
        GRANT ALL PRIVILEGES ON ecoride.* TO 'ecoride_admin'@'localhost';
        FLUSH PRIVILEGES;
        ```

4.  **Configurer les fichiers de l'application :**
    * Le fichier `Code/api/config/settings.php` contient les configurations par défaut pour l'environnement local (XAMPP). Vérifiez que les identifiants MySQL (`DB_USER`, `DB_PASS`) et la chaîne de connexion MongoDB (`MONGO_URI` pointant vers `mongodb://localhost:27017/ecoride`) sont corrects pour votre installation locale.
    * Les identifiants SMTP pour Gmail (`SMTP_USERNAME`, `SMTP_PASSWORD`) sont aussi dans ce fichier. Assurez-vous que le compte Gmail est configuré pour autoriser les applications moins sécurisées ou qu'un mot de passe d'application est utilisé.

5.  **Configurer l'extension PHP MongoDB pour XAMPP :**
    * Téléchargez le fichier `.dll` de l'extension MongoDB correspondant à votre version de PHP et à votre architecture depuis PECL ([https://pecl.php.net/package/mongodb](https://pecl.php.net/package/mongodb)).
    * Placez le fichier `php_mongodb.dll` dans votre dossier d'extensions PHP (ex: `C:\xampp\php\ext\`).
    * Ouvrez votre fichier `php.ini` (via le panel XAMPP : Apache > Config > PHP (php.ini) ou le dossier `C:\xampp\php`).
    * Ajoutez la ligne `extension=mongodb` (ou `extension=php_mongodb.dll`).
    * Redémarrez Apache.
    * Vérifiez l'activation via un fichier `phpinfo.php` ou en SSH avec `php -m | grep mongodb`.

6.  **Configurer un Hôte Virtuel (Recommandé pour `http://ecoride.local`) :**
    * Modifiez votre fichier `hosts` Windows (`C:\Windows\System32\drivers\etc\hosts`) pour ajouter la ligne :
        `127.0.0.1 ecoride.local`
    * Modifiez votre fichier de configuration des hôtes virtuels Apache (`C:\xampp\apache\conf\extra\httpd-vhosts.conf`) pour ajouter :
        ```apache
        <VirtualHost *:80>
            DocumentRoot "C:/xampp/htdocs/EcoRide/Code"  # Adaptez le chemin vers le dossier Code/
            ServerName ecoride.local
            <Directory "C:/xampp/htdocs/EcoRide/Code">
                Options Indexes FollowSymLinks Includes ExecCGI
                AllowOverride All
                Require all granted
            </Directory>
        </VirtualHost>
        ```
    * Assurez-vous que le fichier `.htaccess` suivant est présent à la racine du dossier `Code/` pour la gestion des routes de la SPA :
        ```apache
        RewriteEngine On
        # Ne pas réécrire les fichiers ou dossiers existants
        RewriteCond %{REQUEST_FILENAME} -f [OR]
        RewriteCond %{REQUEST_FILENAME} -d
        RewriteRule ^ - [L]
        # Réécrire toutes les autres requêtes vers index.html
        RewriteRule ^ index.html [L]
        ```
    * Redémarrez Apache.

7.  **Lancer l'application :**
    Ouvre votre navigateur et allez sur `http://ecoride.local`.

## Structure du Projet (principaux dossiers dans `Code/`)

* `/api/` : Contient les scripts PHP du backend.
    * `/api/config/` : Fichiers de configuration (BDD, MongoDB, settings).
* `/assets/` : Ressources frontend.
    * `/assets/css/` : Feuilles de style.
    * `/assets/js/` : Scripts JavaScript (logique client, handlers de page).
* `/img/` : Contient les images utilisées pour l'application
* `/lib/` : Librairies externes (PHPMailer).
* `/pages/` : Fragments HTML pour les différentes vues de la SPA.
    `/pages/auth/` : Fragments HTML pour les pages liées à l'authentification.
* `/router/` : Scripts pour le routeur JavaScript.
* `/sql/` : Scripts SQL pour la création du schéma et l'insertion des données.
* `/vendor/` : Dépendances Composer (après `composer install`).
* `index.html` : Point d'entrée principal de la SPA.
* `.htaccess` : Configuration Apache pour la SPA.

## Auteur

* **Charles-Maximilien Delamotte**

---