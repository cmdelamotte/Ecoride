import Route from "./Route.js";
import { allRoutes, websiteName } from "./allRoutes.js";
import { loadAndInitializePageScript } from "../assets/js/pageScriptManager.js";
import { getRole as getCurrentUserRole, isConnected as isUserConnected } from "../assets/js/authManager.js";

// Création d'une route pour la page 404 (page introuvable)
const route404 = new Route("404", "Page introuvable", "/pages/404.html", [], "/assets/js/pageScriptManager.js");

// Fonction pour récupérer la route correspondant à une URL donnée
const getRouteByUrl = (url) => {
  let currentRoute = null;
  allRoutes.forEach((element) => {
    if (element.url == url) {
      currentRoute = element;
    }
  });
  // Si aucune correspondance n'est trouvée, on retourne la route 404
  // Mais on ne la retourne pas encore, car on doit d'abord vérifier l'autorisation pour la route trouvée
  return currentRoute; // Peut être null si l'URL n'existe pas du tout
};

// Fonction pour charger le contenu de la page
export const LoadContentPage = async () => {
  const path = window.location.pathname;
  let actualRoute = getRouteByUrl(path);

  // Si l'URL n'existe pas du tout dans allRoutes
  if (!actualRoute) {
    actualRoute = route404;
  } else {
    // L'URL existe, maintenant vérifions les autorisations
    const userRole = getCurrentUserRole(); // Récupère le rôle stocké dans sessionStorage par authManager
    const userIsConnected = isUserConnected(); // Vérifie si l'utilisateur est connecté

    // Vérification des autorisations de la route
    if (actualRoute.authorize && actualRoute.authorize.length > 0) {
      if (!userIsConnected && !actualRoute.authorize.includes("disconnected")) {
        // Utilisateur déconnecté essayant d'accéder à une page protégée pour connectés
        console.warn(`Router: Accès non autorisé (déconnecté) à ${path}. Redirection vers /login.`);
        actualRoute = getRouteByUrl("/login"); // Ou une route 'access-denied' si tu en as une
        window.history.replaceState({}, "", "/login"); // Change l'URL sans recharger
      } else if (userIsConnected) {
        // Utilisateur connecté
        if (actualRoute.authorize.includes("disconnected")) {
          // Utilisateur connecté essayant d'accéder à une page pour déconnectés (ex: /login)
          console.warn(`Router: Accès non autorisé (connecté) à ${path} (page pour déconnectés). Redirection vers /account.`);
          actualRoute = getRouteByUrl("/account"); // Redirige vers le compte
          window.history.replaceState({}, "", "/account");
        } else if (!actualRoute.authorize.includes(userRole) && !actualRoute.authorize.includes("connected")) {
          // L'utilisateur connecté n'a pas le rôle requis (et "connected" n'est pas une autorisation suffisante)
          console.warn(`Router: Accès non autorisé (rôle ${userRole} insuffisant pour ${actualRoute.authorize.join(',')}) à ${path}. Affichage 404.`);
          actualRoute = route404;
          window.history.replaceState({}, "", "/404"); 
        }
        // Si actualRoute.authorize contient userRole ou "connected", l'accès est permis.
      }
    }
  }

  // Récupération du contenu HTML de la route
  const html = await fetch(actualRoute.pathHtml).then((data) => data.text());
  document.getElementById("main-page").innerHTML = html;

  // Chargement du script JS associé à la page
  if (actualRoute.pathJS && actualRoute.pathJS !== "") {
    try {
      await loadAndInitializePageScript(actualRoute.pathJS);
    } catch (e) {
      console.error(`Router.js: Erreur lors de l'exécution du script de page ${actualRoute.pathJS}:`, e);
    }
  }

  document.title = actualRoute.title + " - " + websiteName;

  // Après le chargement du contenu, on met à jour les éléments de la navbar
  // car la page pourrait avoir changé le statut de connexion (ex: après un login réussi)
  // ou si on arrive directement sur une page protégée.
  if (typeof window.showAndHideElementsForRoles === 'function') {
    window.showAndHideElementsForRoles();
  }
};

// Fonction pour gérer les événements de routage (clic sur les liens)
const routeEvent = (event) => {
  event = event || window.event;
  event.preventDefault();
  // Mise à jour de l'URL dans l'historique du navigateur
  window.history.pushState({}, "", event.target.href);
  // Chargement du contenu de la nouvelle page
  LoadContentPage();
};

// Gestion de l'événement de retour en arrière dans l'historique du navigateur
window.onpopstate = LoadContentPage;
// Assignation de la fonction routeEvent à la propriété route de la fenêtre
window.route = routeEvent;
// Chargement du contenu de la page au chargement initial
LoadContentPage();