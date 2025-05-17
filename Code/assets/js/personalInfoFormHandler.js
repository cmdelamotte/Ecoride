export function initializeEditPersonalInfoForm() {
    const form = document.getElementById('edit-personal-info-form');
    if (!form) return;

    const firstNameInput = document.getElementById('edit-first-name');
    const lastNameInput = document.getElementById('edit-last-name');
    const usernameInput = document.getElementById('edit-username');
    const emailInput = document.getElementById('edit-email');
    // Nouveaux champs sélectionnés
    const birthdateInput = document.getElementById('edit-birthdate');
    const phoneInput = document.getElementById('edit-phone');
    // Fin nouveaux champs
    const currentPasswordInput = document.getElementById('edit-info-current-password');
    const messageDiv = document.getElementById('message-edit-personal-info');

    // Regex pour téléphone
    const phoneRegex = /^(0[1-79])\d{8}$/;

    // Liste des inputs pour attacher les listeners 'input' pour l'UX
    const allFormInputs = [
        firstNameInput, lastNameInput, usernameInput, emailInput,
        birthdateInput, phoneInput, // Nouveaux champs inclus ici
        currentPasswordInput
    ];

    form.addEventListener('submit', function(event) {
        event.preventDefault();

        allFormInputs.forEach(input => {
            if (input) input.setCustomValidity("");
        });
        if (messageDiv) {
            messageDiv.classList.add('d-none');
            messageDiv.classList.remove('alert-success', 'alert-danger');
            messageDiv.textContent = '';
        }

        let isFormValidOverall = true;

        if (!form.checkValidity()) {
            isFormValidOverall = false;
        }

        const firstName = firstNameInput?.value.trim();
        const lastName = lastNameInput?.value.trim();
        const username = usernameInput?.value.trim();
        const email = emailInput?.value.trim();
        const birthdate = birthdateInput?.value;
        const phone = phoneInput?.value.trim();
        const currentPassword = currentPasswordInput?.value;

        // Validations JS personnalisées
        if (firstNameInput && firstName.length < 2) {
            firstNameInput.setCustomValidity("Le prénom doit contenir au moins 2 caractères.");
            isFormValidOverall = false;
        }
        if (lastNameInput && lastName.length < 2) {
            lastNameInput.setCustomValidity("Le nom doit contenir au moins 2 caractères.");
            isFormValidOverall = false;
        }
        if (usernameInput && username.length < 3) {
            usernameInput.setCustomValidity("Le pseudo doit contenir au moins 3 caractères.");
            isFormValidOverall = false;
        }
        
        if (birthdateInput && birthdate) {
            const today = new Date();
            const birthDateObj = new Date(birthdate);
            today.setHours(0,0,0,0); 
            birthDateObj.setHours(0,0,0,0);
            let age = today.getFullYear() - birthDateObj.getFullYear();
            const monthDiff = today.getMonth() - birthDateObj.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDateObj.getDate())) {
                age--;
            }
            if (age < 16) {
                birthdateInput.setCustomValidity("Vous devez avoir au moins 16 ans.");
                isFormValidOverall = false;
            }
            if (birthDateObj > today) {
                birthdateInput.setCustomValidity("La date de naissance ne peut pas être dans le futur.");
                isFormValidOverall = false;
            }
        } else if (birthdateInput && birthdateInput.hasAttribute('required') && !birthdate) {
            birthdateInput.setCustomValidity("La date de naissance est requise.");
            isFormValidOverall = false;
        }

        if (phoneInput && phone && !phoneRegex.test(phone)) {
            phoneInput.setCustomValidity("Le format du téléphone est incorrect (ex: 0612345678).");
            isFormValidOverall = false;
        }
        
        if (currentPasswordInput && !currentPassword && currentPasswordInput.hasAttribute('required')) {
            currentPasswordInput.setCustomValidity("Le mot de passe actuel est requis pour confirmer les modifications.");
            isFormValidOverall = false;
        }

        if (!isFormValidOverall) {
            form.reportValidity();
            // console.log("Validation du formulaire 'Modifier mes Informations' échouée."); // Ton log original
            if (messageDiv) {
                messageDiv.textContent = "Veuillez corriger les erreurs et remplir tous les champs requis.";
                messageDiv.classList.remove('d-none');
                messageDiv.classList.add('alert-danger');
            }
        } else {
            // Les valeurs sont maintenant dans les variables
            const dataToSubmit = { // Renommé pour clarté
                firstName: firstName,
                lastName: lastName,
                username: username,
                email: email,
                birthdate: birthdate, // Nouveau
                phone: phone,         // Nouveau
                currentPassword: currentPassword // Important pour la vérification backend
            };
            console.log("Formulaire 'Modifier mes Informations' valide côté client. Données :", dataToSubmit);
            
            // TODO (Plus tard): Appel fetch à l'API backend.
            // fetch('/api/user/update-details', { 
            //    method: 'POST', // ou PUT
            //    body: JSON.stringify(dataToSubmit), 
            //    headers: {'Content-Type': 'application/json', /* ... autres headers (token Auth) ... */ } 
            // })
            //   .then(response => response.json())
            //   .then(data => { 
            //       if (data.success) {
            //           if (messageDiv) { /* ... message succès ... */ }
            //           // Optionnel : mettre à jour sessionStorage si tu l'utilises pour l'état local
            //       } else {
            //           if (messageDiv) { /* ... message erreur serveur ... */ }
            //       }
            //    })
            //   .catch(error => { /* ... gestion erreur fetch ... */ });

            // Simulation actuelle :
            if (messageDiv) {
                messageDiv.textContent = "Informations mises à jour avec succès (simulation) !";
                messageDiv.classList.remove('d-none', 'alert-danger');
                messageDiv.classList.add('alert-success');
            } else {
                alert("Informations mises à jour avec succès (simulation) !");
            }
        }
    });

    allFormInputs.forEach(input => {
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
}