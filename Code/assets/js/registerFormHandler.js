export function initializeRegisterForm() {
    const registerForm = document.getElementById('register-form');
    
    const usernameInput = document.getElementById('register-username');
    const lastNameInput = document.getElementById('register-last-name');
    const firstNameInput = document.getElementById('register-first-name');
    const emailInput = document.getElementById('register-email');
    // Nouveaux champs
    const birthdateInput = document.getElementById('register-birthdate');
    const phoneInput = document.getElementById('register-phone');
    // Fin nouveaux champs
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const errorMessageDiv = document.getElementById('error-message-register');

        // Regex pour la validation du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";
    
    // Regex pour un numéro de téléphone français (commençant par 01, 02, 03, 04, 05, 06, 07, 09) suivi de 8 chiffres.
    const phoneRegex = /^(0[1-79])\d{8}$/; 

    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation des messages custom précédents et de la div d'erreur globale
            [usernameInput, lastNameInput, firstNameInput, emailInput, 
            birthdateInput, phoneInput, // Nouveaux champs inclus
            passwordInput, confirmPasswordInput].forEach(input => {
                if (input) input.setCustomValidity("");
            });
            if (errorMessageDiv) {
                errorMessageDiv.classList.add('d-none');
                errorMessageDiv.textContent = '';
            }

            let isFormValidOverall = true;

            if (!registerForm.checkValidity()) { // Valide 'required', 'type="email"', 'pattern' HTML5
                isFormValidOverall = false;
            }

            const username = usernameInput?.value.trim();
            const lastName = lastNameInput?.value.trim();
            const firstName = firstNameInput?.value.trim();
            const email = emailInput?.value.trim(); // Récupération de l'email
            // Récupération des nouvelles valeurs
            const birthdate = birthdateInput?.value;
            const phone = phoneInput?.value.trim();
            // Fin récupération
            const password = passwordInput?.value;
            const confirmPassword = confirmPasswordInput?.value;

            // --- Validations JS Personnalisées ---
            if (usernameInput && username && username.length < 3) {
                usernameInput.setCustomValidity("Le pseudo doit contenir au moins 3 caractères.");
                isFormValidOverall = false;
            }
            if (lastNameInput && lastName && lastName.length < 2) {
                lastNameInput.setCustomValidity("Le nom doit contenir au moins 2 caractères.");
                isFormValidOverall = false;
            }
            if (firstNameInput && firstName && firstName.length < 2) {
                firstNameInput.setCustomValidity("Le prénom doit contenir au moins 2 caractères.");
                isFormValidOverall = false;
            }

            // Validation Date de Naissance (exemple : âge minimum de 16 ans)
            if (birthdateInput && birthdate) {
                const today = new Date();
                const birthDateObj = new Date(birthdate);
                let age = today.getFullYear() - birthDateObj.getFullYear();
                const monthDiff = today.getMonth() - birthDateObj.getMonth();
                if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
                    age--;
                }
                if (age < 16) {
                    birthdateInput.setCustomValidity("Vous devez avoir au moins 16 ans pour vous inscrire.");
                    isFormValidOverall = false;
                } else if (birthDateObj > today) {
                    birthdateInput.setCustomValidity("La date de naissance ne peut pas être dans le futur.");
                    isFormValidOverall = false;
                }
            }

            // Validation Téléphone (format plus précis)
            if (phoneInput && phone) { // Si le champ est rempli (le 'required' gère s'il est vide)
                if (!phoneRegex.test(phone)) {
                    phoneInput.setCustomValidity("Le format du téléphone est incorrect (ex: 0612345678).");
                    isFormValidOverall = false;
                }
            }
            
            if (passwordInput && password) {
                if (!passwordRegex.test(password)) {
                    passwordInput.setCustomValidity(passwordRequirementsMessage);
                    isFormValidOverall = false;
                }
            }
            if (confirmPasswordInput && password && confirmPassword !== password) {
                confirmPasswordInput.setCustomValidity("La confirmation ne correspond pas au mot de passe.");
                isFormValidOverall = false;
            }
            
            if (!isFormValidOverall) {
                registerForm.reportValidity(); 
                console.log("Validation du formulaire d'inscription échouée.");
            } else {
                console.log("Formulaire d'inscription valide côté client. Données :", { 
                    username, 
                    lastName, 
                    firstName, 
                    email, 
                    birthdate, // Nouveau
                    phone,     // Nouveau
                    // Ne pas logger le mot de passe en production
                });
                
                alert("Inscription réussie (simulation) ! Vérifiez la console pour les données.");
                // registerForm.reset(); // Pour vider le formulaire après succès
                // TODO: Redirection ou autre action
            }
        });

        // Réinitialisation de la validité custom sur input pour tous les champs
        [usernameInput, lastNameInput, firstNameInput, emailInput, 
        birthdateInput, phoneInput, // Nouveaux champs inclus
        passwordInput, confirmPasswordInput].forEach(input => {
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