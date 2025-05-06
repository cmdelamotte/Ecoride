import Route from "./Route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html", []),
    new Route("/login", "Connexion", "/pages/auth/login.html", ["disconnected"]),
    new Route("/register", "Inscription", "/pages/auth/register.html", ["disconnected"]),
    new Route("/account", "Mon compte", "/pages/auth/account.html", ["client", "admin"]),
    new Route("/edit-password", "Changement de mot de passe",["client", "admin"]),
    new Route("/your-rides", "Vos covoiturages", "/pages/booking/your-rides.html", ["client"]),
    new Route("/book-ride", "Réserver", "/pages/booking/book-ride.html", ["client"]),
    new Route("/publish-ride", "Publier un trajet", "/pages/publish-ride.html", ["client"]),
    new Route("/search", "Rechercher un trajet", "/pages/search.html", ["client"]),
    new Route("/rides-search", "Résultats de recherche", "/pages/rides-search.html", ["client"]),
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "EcoRide";