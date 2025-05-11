export function initializeForgotPasswordForm() {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('reset-email'); // ID de ton champ email
    const messageDiv = document.getElementById('message-forgot-password'); // Ta div pour les messages

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault();

            // Réinitialisation
            if (emailInput) emailInput.setCustomValidity("");
            if (messageDiv) {
                messageDiv.classList.add('d-none');
                messageDiv.classList.remove('alert-success', 'alert-danger');
                messageDiv.textContent = '';
            }

            let isFormValidOverall = true;

            // Validation HTML5 native (pour required, type="email")
            if (!forgotPasswordForm.checkValidity()) {
                isFormValidOverall = false;
            }
            
            // Pas vraiment de validation JS custom complexe nécessaire ici si type="email" et required sont utilisés.
            // On pourrait ajouter une regex plus stricte pour l'email si besoin.
            const email = emailInput?.value.trim();

            if (!isFormValidOverall) {
                forgotPasswordForm.reportValidity(); // Affiche les messages d'erreur natifs
                console.log("Validation du formulaire de mot de passe oublié échouée.");
                // Optionnel: afficher un message dans messageDiv si on veut un message global en plus des popups
                // if (messageDiv && emailInput && emailInput.validationMessage) {
                //     messageDiv.textContent = emailInput.validationMessage; // Ou un message générique
                //     messageDiv.classList.remove('d-none');
                //     messageDiv.classList.add('alert-danger');
                // }
            } else {
                // Le formulaire est valide côté client
                console.log("Formulaire de mot de passe oublié valide. Email:", email);
                
                // TODO: Appel fetch vers l'API backend pour demander la réinitialisation.
                // Pour l'instant, simulation d'un succès :
                if (messageDiv) {
                    messageDiv.textContent = "Si cette adresse e-mail est associée à un compte, un lien de réinitialisation de mot de passe vient de vous être envoyé.";
                    messageDiv.classList.remove('d-none');
                    messageDiv.classList.remove('alert-danger'); // S'assurer qu'il n'est pas en mode erreur
                    messageDiv.classList.add('alert-success'); // Afficher en mode succès
                }
                forgotPasswordForm.reset(); // vider le formulaire après succès
            }
        });

        // UX: Réinitialiser le message custom sur input
        if (emailInput) {
            emailInput.addEventListener('input', () => {
                emailInput.setCustomValidity("");
                if (messageDiv) { // Cacher aussi le message global si l'utilisateur corrige
                    messageDiv.classList.add('d-none');
                    messageDiv.textContent = '';
                }
            });
        }
    }
}
