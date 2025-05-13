export function initializeEditPersonalInfoForm() {
    const form = document.getElementById('edit-personal-info-form');
    if (!form) return;

    const firstNameInput = document.getElementById('edit-first-name');
    const lastNameInput = document.getElementById('edit-last-name');
    const usernameInput = document.getElementById('edit-username'); // Déjà présent
    const emailInput = document.getElementById('edit-email');
    const currentPasswordInput = document.getElementById('edit-info-current-password');
    const messageDiv = document.getElementById('message-edit-personal-info');

    // Liste des inputs pour attacher les listeners 'input' pour l'UX
    const allFormInputs = [firstNameInput, lastNameInput, usernameInput, emailInput, currentPasswordInput];

    // TODO (Plus tard): Pré-remplir les champs avec les données actuelles.
    // if(firstNameInput) firstNameInput.value = sessionStorage.getItem('simulatedUserFirstName') || '';
    // if(lastNameInput) lastNameInput.value = sessionStorage.getItem('simulatedUserLastName') || '';
    // if(usernameInput) usernameInput.value = sessionStorage.getItem('user_pseudo') || ''; // Assure-toi que la clé est correcte
    // if(emailInput) emailInput.value = sessionStorage.getItem('simulatedUserEmail') || '';

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

        if (!form.checkValidity()) { // Valide 'required', 'type="email"' etc. du HTML
            isFormValidOverall = false;
        }

        // Récupération des valeurs directement pour la validation
        const firstName = firstNameInput?.value.trim();
        const lastName = lastNameInput?.value.trim();
        const username = usernameInput?.value.trim(); // <<< VALEUR DU PSEUDO RÉCUPÉRÉE
        const email = emailInput?.value.trim();
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
        if (usernameInput && username.length < 3) { // <<< VALIDATION DU PSEUDO
            usernameInput.setCustomValidity("Le pseudo doit contenir au moins 3 caractères.");
            isFormValidOverall = false;
        }
        // Pas de validation JS pour currentPassword ici, 'required' suffit, le reste est pour le backend.
        // L'email est validé par type="email"

        if (!isFormValidOverall) {
            form.reportValidity();
            console.log("Validation du formulaire 'Modifier mes Informations' échouée.");
            if (messageDiv) {
                messageDiv.textContent = "Veuillez corriger les erreurs et remplir tous les champs requis.";
                messageDiv.classList.remove('d-none');
                messageDiv.classList.add('alert-danger');
            }
        } else {
            // Les valeurs sont maintenant dans les variables
            console.log("Formulaire 'Modifier mes Informations' valide côté client. Données :", {
                firstName: firstName,
                lastName: lastName,
                username: username, // <<< PSEUDO AJOUTÉ AUX DONNÉES
                email: email,
                currentPassword: currentPassword
            });
            
            // TODO (Plus tard): Appel fetch à l'API backend.
            // fetch('/api/user/update-details', { 
            //    method: 'POST', 
            //    body: JSON.stringify({ 
            //        firstName: firstName, 
            //        lastName: lastName,
            //        username: username, // <<< PSEUDO AJOUTÉ À L'ENVOI
            //        email: email, 
            //        currentPassword: currentPassword 
            //    }), 
            //    headers: {'Content-Type': 'application/json'} 
            // })
            //   .then(response => response.json())
            //   .then(data => { ... gestion succès/erreur ... })

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