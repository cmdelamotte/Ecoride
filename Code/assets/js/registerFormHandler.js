import { LoadContentPage } from "../../router/Router.js";

//TODO: Améliorer le retour à l'accueil après inscription

export function initializeRegisterForm() {
    const registerForm = document.getElementById('register-form');
    
    // Sélection des éléments du DOM
    const usernameInput = document.getElementById('register-username');
    const lastNameInput = document.getElementById('register-last-name');
    const firstNameInput = document.getElementById('register-first-name');
    const emailInput = document.getElementById('register-email');
    const birthdateInput = document.getElementById('register-birthdate');
    const phoneInput = document.getElementById('register-phone');
    const passwordInput = document.getElementById('register-password');
    const confirmPasswordInput = document.getElementById('register-confirm-password');
    const errorMessageDiv = document.getElementById('error-message-register');

    // Regex
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";
    const phoneRegex = /^(0[1-79])\d{8}$/; 

    if (registerForm) {
        // Listeners 'input' pour réinitialiser la validité custom des champs au fur et à mesure de la saisie
        // Attachés une seule fois ici, à l'initialisation du formulaire.
        [usernameInput, lastNameInput, firstNameInput, emailInput, 
        birthdateInput, phoneInput,
        passwordInput, confirmPasswordInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    input.setCustomValidity(""); // Enlève le message d'erreur custom du champ
                    if (errorMessageDiv) { // Cache aussi le message d'erreur global du formulaire
                        errorMessageDiv.classList.add('d-none');
                        errorMessageDiv.textContent = '';
                    }
                });
            }
        });

        // Listener pour la soumission du formulaire
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation du message d'erreur global et des customValidity de chaque champ avant une nouvelle validation
            if (errorMessageDiv) {
                errorMessageDiv.classList.add('d-none');
                errorMessageDiv.textContent = '';
            }
            [usernameInput, lastNameInput, firstNameInput, emailInput, 
            birthdateInput, phoneInput,
            passwordInput, confirmPasswordInput].forEach(input => {
                if (input) input.setCustomValidity("");
            });

            let isFormValidOverall = true;

            // Récupération des valeurs du formulaire
            const username = usernameInput?.value.trim();
            const lastName = lastNameInput?.value.trim();
            const firstName = firstNameInput?.value.trim();
            const email = emailInput?.value.trim();
            const birthdate = birthdateInput?.value; // Format AAAA-MM-JJ
            const phone = phoneInput?.value.trim();
            const password = passwordInput?.value;
            const confirmPassword = confirmPasswordInput?.value;

            // --- Validations HTML5 natives + JS Personnalisées ---
            // La validation HTML5 (required, type, pattern) est vérifiée par checkValidity()
            if (!registerForm.checkValidity()) { 
                isFormValidOverall = false;
            }

            // Validations JS spécifiques avec setCustomValidity pour des messages plus précis
            if (usernameInput && username.length < 3) { 
                usernameInput.setCustomValidity("Le pseudo doit contenir au moins 3 caractères."); 
                isFormValidOverall = false; 
            }
            if (lastNameInput && lastName.length < 2) { 
                lastNameInput.setCustomValidity("Le nom doit contenir au moins 2 caractères."); 
                isFormValidOverall = false; 
            }
            if (firstNameInput && firstName.length < 2) { 
                firstNameInput.setCustomValidity("Le prénom doit contenir au moins 2 caractères."); 
                isFormValidOverall = false; 
            }
            if (birthdateInput && birthdate) { // Si le champ est rempli (required géré par checkValidity)
                const today = new Date();
                const birthDateObj = new Date(birthdate);
                today.setHours(0,0,0,0); // Ignorer l'heure pour la comparaison
                birthDateObj.setHours(0,0,0,0);
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
            } else if (birthdateInput && birthdateInput.hasAttribute('required') && !birthdate) {
                 birthdateInput.setCustomValidity("La date de naissance est requise."); // Au cas où checkValidity ne suffirait pas
                isFormValidOverall = false;
            }
            if (phoneInput && phone && !phoneRegex.test(phone)) { 
                phoneInput.setCustomValidity("Le format du téléphone est incorrect (ex: 0612345678)."); 
                isFormValidOverall = false; 
            } else if (phoneInput && phoneInput.hasAttribute('required') && !phone) {
                phoneInput.setCustomValidity("Le numéro de téléphone est requis.");
                isFormValidOverall = false;
            }
            if (passwordInput && password && !passwordRegex.test(password)) { 
                passwordInput.setCustomValidity(passwordRequirementsMessage); 
                isFormValidOverall = false; 
            } else if (passwordInput && passwordInput.hasAttribute('required') && !password) {
                passwordInput.setCustomValidity("Le mot de passe est requis.");
                isFormValidOverall = false;
            }
            if (confirmPasswordInput && password && confirmPassword !== password) { 
                confirmPasswordInput.setCustomValidity("La confirmation ne correspond pas au mot de passe."); 
                isFormValidOverall = false; 
            } else if (confirmPasswordInput && confirmPasswordInput.hasAttribute('required') && !confirmPassword) {
                confirmPasswordInput.setCustomValidity("La confirmation du mot de passe est requise.");
                isFormValidOverall = false;
            }
            
            if (!isFormValidOverall) {
                registerForm.reportValidity(); // Affiche les messages des setCustomValidity et des validations HTML5
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = "Veuillez corriger les erreurs indiquées dans le formulaire.";
                    errorMessageDiv.classList.remove('d-none', 'alert-success', 'alert-info');
                    errorMessageDiv.classList.add('alert-danger');
                }
            } else {
                // Le formulaire est valide côté client, nous allons appeler l'API
                const userData = { 
                    username: username, 
                    firstName: firstName, 
                    lastName: lastName, 
                    email: email, 
                    password: password, // Envoyé en clair, PHP s'occupera du hashage
                    birthdate: birthdate, 
                    phone: phone 
                };
                
                const submitButton = registerForm.querySelector('button[type="submit"]');
                if(submitButton) {
                    submitButton.disabled = true; // Désactiver le bouton pendant l'appel
                }
                if (errorMessageDiv) {
                    errorMessageDiv.textContent = 'Inscription en cours...';
                    errorMessageDiv.classList.remove('d-none', 'alert-danger', 'alert-success');
                    errorMessageDiv.classList.add('alert-info');
                }

                fetch('/api/register.php', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(userData)
                })
                .then(response => {
                    // Essayer de parser en JSON. Si ce n'est pas du JSON, attraper l'erreur et lire comme texte.
                    return response.json()
                        .then(data => ({ status: response.status, body: data, ok: response.ok }))
                        .catch(jsonError => {
                            console.error("Erreur de parsing JSON de la réponse:", jsonError);
                            // La réponse n'était pas du JSON (ex: erreur PHP affichée en HTML)
                            return response.text().then(textData => {
                                // Forger un objet d'erreur pour le .catch() global du fetch ou le prochain .then()
                                throw new Error(`Réponse non-JSON du serveur (statut ${response.status}): ${textData.substring(0,200)}...`);
                            });
                        });
                })
                .then(({ status, body, ok }) => { // Destructuration après un parsing JSON réussi
                    if (submitButton) {
                        submitButton.disabled = false; // Réactiver le bouton
                    }

                    if (ok && body.success) { // 'ok' est vrai pour les statuts HTTP 200-299
                        if (errorMessageDiv) {
                            errorMessageDiv.textContent = body.message || 'Inscription réussie ! Vous pouvez maintenant vous connecter.';
                            errorMessageDiv.classList.remove('d-none', 'alert-danger', 'alert-info');
                            errorMessageDiv.classList.add('alert-success');
                        }
                        registerForm.reset(); // Vider le formulaire après succès
                        setTimeout(() => { // Redirection vers l'accueil après inscription réussie
                            if (typeof LoadContentPage === "function") {
                                window.history.pushState({}, "", "/");
                                LoadContentPage();
                            } else {
                                console.warn("LoadContentPage non disponible, redirection classique vers /.");
                                window.location.href = "/"; // Fallback
                            }
                        }, 1000);
                    } else {
                        // Erreur logique renvoyée par l'API (ex: validation serveur, email déjà utilisé)
                        const message = body.message || "Une erreur est survenue lors de l'inscription.";
                        let errorDetails = (body.errors && Array.isArray(body.errors)) ? body.errors.join(' ') : '';
                        console.error('Erreur API inscription (handler):', status, body);
                        if (errorMessageDiv) {
                            errorMessageDiv.textContent = `${message} ${errorDetails}`.trim();
                            errorMessageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                            errorMessageDiv.classList.add('alert-danger');
                        }
                    }
                })
                .catch(error => { // Erreur réseau, ou erreur levée par le parsing JSON raté, ou autre erreur JS
                    if (submitButton) {
                        submitButton.disabled = false;
                    }
                    console.error('Erreur Fetch globale (inscription) ou dans le traitement de la réponse:', error);
                    if (errorMessageDiv) {
                        errorMessageDiv.textContent = 'Erreur de communication avec le serveur ou réponse inattendue. ' + error.message;
                        errorMessageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                        errorMessageDiv.classList.add('alert-danger');
                    }
                });
            }
        }); 
    } 
}