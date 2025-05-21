import { LoadContentPage } from "../../router/Router.js";

export function initializeResetPasswordForm() {
    const resetPasswordForm = document.getElementById('reset-password-form');
    if (!resetPasswordForm) {
        // Si le formulaire n'est pas sur la page, on ne fait rien.
        // Cela peut arriver si la page est chargée sans token valide et qu'on affiche un message d'erreur.
        return;
    }

    const tokenInput = document.getElementById('reset-token-input');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const messageDiv = document.getElementById('message-reset-password');

    // Récupérer le token depuis les paramètres de l'URL
    const queryParams = new URLSearchParams(window.location.search);
    const token = queryParams.get('token');

    if (token && tokenInput) {
        tokenInput.value = token;
    } else if (tokenInput) { // Si pas de token mais le formulaire est là, afficher une erreur
        if (messageDiv) {
            messageDiv.textContent = "Jeton de réinitialisation manquant ou invalide. Veuillez refaire une demande.";
            messageDiv.className = 'alert alert-danger';
        }
        resetPasswordForm.querySelector('button[type="submit"]').disabled = true;
        return; // Ne pas attacher le listener de soumission si pas de token
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le nouveau mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    [newPasswordInput, confirmNewPasswordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.setCustomValidity("");
                if (messageDiv && messageDiv.classList.contains('alert-danger')) {
                    messageDiv.classList.add('d-none');
                    messageDiv.textContent = '';
                }
            });
        }
    });

    resetPasswordForm.addEventListener('submit', async function(event) {
        event.preventDefault();

        if (newPasswordInput) newPasswordInput.setCustomValidity("");
        if (confirmNewPasswordInput) confirmNewPasswordInput.setCustomValidity("");
        if (messageDiv) {
            messageDiv.classList.add('d-none');
            messageDiv.classList.remove('alert-success', 'alert-danger', 'alert-info');
            messageDiv.textContent = '';
        }

        let isFormValidOverall = true;
        if (!resetPasswordForm.checkValidity()) {
            isFormValidOverall = false;
        }

        const newPassword = newPasswordInput?.value;
        const confirmNewPassword = confirmNewPasswordInput?.value;
        const currentToken = tokenInput?.value; // Récupérer le token du champ caché

        if (!currentToken) { // Double vérification
            if (messageDiv) {
                messageDiv.textContent = "Jeton de réinitialisation manquant. Impossible de continuer.";
                messageDiv.className = 'alert alert-danger';
            }
            isFormValidOverall = false;
        }

        if (newPasswordInput && newPassword && !passwordRegex.test(newPassword)) {
            newPasswordInput.setCustomValidity(passwordRequirementsMessage);
            isFormValidOverall = false;
        } else if (newPasswordInput && !newPassword && newPasswordInput.hasAttribute('required')) {
            newPasswordInput.setCustomValidity("Le nouveau mot de passe est requis.");
            isFormValidOverall = false;
        }

        if (confirmNewPasswordInput && newPassword && confirmNewPassword !== newPassword) {
            confirmNewPasswordInput.setCustomValidity("La confirmation ne correspond pas au nouveau mot de passe.");
            isFormValidOverall = false;
        } else if (confirmNewPasswordInput && !confirmNewPassword && confirmNewPasswordInput.hasAttribute('required')) {
            confirmNewPasswordInput.setCustomValidity("La confirmation du mot de passe est requise.");
            isFormValidOverall = false;
        }
            
        if (!isFormValidOverall) {
            resetPasswordForm.reportValidity();
            if (messageDiv && !messageDiv.textContent) {
                messageDiv.textContent = "Veuillez corriger les erreurs indiquées.";
                messageDiv.className = 'alert alert-danger';
            }
            return;
        }
        
        const dataToSend = {
            token: currentToken,
            new_password: newPassword,
            confirm_new_password: confirmNewPassword // Le PHP revérifiera
        };

        if (messageDiv) {
            messageDiv.textContent = 'Réinitialisation en cours...';
            messageDiv.className = 'alert alert-info';
        }
        const submitButton = resetPasswordForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;

        try {
            const response = await fetch('http://ecoride.local/api/perform_password_reset.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(dataToSend)
            });
            const result = await response.json();

            if (messageDiv) {
                messageDiv.textContent = result.message;
                messageDiv.classList.remove('d-none', 'alert-info');
                messageDiv.classList.toggle('alert-success', result.success);
                messageDiv.classList.toggle('alert-danger', !result.success);
            }

            if (result.success) {
                resetPasswordForm.reset();
                if(submitButton) submitButton.textContent = "Redirection..."; // Changer le texte du bouton
                setTimeout(() => {
                    if (typeof LoadContentPage === "function") {
                        window.history.pushState({}, "", "/login");
                        LoadContentPage();
                    } else {
                        window.location.href = "/login";
                    }
                }, 2000); // Délai pour lire le message de succès
            } else {
                if(submitButton) submitButton.disabled = false;
            }
        } catch (error) {
            console.error("Erreur Fetch (perform_password_reset):", error);
            if (messageDiv) {
                messageDiv.textContent = "Erreur de communication avec le serveur. Veuillez réessayer.";
                messageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                messageDiv.classList.add('alert-danger');
            }
            if(submitButton) submitButton.disabled = false;
        }
    });
}