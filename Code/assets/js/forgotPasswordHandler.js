// Code/assets/js/forgotPasswordHandler.js
export function initializeForgotPasswordForm() {
    const forgotPasswordForm = document.getElementById('forgot-password-form');
    const emailInput = document.getElementById('reset-email');
    const messageDiv = document.getElementById('message-forgot-password');

    if (forgotPasswordForm) {
        forgotPasswordForm.addEventListener('submit', async function(event) { // Rendre async
            event.preventDefault();

            if (emailInput) emailInput.setCustomValidity("");
            if (messageDiv) {
                messageDiv.classList.add('d-none');
                messageDiv.classList.remove('alert-success', 'alert-danger', 'alert-info');
                messageDiv.textContent = '';
            }

            let isFormValidOverall = true;
            if (!forgotPasswordForm.checkValidity()) {
                isFormValidOverall = false;
            }
            
            const email = emailInput?.value.trim();
            if (emailInput && !email && emailInput.hasAttribute('required')) { // Si requis et vide
                emailInput.setCustomValidity("L'adresse email est requise.");
                isFormValidOverall = false;
            }


            if (!isFormValidOverall) {
                forgotPasswordForm.reportValidity();
                if (messageDiv && emailInput && emailInput.validationMessage && !messageDiv.textContent) {
                    messageDiv.textContent = emailInput.validationMessage;
                    messageDiv.classList.remove('d-none');
                    messageDiv.classList.add('alert-danger');
                }
                return;
            }
            
            // Afficher un message de chargement
            if (messageDiv) {
                messageDiv.textContent = "Traitement de votre demande...";
                messageDiv.classList.remove('d-none', 'alert-danger', 'alert-success');
                messageDiv.classList.add('alert-info');
            }
            const submitButton = forgotPasswordForm.querySelector('button[type="submit"]');
            if(submitButton) submitButton.disabled = true;

            try {
                const response = await fetch('http://ecoride.local/api/request_password_reset.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: email })
                });
                const result = await response.json();

                if (messageDiv) {
                    messageDiv.textContent = result.message; // L'API renvoie déjà le message générique
                    messageDiv.classList.remove('d-none', 'alert-info');
                    messageDiv.classList.toggle('alert-success', result.success);
                    messageDiv.classList.toggle('alert-danger', !result.success);
                }

                if (result.success) {
                    forgotPasswordForm.reset();
                }

            } catch (error) {
                console.error("Erreur Fetch (request_password_reset):", error);
                if (messageDiv) {
                    messageDiv.textContent = "Erreur de communication avec le serveur. Veuillez réessayer.";
                    messageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                    messageDiv.classList.add('alert-danger');
                }
            } finally {
                if(submitButton) submitButton.disabled = false;
            }
        });

        if (emailInput) {
            emailInput.addEventListener('input', () => {
                emailInput.setCustomValidity("");
                if (messageDiv && messageDiv.classList.contains('alert-danger')) {
                    messageDiv.classList.add('d-none');
                    messageDiv.textContent = '';
                }
            });
        }
    }
}