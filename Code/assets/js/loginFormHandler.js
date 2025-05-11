import { LoadContentPage } from "../../router/Router.js"  ; 
import { showAndHideElementsForRoles } from './authManager.js';

export function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    
    // Utiliser les ID exacts de ton HTML login.html
    const usernameInput = document.getElementById('login-username'); // CHANGÉ ICI pour correspondre à ton HTML
    const passwordInput = document.getElementById('login-password');
    const errorMessageDiv = document.getElementById('error-message-login');

    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            if (usernameInput) usernameInput.setCustomValidity("");
            if (passwordInput) passwordInput.setCustomValidity("");
            if (errorMessageDiv) {
                errorMessageDiv.classList.add('d-none');
                errorMessageDiv.textContent = '';
            }

            let isFormValidOverall = true;

            if (!loginForm.checkValidity()) {
                isFormValidOverall = false;
            }
            
            if (!isFormValidOverall) {
                loginForm.reportValidity(); 
                console.log("Validation du formulaire de connexion échouée.");
            } else {
                // Récupérer les valeurs APRÈS s'être assuré que les inputs existent
                const username = usernameInput ? usernameInput.value.trim() : ""; 
                const passwordValue = passwordInput ? passwordInput.value : ""; // Récupérer la valeur du mot de passe

                console.log("Formulaire de connexion valide côté client. Tentative de connexion pour:", username);

                // --- DÉBUT DE LA LOGIQUE DE CONNEXION SIMULÉE ---
                let loggedIn = false;
                let userRole = null;
                let redirectTo = "/"; 

                // Identifiants de test
                if (username === "driver" && passwordValue === "123") {
                    userRole = "driver";
                    redirectTo = "/account"; 
                    loggedIn = true;
                } else if (username === "passenger" && passwordValue === "123") {
                    userRole = "passenger";
                    redirectTo = "/account"; 
                    loggedIn = true;
                } else if (username === "passenger-driver" && passwordValue === "123") {
                    userRole = "passenger-driver";
                    redirectTo = "/account"; 
                    loggedIn = true;
                } else if (username === "admin" && passwordValue === "123") {
                    userRole = "admin"; 
                    redirectTo = "/admin-dashboard";
                    loggedIn = true;
                } else if (username === "employee" && passwordValue === "123") {
                    userRole = "employee"; 
                    redirectTo = "/employee-dashboard";
                    loggedIn = true;
                }

                if (loggedIn && userRole) {
                    sessionStorage.setItem('ecoRideUserToken', 'simulatedTokenFor-' + userRole);
                    sessionStorage.setItem('ecoRideUserRole', userRole);
                    
                    if (typeof showAndHideElementsForRoles === "function") {
                        showAndHideElementsForRoles(); 
                    } else {
                        console.warn("showAndHideElementsForRoles n'est pas disponible.");
                    }
                    
                    alert(`Connexion réussie en tant que ${userRole} (simulation) !`);
                    
                    window.history.pushState({}, "", redirectTo);
                    if (typeof LoadContentPage === "function") {
                        LoadContentPage();
                    } else {
                        console.warn("LoadContentPage n'est pas défini pour la redirection.");
                        window.location.href = redirectTo; 
                    }
                } else {
                    if (errorMessageDiv) {
                        errorMessageDiv.textContent = "Identifiants incorrects (simulation).";
                        errorMessageDiv.classList.remove('d-none');
                        errorMessageDiv.classList.add('alert-danger');
                    } else {
                        alert("Identifiants incorrects (simulation).");
                    }
                    console.log("Échec de la connexion simulée pour:", username);
                }
                // --- FIN DE LA LOGIQUE DE CONNEXION SIMULÉE ---
            }
        });

        [usernameInput, passwordInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    input.setCustomValidity("");
                    if (errorMessageDiv) {
                        errorMessageDiv.classList.add('d-none');
                        errorMessageDiv.textContent = '';
                    }
                });
            }
        });
    }
}
