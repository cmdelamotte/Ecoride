import { LoadContentPage } from "../../router/Router.js";

export function initializeEditPersonalInfoForm() {
    const form = document.getElementById('edit-personal-info-form');
    if (!form) {
        console.warn("Formulaire 'edit-personal-info-form' non trouvé.");
        return;
    }

    // Sélection des éléments du DOM
    const firstNameInput = document.getElementById('edit-first-name');
    const lastNameInput = document.getElementById('edit-last-name');
    const usernameInput = document.getElementById('edit-username');
    const emailInput = document.getElementById('edit-email');
    const birthdateInput = document.getElementById('edit-birthdate');
    const phoneInput = document.getElementById('edit-phone');
    const currentPasswordInput = document.getElementById('edit-info-current-password');
    const messageDiv = document.getElementById('message-edit-personal-info');

    const phoneRegex = /^(0[1-79])\d{8}$/;
    const allFormInputs = [ 
        firstNameInput, lastNameInput, usernameInput, emailInput,
        birthdateInput, phoneInput, 
        currentPasswordInput 
    ];

    // --- 1. Pré-remplissage du formulaire en appelant l'API de profil ---
    function prefillFormWithApiData() {
        fetch('/api/get_user_profile.php', { method: 'GET', headers: {'Accept': 'application/json'} })
            .then(response => {
                if (response.status === 401) {
                    if (typeof LoadContentPage === "function") {
                        window.history.pushState({}, "", "/login"); LoadContentPage();
                    } else { window.location.href = "/login"
                    }
                    throw new Error('Non authentifié pour modifier les infos.'); 
                }
                if (!response.ok) {
                    return response.text().then(text => {
                        throw new Error(`Erreur HTTP ${response.status} (profil pour édition): ${text.substring(0,100)}`);});
                }
                return response.json();
            })
            .then(data => {
                if (data.success && data.user) {
                    const u = data.user;
                    if (firstNameInput) firstNameInput.value = u.first_name || '';
                    if (lastNameInput) lastNameInput.value = u.last_name || '';
                    if (usernameInput) usernameInput.value = u.username || '';
                    if (emailInput) emailInput.value = u.email || '';
                    if (birthdateInput) {
                        birthdateInput.value = u.birth_date || ''; 
                    }
                    if (phoneInput) phoneInput.value = u.phone_number || '';
                    // Ne pas pré-remplir le champ du mot de passe actuel pour des raisons de sécurité
                } else {
                    console.error("Erreur lors du pré-remplissage des infos:", data.message);
                    if (messageDiv) {
                        messageDiv.textContent = "Impossible de charger vos informations actuelles.";
                        messageDiv.classList.remove('d-none');
                        messageDiv.classList.add('alert-warning');
                    }
                }
            })
            .catch(error => {
                console.error("Erreur Fetch globale (pré-remplissage infos perso):", error);
                if (error.message !== 'Non authentifié' && messageDiv) {
                    messageDiv.textContent = "Erreur de chargement de vos informations. " + error.message;
                    messageDiv.classList.remove('d-none');
                    messageDiv.classList.add('alert-danger');
                }
            });
    }
    prefillFormWithApiData(); // Appeler pour pré-remplir au chargement de la page d'édition

    // --- 2. Gestion de la soumission du formulaire (appel à l'API de mise à jour) ---
    form.addEventListener('submit', function(event) {
        event.preventDefault();

        allFormInputs.forEach(input => { if (input) input.setCustomValidity(""); });
        if (messageDiv) {
            messageDiv.classList.add('d-none');
            messageDiv.classList.remove('alert-success', 'alert-danger', 'alert-warning');
            messageDiv.textContent = '';
        }

        let isFormValidOverall = true;
        if (!form.checkValidity()) isFormValidOverall = false;

        const firstName = firstNameInput?.value.trim();
        const lastName = lastNameInput?.value.trim();
        const username = usernameInput?.value.trim();
        const email = emailInput?.value.trim();
        const birthdate = birthdateInput?.value;
        const phone = phoneInput?.value.trim();
        const currentPassword = currentPasswordInput?.value;

        // Validations JS
        if (firstNameInput && firstName.length < 2) {
            firstNameInput.setCustomValidity("Prénom trop court."); isFormValidOverall = false; }
        if (lastNameInput && lastName.length < 2) {
            lastNameInput.setCustomValidity("Nom trop court."); isFormValidOverall = false; }
        if (usernameInput && username.length < 3) {
            usernameInput.setCustomValidity("Pseudo trop court."); isFormValidOverall = false; }
        if (birthdateInput && birthdate) {
            const today = new Date(); const birthDateObj = new Date(birthdate);
            today.setHours(0,0,0,0); birthDateObj.setHours(0,0,0,0);
            let age = today.getFullYear() - birthDateObj.getFullYear();
            const m = today.getMonth() - birthDateObj.getMonth();
            if (m < 0 || (m === 0 && today.getDate() < birthDateObj.getDate())) {
                age--; }
            if (age < 16) {
                birthdateInput.setCustomValidity("Vous devez avoir au moins 16 ans.");
                isFormValidOverall = false; }
            if (birthDateObj > today) {
                birthdateInput.setCustomValidity("Date de naissance non future.");
                isFormValidOverall = false; }
        } else if (birthdateInput && birthdateInput.hasAttribute('required') && !birthdate) {
            birthdateInput.setCustomValidity("Date de naissance requise.");
            isFormValidOverall = false;
        }
        if (phoneInput && phone && !phoneRegex.test(phone)) {
            phoneInput.setCustomValidity("Format téléphone incorrect.");
            isFormValidOverall = false; }
        else if (phoneInput && phoneInput.hasAttribute('required') && !phone) {
            phoneInput.setCustomValidity("Téléphone requis.");
            isFormValidOverall = false;
        }
        if (currentPasswordInput && !currentPassword && currentPasswordInput.hasAttribute('required')) {
            currentPasswordInput.setCustomValidity("Mot de passe actuel requis.");
            isFormValidOverall = false;
        }
            
        if (!isFormValidOverall) {
            form.reportValidity();
            if (messageDiv) {
                messageDiv.textContent = "Veuillez corriger les erreurs indiquées.";
                messageDiv.classList.remove('d-none');
                messageDiv.classList.add('alert-danger');
            }
            return;
        }

        // Le formulaire est valide côté client, appel de l'API de mise à jour
        const dataToUpdate = { firstName, lastName, username, email, birthdate, phone, currentPassword };
        
        const submitButton = form.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;
        if (messageDiv) {
            messageDiv.textContent = 'Mise à jour en cours...';
            messageDiv.className = 'alert alert-info'; }

        fetch('/api/update_personal_info.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(dataToUpdate)
        })
        .then(response => {
            return response.json().then(data => ({ ok: response.ok, status: response.status, body: data }))
                .catch(jsonError => {
                    console.error("Update Personal Info: Erreur parsing JSON:", jsonError);
                    return response.text().then(textData => {
                        throw new Error(`Réponse non-JSON (statut ${response.status}): ${textData.substring(0,200)}...`);
                    });
                });
        })
        .then(({ ok, body }) => {
            if (submitButton) submitButton.disabled = false;

            if (ok && body.success) {
                if (messageDiv) {
                    messageDiv.textContent = body.message || 'Informations mises à jour avec succès !';
                    messageDiv.className = 'alert alert-success';
                }
                if (body.updated_user_info) {
                    sessionStorage.setItem('username', body.updated_user_info.username);
                    sessionStorage.setItem('simulatedUserFirstName', body.updated_user_info.first_name);
                }
                currentPasswordInput.value = ''; // Vider le champ du mot de passe actuel
                setTimeout(() => {
                            if (typeof LoadContentPage === "function") {
                                window.history.pushState({}, "", "/account");
                                LoadContentPage();
                            } else {
                                window.location.href = "/account"; // Fallback
                            }
                        }, 1000);
            } else {
                let errorMessage = body.message || "Erreur lors de la mise à jour.";
                if (body.errors) {
                    for (const key in body.errors) {
                        errorMessage += `\n- ${key}: ${body.errors[key]}`;
                        // Cibler le champ d'erreur spécifique
                        const errorInput = document.getElementById(`edit-${key.replace('_', '-')}`);
                        if (errorInput) {
                            errorInput.setCustomValidity(body.errors[key]);
                            errorInput.reportValidity(); // Afficher l'erreur sur le champ
                        }
                    }
                }
                if (messageDiv) {
                    messageDiv.textContent = errorMessage.replace(/\n/g, ' '); // Affiche les erreurs dans la div globale
                    messageDiv.className = 'alert alert-danger';
                }
                console.error('Erreur API Update Personal Info:', body);
            }
        })
        .catch(error => {
            if (submitButton) submitButton.disabled = false;
            console.error('Erreur Fetch globale (Update Personal Info):', error);
            if (messageDiv) {
                messageDiv.textContent = 'Erreur de communication. ' + error.message;
                messageDiv.className = 'alert alert-danger';
            }
        });
    });

    // Listeners 'input' pour effacer setCustomValidity et le message global
    allFormInputs.forEach(input => {
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
}