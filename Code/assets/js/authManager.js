import { LoadContentPage } from "../../router/Router.js";

// Fonctions pour gérer l'état d'authentification
function getToken() {
    return sessionStorage.getItem('ecoRideUserToken');
}

export function getRole() {
    return sessionStorage.getItem('ecoRideUserRole');
}

export function isConnected() {
    return getToken() !== null;
}

/**
 * Simule une connexion en stockant un token et un rôle.
 * @param {string} role - Le rôle à simuler (ex: "passenger", "driver", "passenger-driver", "employee", "admin")
 * @param {string} token - Un token factice.
 */
// function simulateLogin(role, token = "fakeUserToken123") {
//     sessionStorage.setItem('ecoRideUserToken', token);
//     sessionStorage.setItem('ecoRideUserRole', role);
//     console.log(`Simulation: Connexion en tant que ${role}`);
//     showAndHideElementsForRoles();
// }

/**
 * Gère la déconnexion de l'utilisateur.
 * Appelle l'API pour détruire la session serveur, puis nettoie le client.
 * @param {Event} event - L'événement clic (optionnel, si appelé depuis un lien).
 */
export async function signout(event) { // Ajout de async car on va utiliser await pour fetch
    if (event) event.preventDefault();
    console.log("authManager: Déconnexion initiée.");

    try {
        const response = await fetch('http://ecoride.local/api/logout.php', {
            method: 'POST', // Conformément au script logout.php
            headers: {
                'Content-Type': 'application/json' // Même si le corps est vide, c'est une bonne pratique
            },
        });

        // Tenter de parser la réponse JSON même si on s'attend surtout à un succès
        const data = await response.json().catch(jsonError => {
            console.warn("authManager (logout): La réponse de l'API de déconnexion n'était pas du JSON valide.", jsonError);
            // Si la réponse n'est pas JSON, on peut quand même vérifier le statut HTTP
            // et considérer la déconnexion comme réussie côté serveur si le statut est OK.
            if (response.ok) {
                return { success: true, message: "Réponse non-JSON du serveur, mais statut OK." };
            } else {
                // Forger un objet d'erreur si le statut n'est pas OK et que ce n'est pas du JSON
                return { success: false, message: `Erreur serveur (statut ${response.status}) lors de la déconnexion. Réponse non-JSON.` };
            }
        });

        if (response.ok && data.success) {
            console.log("authManager: Déconnexion réussie côté serveur.", data.message);
        } else {
            // Même si la déconnexion serveur échoue ou renvoie une erreur,
            // on procède à la déconnexion côté client pour que l'utilisateur
            // ne soit pas bloqué dans un état "connecté" si le serveur a un souci.
            console.warn("authManager: La déconnexion côté serveur a potentiellement échoué ou renvoyé un message d'erreur.", data.message);
        }

    } catch (error) {
        // Erreur réseau ou autre problème avec l'appel fetch lui-même
        console.error("authManager: Erreur lors de l'appel fetch à l'API de déconnexion:", error);
        // Malgré l'erreur d'appel à l'API, on va quand même déconnecter l'utilisateur côté client
        // pour qu'il ne soit pas bloqué.
    }

    // --- Nettoyage côté client (toujours effectué, même si l'appel API échoue) ---
    console.log("authManager: Nettoyage du sessionStorage JS.");
    sessionStorage.removeItem('user_id'); 
    sessionStorage.removeItem('username');
    sessionStorage.removeItem('simulatedUserFirstName');
    sessionStorage.removeItem('simulatedUserLastName');
    sessionStorage.removeItem('simulatedUserEmail');
    sessionStorage.removeItem('simulatedUserBirthdate');
    sessionStorage.removeItem('simulatedUserPhone');
    sessionStorage.removeItem('simulatedUserCredits');
    sessionStorage.removeItem('userRolesSystem');
    sessionStorage.removeItem('userFunctionalRole');

    sessionStorage.removeItem('ecoRideUserToken'); // L'ancien indicateur de connexion
    sessionStorage.removeItem('ecoRideUserRole');  // L'ancien rôle principal pour l'UI

    if (typeof showAndHideElementsForRoles === "function") {
        showAndHideElementsForRoles(); // Mettre à jour l'affichage de la navbar, etc.
    } else {
        console.warn("authManager: showAndHideElementsForRoles n'est pas disponible.");
    }

    // Redirection vers la page d'accueil
    console.log("authManager: Redirection vers l'accueil.");
    if (typeof LoadContentPage === "function") {
        window.history.pushState({}, "", "/");
        LoadContentPage();
    } else {
        console.warn("authManager: LoadContentPage n'est pas disponible, redirection classique.");
        window.location.href = "/"; // Fallback
    }
}

/**
 * @param {string[]} rules - Tableau des règles du data-show (ex: ["passenger", "driver"]).
 * @param {string|null} userRole - Le rôle actuel de l'utilisateur (ou null si déconnecté).
 * @returns {boolean} - true si l'élément doit être affiché.
 */

function shouldElementBeVisible(rules, userRole) {
    if (rules.includes('disconnected')) {
        return userRole === null;
    }
    // Pour les utilisateurs connectés
    if (userRole !== null && typeof userRole === 'string') {
        const userRoleProcessed = userRole.trim(); // Sécurité : enlever les espaces
        // Vérifier si une des règles (après trim aussi) correspond au rôle traité de l'utilisateur
        return rules.some(rule => rule.trim() === userRoleProcessed);
    }
    return false; // Si userRole est null et que la règle n'est pas 'disconnected'
}

// La fonction showAndHideElementsForRoles applique les résultats de shouldElementBeVisible :
export function showAndHideElementsForRoles() {
    const userRole = getRole(); 
    console.log("authManager - UI Update based on Role:", userRole || 'disconnected'); // LOG 1
    document.querySelectorAll('[data-show]').forEach(element => {
        const rules = element.dataset.show.split(' ');
        console.log("authManager - Element:", element.id || element.textContent.trim().substring(0,20), "Rules:", rules, "Current Role:", userRole); // LOG 2
        if (shouldElementBeVisible(rules, userRole)) {
            element.classList.remove('d-none');
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
        console.warn("Bouton de déconnexion 'nav-logout' non trouvé au chargement du DOM.");
    }

    // Mettre à jour l'affichage initial de la navbar
    showAndHideElementsForRoles();
});


// DÉBUT BLOC DE DÉBOGAGE - À RETIRER/COMMENTER POUR LA PRODUCTION
// if (typeof window !== 'undefined') { // Vérifie qu'on est bien dans un environnement navigateur
//     window.simulateLogin = simulateLogin;
//     window.signout = signout;
//     window.showAndHideElementsForRoles = showAndHideElementsForRoles; // Si tu veux la tester aussi
//     window.dev_getRole = getRole; // Préfixe par dev_ pour marquer que c'est pour le dev
//     window.dev_getToken = getToken;
//     window.dev_isConnected = isConnected;

//     console.log("Fonctions de débogage (simulateLogin, signout, etc.) attachées à window.");
// }