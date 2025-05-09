import { LoadContentPage } from "../../router/Router.js";

// --- Fonctions pour simuler/gérer l'état d'authentification ---
function getToken() {
    // Plus tard, lira un vrai token (ex: localStorage, cookie)
    // return localStorage.getItem('ecoRideUserToken');
    return sessionStorage.getItem('ecoRideUserToken'); // SessionStorage pour que ça s'efface à la fermeture du navigateur (plus simple pour tests)
}

function getRole() {
    // Plus tard, lira un vrai rôle
    // return localStorage.getItem('ecoRideUserRole');
    return sessionStorage.getItem('ecoRideUserRole');
}

function isConnected() {
    return getToken() !== null;
}

/**
 * Simule une connexion en stockant un token et un rôle.
 * @param {string} role - Le rôle à simuler (ex: "passenger", "driver", "passenger-driver", "employee", "admin")
 * @param {string} token - Un token factice.
 */
function simulateLogin(role, token = "fakeUserToken123") {
    sessionStorage.setItem('ecoRideUserToken', token);
    sessionStorage.setItem('ecoRideUserRole', role);
    console.log(`Simulation: Connexion en tant que ${role}`);
    showAndHideElementsForRoles();
}

/**
 * Simule une déconnexion.
 */
function signout(event) {
    if(event) event.preventDefault(); // Si appelé depuis un lien
    sessionStorage.removeItem('ecoRideUserToken');
    sessionStorage.removeItem('ecoRideUserRole');
    console.log("Simulation: Déconnexion.");
    showAndHideElementsForRoles();

    window.history.pushState({}, "", "/");
    if (typeof LoadContentPage === "function") {
        LoadContentPage();
    } else {
        console.warn("LoadContentPage n'est pas défini globalement.");
        // Fallback si LoadContentPage n'est pas dispo (ex: si ce script est chargé avant le routeur)
        window.location.href = "/"; // Retour à l'accueil
    }
}

/**
 * @param {string[]} rules - Tableau des règles du data-show (ex: ["passenger", "driver"]).
 * @param {string|null} userRole - Le rôle actuel de l'utilisateur (ou null si déconnecté).
 * @returns {boolean} - true si l'élément doit être affiché.
 */

function shouldElementBeVisible(rules, userRole) {
    // Cas 1: L'élément est pour les utilisateurs déconnectés
    if (rules.includes('disconnected')) {
        // Afficher SEULEMENT si userRole est null (donc pas connecté)
        return userRole === null;
    }

    // Cas 2: L'élément est pour des utilisateurs connectés. Si un utilisateur est connecté, il a forcément un rôle.
    if (rules.includes(userRole)) { 
        return true;
    }
    
    // Si aucune des conditions ci-dessus n'est remplie, on n'affiche pas.
    return false;
}

// La fonction showAndHideElementsForRoles applique les résultats de shouldElementBeVisible :
function showAndHideElementsForRoles() {
    const userRole = getRole(); // "passenger", "driver", ..., ou null si non connecté

    console.log(`UI Update based on Role: ${userRole || 'disconnected'}`);

        // Boucle qui parcourt chaque élément ayant un data-show
    document.querySelectorAll('[data-show]').forEach(element => {
        const rules = element.dataset.show.split(' ');
        
        // Affiche l'élément si userRole = l'un des éléments du tableau rules
        if (shouldElementBeVisible(rules, userRole)) {
            element.classList.remove('d-none');
        // Masque l'élément si userRole != l'un des éléments du tableau rules
        } else {
            element.classList.add('d-none');
        }
    });
}

// --- Initialisation ---
document.addEventListener('DOMContentLoaded', () => {
    // S'assurer que les éléments de la navbar sont prêts avant de les manipuler
    const navLogoutButton = document.getElementById("nav-logout");
    if (navLogoutButton) {
        navLogoutButton.addEventListener("click", signout);
    } else {
        // Ce log est utile si tu renommes l'ID ou si le script s'exécute trop tôt
        console.warn("Bouton de déconnexion 'nav-logout' non trouvé au chargement du DOM.");
    }

    // Mettre à jour l'affichage initial de la navbar
    showAndHideElementsForRoles();
});


// DÉBUT BLOC DE DÉBOGAGE - À RETIRER/COMMENTER POUR LA PRODUCTION
// Ces lignes rendent certaines fonctions du module accessibles globalement (via window)
// pour faciliter les tests manuels depuis la console du navigateur pendant le développement.
if (typeof window !== 'undefined') { // Vérifie qu'on est bien dans un environnement navigateur
    window.simulateLogin = simulateLogin;
    window.signout = signout;
    window.showAndHideElementsForRoles = showAndHideElementsForRoles; // Si tu veux la tester aussi
    window.dev_getRole = getRole; // Préfixe par dev_ pour marquer que c'est pour le dev
    window.dev_getToken = getToken;
    window.dev_isConnected = isConnected;

    console.log("Fonctions de débogage (simulateLogin, signout, etc.) attachées à window.");
}