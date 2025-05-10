export function initializeRegisterForm() {
    const registerForm = document.getElementById('register-form');
    
    const usernameInput = document.getElementById('register-username');
    const lastNameInput = document.getElementById('register-last-name');
    const firstNameInput = document.getElementById('register-first-name');
    const emailInput = document.getElementById('register-email');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const errorMessageDiv = document.getElementById('error-message-register');

    // Regex pour la validation du mot de passe et le message d'erreur associé
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation des messages custom précédents et de la div d'erreur globale
            [usernameInput, lastNameInput, firstNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
                if (input) input.setCustomValidity("");
            });
            if (errorMessageDiv) {
                errorMessageDiv.classList.add('d-none');
                errorMessageDiv.textContent = '';
            }

            let isFormValidOverall = true;

            if (!registerForm.checkValidity()) {
                isFormValidOverall = false;
            }

            const username = usernameInput?.value.trim();
            const lastName = lastNameInput?.value.trim();
            const firstName = firstNameInput?.value.trim();
            const password = passwordInput?.value;
            const confirmPassword = confirmPasswordInput?.value;

            // Validation Pseudo
            if (usernameInput && username) {
                if (username.length < 3) {
                    usernameInput.setCustomValidity("Le pseudo doit contenir au moins 3 caractères.");
                    isFormValidOverall = false;
                } else {
                    usernameInput.setCustomValidity("");
                }
            }

            // Validation Nom
            if (lastNameInput && lastName) {
                if (lastName.length < 2) {
                    lastNameInput.setCustomValidity("Le nom doit contenir au moins 2 caractères.");
                    isFormValidOverall = false;
                } else {
                    lastNameInput.setCustomValidity("");
                }
            }

            // Validation Prénom
            if (firstNameInput && firstName) {
                if (firstName.length < 2) {
                    firstNameInput.setCustomValidity("Le prénom doit contenir au moins 2 caractères.");
                    isFormValidOverall = false;
                } else {
                    firstNameInput.setCustomValidity("");
                }
            }
            
            // Validation du mot de passe avec la Regex unique
            if (passwordInput && password) { // On valide seulement si le champ est rempli
                if (!passwordRegex.test(password)) {
                    passwordInput.setCustomValidity(passwordRequirementsMessage);
                    isFormValidOverall = false;
                } else {
                    passwordInput.setCustomValidity(""); // Mot de passe OK selon la Regex
                }
            }

            // Validation de la confirmation du mot de passe
            if (confirmPasswordInput && password) { // On ne valide que si le champ password a une valeur
                if (confirmPassword !== password) {
                    confirmPasswordInput.setCustomValidity("La confirmation ne correspond pas au mot de passe.");
                    isFormValidOverall = false;
                } else {
                    confirmPasswordInput.setCustomValidity(""); // Correspondance OK
                }
            }
            
            if (!isFormValidOverall) {
                registerForm.reportValidity(); 
                console.log("Validation du formulaire d'inscription échouée.");
                // Optionnel: afficher un message générique dans la div globale si des erreurs de champ existent
                // if (errorMessageDiv) {
                //    errorMessageDiv.textContent = "Veuillez corriger les erreurs dans le formulaire.";
                //    errorMessageDiv.classList.remove('d-none');
                //    errorMessageDiv.classList.add('alert-danger');
                // }
            } else {
                const email = emailInput?.value.trim();

                console.log("Formulaire d'inscription valide côté client. Données :", { username, lastName, firstName, email });
                
                // TODO: Appel fetch vers l'API backend pour créer le compte.
                // Pour l'instant, on garde l'alerte de simulation :
                console.log("Inscription réussie (simulation) !"); 
            }
        });

        [usernameInput, lastNameInput, firstNameInput, emailInput, passwordInput, confirmPasswordInput].forEach(input => {
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
