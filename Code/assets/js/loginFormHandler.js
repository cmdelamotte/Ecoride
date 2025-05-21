import { LoadContentPage } from "../../router/Router.js"; 
import { showAndHideElementsForRoles } from './authManager.js';

//TODO : Améliorer redirection après connexion

export function initializeLoginForm() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) {
        console.warn("Formulaire 'login-form' non trouvé pour initialisation.");
        return;
    }

    const identifierInput = document.getElementById('login-identifier'); 
    const passwordInput = document.getElementById('login-password');
    const errorMessageDiv = document.getElementById('error-message-login');

    // Listeners 'input' pour effacer les messages d'erreur custom et globaux
    [identifierInput, passwordInput].forEach(input => {
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

    loginForm.addEventListener('submit', function(event) {
        event.preventDefault(); 

        // Réinitialisation des messages
        if (identifierInput) identifierInput.setCustomValidity("");
        if (passwordInput) passwordInput.setCustomValidity("");
        if (errorMessageDiv) {
            errorMessageDiv.classList.add('d-none');
            errorMessageDiv.textContent = '';
        }

        let isFormValidOverall = true;
        // Validation HTML5
        if (!loginForm.checkValidity()) {
            isFormValidOverall = false;
        }
        
        const identifier = identifierInput ? identifierInput.value.trim() : ""; 
        const passwordValue = passwordInput ? passwordInput.value : "";

        // Validations JS client supplémentaires
        if (!identifier) {
            if(identifierInput) identifierInput.setCustomValidity("L'identifiant est requis.");
            isFormValidOverall = false;
        }
        if (!passwordValue) {
            if(passwordInput) passwordInput.setCustomValidity("Le mot de passe est requis.");
            isFormValidOverall = false;
        }
            
        if (!isFormValidOverall) {
            loginForm.reportValidity(); // Affiche les messages des setCustomValidity et HTML5
            if (errorMessageDiv && !errorMessageDiv.textContent) { 
                errorMessageDiv.textContent = "Veuillez remplir tous les champs.";
                errorMessageDiv.classList.remove('d-none', 'alert-success', 'alert-info');
                errorMessageDiv.classList.add('alert-danger');
            }
            return; 
        }
        
        // Le formulaire est valide côté client, appel de l'API
        const loginData = {
            identifier: identifier, // La clé 'identifier' est attendue par api/login.php
            password: passwordValue
        };

        const submitButton = loginForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;
        if (errorMessageDiv) {
            errorMessageDiv.textContent = 'Connexion en cours...';
            errorMessageDiv.classList.remove('d-none', 'alert-danger', 'alert-success');
            errorMessageDiv.classList.add('alert-info');
        }

        fetch('/api/login.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        })
        .then(response => {
            return response.json().then(data => ({ status: response.status, body: data, ok: response.ok }))
                .catch(jsonError => {
                    console.error("loginFormHandler: Erreur parsing JSON:", jsonError);
                    return response.text().then(textData => {
                        throw new Error(`Réponse non-JSON du serveur (statut ${response.status}): ${textData.substring(0,200)}...`);
                    });
                });
        })
        .then(({ status, body, ok }) => {
            if (submitButton) submitButton.disabled = false;

            if (ok && body.success && body.user) {
                // Connexion réussie !
                if (errorMessageDiv) { // Afficher le message de succès avant la redirection
                    errorMessageDiv.textContent = body.message || 'Connexion réussie ! Redirection...';
                    errorMessageDiv.classList.remove('d-none', 'alert-danger', 'alert-info');
                    errorMessageDiv.classList.add('alert-success');
                }
                
                // Stocker les informations utilisateur dans sessionStorage
                sessionStorage.setItem('user_id', body.user.id);
                sessionStorage.setItem('username', body.user.username);
                sessionStorage.setItem('simulatedUserFirstName', body.user.firstName);
                sessionStorage.setItem('simulatedUserLastName', body.user.lastName);
                sessionStorage.setItem('simulatedUserEmail', body.user.email);
                sessionStorage.setItem('simulatedUserBirthdate', body.user.birthdate || '');
                sessionStorage.setItem('simulatedUserPhone', body.user.phone || '');      
                sessionStorage.setItem('simulatedUserCredits', String(body.user.credits));
                
                const userRolesSystem = body.user.roles_system || [];
                const userFunctionalRole = body.user.functional_role;

                let primaryRoleForUI = userFunctionalRole || 'passenger'; // Fallback à passenger
                if (userRolesSystem.includes('ROLE_ADMIN')) {
                    primaryRoleForUI = 'admin';
                } else if (userRolesSystem.includes('ROLE_EMPLOYEE')) {
                    primaryRoleForUI = 'employee';
                }
                sessionStorage.setItem('ecoRideUserRole', primaryRoleForUI); // Pour authManager.js
                // Pour le token, comme on utilise des sessions PHP, on peut simuler un token ou ne rien mettre
                // L'important est que isConnected() dans authManager.js fonctionne.
                // Si isConnected() vérifie ecoRideUserToken, il faut le définir :
                sessionStorage.setItem('ecoRideUserToken', 'php_session_active'); // Ou l'user_id, ou un booléen

                if (typeof showAndHideElementsForRoles === "function") {
                    showAndHideElementsForRoles(); // Mettre à jour la navbar, etc.
                }

                // Redirection après un court délai pour que l'utilisateur voie le message de succès
                setTimeout(() => {
                    let redirectTo = "/account"; // Destination par défaut
                    if (primaryRoleForUI === 'admin') {
                        redirectTo = "/admin-dashboard";
                    } else if (primaryRoleForUI === 'employee') {
                        redirectTo = "/employee-dashboard";
                    }
                    
                    if (typeof LoadContentPage === "function") {
                        window.history.pushState({}, "", redirectTo);
                        LoadContentPage();
                    } else {
                        window.location.href = redirectTo; // Fallback
                    }
                }, 1000); 

            } else {
                // Échec de la connexion (identifiants incorrects, compte suspendu, etc.)
                const message = body.message || 'Identifiant ou mot de passe incorrect.';
                console.error('loginFormHandler: Erreur API connexion:', status, body);
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = message;
                    errorMessageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                    errorMessageDiv.classList.add('alert-danger');
                }
            }
        })
        .catch(error => {
            if (submitButton) submitButton.disabled = false;
            console.error('loginFormHandler: Erreur Fetch globale (connexion):', error);
            if (errorMessageDiv) {
                errorMessageDiv.textContent = 'Erreur de communication avec le serveur. ' + error.message;
                errorMessageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                errorMessageDiv.classList.add('alert-danger');
            }
        });
    });
}