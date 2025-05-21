import Route from "./Route.js";

//Définir ici vos routes
export const allRoutes = [
    new Route("/", "Accueil", "/pages/home.html", [], "/assets/js/searchFormHandler.js"),
    new Route("/login", "Connexion", "/pages/auth/login.html", [], "/assets/js/loginFormHandler.js"),
    new Route("/register", "Inscription", "/pages/auth/register.html", [], "/assets/js/registerFormHandler.js"),
    new Route("/account", "Mon compte", "/pages/auth/account.html", ["passenger", "driver", "passenger-driver"], "/assets/js/accountPageHandler.js" ),
    new Route("/edit-password", "Changement de mot de passe","/pages/auth/edit-password.html",["passenger", "driver", "passenger-driver"], "/assets/js/editPasswordFormHandler.js"),
    new Route("/edit-personal-info", "Modification des informations personnelles","/pages/auth/edit-personal-info.html",["passenger", "driver", "passenger-driver"], "/assets/js/personalInfoFormHandler.js"),
    new Route("/employee-dashboard", "Espace employé", "/pages/auth/employee-dashboard.html",["employee", "admin"], "/assets/js/employeeDashboardHandler.js"),
    new Route("/admin-dashboard", "Espace Admin", "/pages/auth/admin-dashboard.html",["admin"], "/assets/js/adminDashboardHandler.js"),
    new Route("/forgot-password", "Mot de passe oublié", "/pages/auth/forgot-password.html",[], "/assets/js/forgotPasswordHandler.js"),
    new Route("/your-rides", "Vos covoiturages", "/pages/your-rides.html", ["passenger", "driver", "passenger-driver"], "/assets/js/yourRidesPageHandler.js"),
    new Route("/book-ride", "Réserver", "/pages/booking/book-ride.html", ["passenger, passenger-driver"]),
    new Route("/publish-ride", "Publier un trajet", "/pages/publish-ride.html", ["driver, passenger-driver"], "/assets/js/publishRidePageHandler.js"),
    new Route("/search", "Rechercher un trajet", "/pages/search.html", []),
    new Route("/rides-search", "Résultats de recherche", "/pages/rides-search.html", [], "/assets/js/ridesSearchPageHandler.js"),
    new Route("/contact", "Formulaire de contact", "/pages/contact.html", [], "/assets/js/contactFormHandler.js"),
    new Route("/legal-mentions", "Mentions légales", "/pages/legal-mentions.html", []),
];

//Le titre s'affiche comme ceci : Route.titre - websitename
export const websiteName = "EcoRide";