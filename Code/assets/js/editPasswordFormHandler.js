// assets/js/editPasswordFormHandler.js

export function initializeEditPasswordForm() {
    const editPasswordForm = document.getElementById('edit-password-form');
    
    const oldPasswordInput = document.getElementById('old-password');
    const newPasswordInput = document.getElementById('new-password');
    const confirmNewPasswordInput = document.getElementById('confirm-new-password');
    const messageDiv = document.getElementById('message-edit-password');

    // Regex pour la validation du nouveau mot de passe (la même que pour l'inscription)
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le nouveau mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    if (editPasswordForm) {
        editPasswordForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation des messages custom précédents
            if (oldPasswordInput) oldPasswordInput.setCustomValidity("");
            if (newPasswordInput) newPasswordInput.setCustomValidity("");
            if (confirmNewPasswordInput) confirmNewPasswordInput.setCustomValidity("");
            if (messageDiv) {
                messageDiv.classList.add('d-none');
                messageDiv.classList.remove('alert-success', 'alert-danger');
                messageDiv.textContent = '';
            }

            let isFormValidOverall = true;

            // Validation HTML5 native (pour required)
            if (!editPasswordForm.checkValidity()) {
                isFormValidOverall = false;
            }

            const oldPassword = oldPasswordInput?.value;
            const newPassword = newPasswordInput?.value;
            const confirmNewPassword = confirmNewPasswordInput?.value;

            // Validation de l'ancien mot de passe (côté client, on vérifie juste qu'il n'est pas vide si 'required')
            // La vraie vérification de l'ancien mot de passe se fera côté serveur.
            // Si 'required' est sur le champ, checkValidity() s'en occupe.

            // Validation du nouveau mot de passe (complexité)
            if (newPasswordInput && newPassword) { 
                if (!passwordRegex.test(newPassword)) {
                    newPasswordInput.setCustomValidity(passwordRequirementsMessage);
                    isFormValidOverall = false;
                } else {
                    newPasswordInput.setCustomValidity("");
                }
            }

            // Validation de la confirmation du nouveau mot de passe
            if (confirmNewPasswordInput && newPassword) { 
                if (confirmNewPassword !== newPassword) {
                    confirmNewPasswordInput.setCustomValidity("La confirmation ne correspond pas au nouveau mot de passe.");
                    isFormValidOverall = false;
                } else {
                    confirmNewPasswordInput.setCustomValidity("");
                }
            }
            
            if (!isFormValidOverall) {
                editPasswordForm.reportValidity(); 
                console.log("Validation du formulaire de modification de mot de passe échouée.");
            } else {
                console.log("Formulaire de modification de mot de passe valide côté client.");
                // NE PAS LOGGER les mots de passe, même l'ancien.
                // console.log("Données (pour debug SEULEMENT, ne pas envoyer l'ancien MdP tel quel au backend si non nécessaire pour l'API):", 
                // { oldPassword, newPassword });
                
                // TODO: Appel fetch vers l'API backend pour modifier le mot de passe.
                // Le backend vérifiera si oldPassword est correct avant de mettre à jour.
                // Exemple de gestion de la réponse du backend :
                // fetch('/api/update-password', { method: 'POST', body: JSON.stringify({ oldPassword, newPassword }) })
                //   .then(response => response.json())
                //   .then(data => {
                //     if (data.success) {
                //       if (messageDiv) {
                //         messageDiv.textContent = "Votre mot de passe a été modifié avec succès !";
                //         messageDiv.classList.remove('d-none', 'alert-danger');
                //         messageDiv.classList.add('alert-success');
                //       }
                //       editPasswordForm.reset(); // Vider le formulaire
                //       // Optionnel: rediriger vers la page de compte après un court délai
                //       // setTimeout(() => { window.history.pushState({}, "", "/account"); LoadContentPage(); }, 2000);
                //     } else {
                //       if (messageDiv) {
                //         messageDiv.textContent = data.message || "Erreur lors de la modification du mot de passe.";
                //         messageDiv.classList.remove('d-none', 'alert-success');
                //         messageDiv.classList.add('alert-danger');
                //       }
                //       // Si l'erreur concerne l'ancien mot de passe, on pourrait le cibler:
                //       if (data.errorField === 'oldPassword' && oldPasswordInput) {
                //           oldPasswordInput.setCustomValidity(data.message);
                //           editPasswordForm.reportValidity(); // Pour afficher l'erreur sur le champ
                //       }
                //     }
                //   })
                //   .catch(error => { /* ... gestion erreur fetch ... */ });

                // Pour l'instant, simulation :
                alert("Mot de passe modifié avec succès (simulation) !"); 
                editPasswordForm.reset();
            }
        });

        // UX: Réinitialiser les messages custom sur input
        [oldPasswordInput, newPasswordInput, confirmNewPasswordInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    input.setCustomValidity("");
                    if (messageDiv) { // Cacher aussi le message global
                        messageDiv.classList.add('d-none');
                        messageDiv.textContent = '';
                    }
                });
            }
        });
    }
}
