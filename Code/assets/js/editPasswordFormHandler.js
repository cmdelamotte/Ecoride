import { signout as authManagerSignout } from './authManager.js'; // Pour déconnecter l'utilisateur

export function initializeEditPasswordForm() {
    const editPasswordForm = document.getElementById('edit-password-form');
    if (!editPasswordForm) {
        console.warn("Formulaire 'edit-password-form' non trouvé.");
        return;
    }
    
    const oldPasswordInput = document.getElementById('old-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const messageDiv = document.getElementById('message-edit-password');

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le nouveau mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    // Listeners 'input' pour effacer les messages d'erreur custom
    [oldPasswordInput, newPasswordInput, confirmNewPasswordInput].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.setCustomValidity("");
                if (messageDiv) {
                    messageDiv.classList.add('d-none');
                    messageDiv.textContent = '';
                }
            });
        }
    });

    editPasswordForm.addEventListener('submit', function(event) {
        event.preventDefault(); 

        if (oldPasswordInput) oldPasswordInput.setCustomValidity("");
        if (newPasswordInput) newPasswordInput.setCustomValidity("");
        if (confirmNewPasswordInput) confirmNewPasswordInput.setCustomValidity("");
        if (messageDiv) {
            messageDiv.classList.add('d-none');
            messageDiv.classList.remove('alert-success', 'alert-danger', 'alert-info');
            messageDiv.textContent = '';
        }

        let isFormValidOverall = true;
        if (!editPasswordForm.checkValidity()) { // Validations HTML5
            isFormValidOverall = false;
        }

        const oldPassword = oldPasswordInput?.value; // Ne pas trimmer les mots de passe
        const newPassword = newPasswordInput?.value;
        const confirmNewPassword = confirmNewPasswordInput?.value;

        // Validations JS
        if (newPasswordInput && newPassword && !passwordRegex.test(newPassword)) { 
            newPasswordInput.setCustomValidity(passwordRequirementsMessage); 
            isFormValidOverall = false; 
        }
        if (confirmNewPasswordInput && newPassword && confirmNewPassword !== newPassword) { 
            confirmNewPasswordInput.setCustomValidity("La confirmation ne correspond pas au nouveau mot de passe."); 
            isFormValidOverall = false; 
        }
        // Les champs vides sont gérés par 'required' et checkValidity()
            
        if (!isFormValidOverall) {
            editPasswordForm.reportValidity(); 
            if (messageDiv && !messageDiv.textContent) {
                messageDiv.textContent = "Veuillez corriger les erreurs.";
                messageDiv.className = 'alert alert-danger';
            }
            return; 
        }
        
        // Le formulaire est valide côté client, appel de l'API
        const passwordData = {
            oldPassword: oldPassword,
            newPassword: newPassword,
            confirmNewPassword: confirmNewPassword // Le PHP revérifiera la confirmation et la complexité
        };

        console.log("editPasswordFormHandler: Envoi des données de MàJ mot de passe à l'API.");
        const submitButton = editPasswordForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;
        if (messageDiv) { 
            messageDiv.textContent = 'Mise à jour du mot de passe en cours...';
            messageDiv.className = 'alert alert-info';
        }

        fetch('http://ecoride.local/api/update_password.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(passwordData)
        })
        .then(response => {
            console.log("Update Password Fetch: Statut Réponse:", response.status);
            return response.json().then(data => ({ ok: response.ok, status: response.status, body: data }))
                .catch(jsonError => {
                    console.error("Update Password: Erreur parsing JSON:", jsonError);
                    return response.text().then(textData => {
                        console.log("Update Password: Réponse brute non-JSON:", textData);
                        throw new Error(`Réponse non-JSON (statut ${response.status}) pour MàJ MDP: ${textData.substring(0,200)}...`);
                    });
                });
        })
        .then(({ ok, body }) => {
            if (submitButton) submitButton.disabled = false;
            console.log("Update Password: Réponse API:", body);

            if (ok && body.success) {
                if (messageDiv) {
                    messageDiv.textContent = body.message || 'Mot de passe mis à jour ! Vous allez être déconnecté.';
                    messageDiv.className = 'alert alert-success';
                } else {
                    alert(body.message || 'Mot de passe mis à jour ! Vous allez être déconnecté.');
                }
                editPasswordForm.reset(); 

                // Déconnexion et redirection vers login
                setTimeout(() => {
                    if (typeof authManagerSignout === "function") {
                        authManagerSignout(); // authManager s'occupe de nettoyer sessionStorage et rediriger vers /
                    } else {
                        // Fallback manuel si authManagerSignout n'est pas dispo
                        sessionStorage.clear();
                        window.location.href = "/login";
                    }
                }, 2000);

            } else {
                let errorMessage = body.message || "Erreur lors de la mise à jour du mot de passe.";
                if (body.errors) {
                    for (const key in body.errors) { // key sera 'oldPassword', 'newPassword', ou 'confirmNewPassword'
                        errorMessage += `\n- ${body.errors[key]}`;
                        const errorInput = document.getElementById(key.replace('New', '-new-').toLowerCase()); // Tente de mapper
                        if (errorInput) {
                            errorInput.setCustomValidity(body.errors[key]);
                            errorInput.reportValidity();
                        }
                    }
                }
                if (messageDiv) {
                    messageDiv.textContent = errorMessage.replace(/\n/g, ' ');
                    messageDiv.className = 'alert alert-danger';
                }
                console.error('Erreur API Update Password:', body);
            }
        })
        .catch(error => {
            if (submitButton) submitButton.disabled = false;
            console.error('Erreur Fetch globale (Update Password):', error);
            if (messageDiv) {
                messageDiv.textContent = 'Erreur de communication. ' + error.message;
                messageDiv.className = 'alert alert-danger';
            }
        });
    });
}