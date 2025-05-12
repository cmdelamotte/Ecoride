// assets/js/accountPageHandler.js

import { getRole, showAndHideElementsForRoles, signout as authManagerSignout } from './authManager.js';
import { LoadContentPage } from '../../router/Router.js'; 

function toggleDriverInfoSection(currentRole) {
    const driverInfoSection = document.getElementById('driver-info-section');
    if (driverInfoSection) {
        if (currentRole === 'driver' || currentRole === 'passenger-driver') {
            driverInfoSection.classList.remove('d-none');
        } else {
            driverInfoSection.classList.add('d-none');
        }
    } else {
        console.warn("AccountPageHandler: Section 'driver-info-section' non trouvée.");
    }
}

function preselectUserRole(currentRole) {
    const roleRadios = document.querySelectorAll('input[name="user_role_form"]');
    let roleActuallySelected = false;
    if (currentRole) {
        roleRadios.forEach(radio => {
            if (radio.value === currentRole) {
                radio.checked = true;
                roleActuallySelected = true;
            } else {
                radio.checked = false;
            }
        });
    }
    if (!roleActuallySelected) {
        const defaultCheckedRadio = document.querySelector('input[name="user_role_form"][checked]');
        if (!document.querySelector('input[name="user_role_form"]:checked') && defaultCheckedRadio) {
            defaultCheckedRadio.checked = true; 
        } else if (!document.querySelector('input[name="user_role_form"]:checked') && roleRadios.length > 0) {
            const passengerRadio = document.getElementById('passenger-role');
            if (passengerRadio) passengerRadio.checked = true;
            else if (roleRadios.length > 0) roleRadios[0].checked = true;
        }
    }
}

export function initializeAccountPage() {
    console.log("AccountPageHandler: Initialisation de la page Mon Espace.");

    const roleForm = document.getElementById('role-form');
    const userPseudoSpan = document.getElementById('account-username-display');
    const userEmailSpan = document.getElementById('account-email-display');   
    const userCreditsSpan = document.getElementById('account-credits');

    const usernameInput = document.getElementById('account-username-input');
    const emailInput = document.getElementById('account-email-input');
    
    const editPersonalInfoBtn = document.getElementById('edit-personal-info-btn');
    const cancelEditPersonalInfoBtn = document.getElementById('cancel-edit-personal-info-btn');
    const viewModeButtons = document.getElementById('view-mode-buttons');
    const editModeButtons = document.getElementById('edit-mode-buttons');
    const personalInfoForm = document.getElementById('personal-info-form');

    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const confirmDeleteModalElement = document.getElementById('confirmDeleteAccountModal');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
    let confirmDeleteModal = null;
    if (confirmDeleteModalElement) {
        confirmDeleteModal = new bootstrap.Modal(confirmDeleteModalElement);
    }

    // Éléments pour la gestion du formulaire de véhicule
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const cancelVehicleFormBtn = document.getElementById('cancel-vehicle-form-btn');
    // const driverDetailsForm = document.getElementById('driver-details-form'); // Le formulaire qui contient les véhicules et préférences

    let currentUsername = sessionStorage.getItem('simulatedUserPseudo') || "[PseudoUtilisateur]";
    let currentEmail = sessionStorage.getItem('simulatedUserEmail') || "[EmailUtilisateur]";

    if (userPseudoSpan) userPseudoSpan.textContent = currentUsername;
    if (userEmailSpan) userEmailSpan.textContent = currentEmail;
    if (userCreditsSpan) userCreditsSpan.textContent = sessionStorage.getItem('simulatedUserCredits') || "[CréditsUtilisateur]";

    const currentRole = getRole(); 
    preselectUserRole(currentRole); 
    toggleDriverInfoSection(currentRole); 

    function switchToEditMode() {
        if (userPseudoSpan) userPseudoSpan.classList.add('d-none');
        if (usernameInput) {
            usernameInput.value = (currentUsername === "[PseudoUtilisateur]" || currentUsername === userPseudoSpan.textContent) ? "" : currentUsername;
            usernameInput.classList.remove('d-none');
            usernameInput.focus(); 
        }
        if (userEmailSpan) userEmailSpan.classList.add('d-none');
        if (emailInput) {
            emailInput.value = (currentEmail === "[EmailUtilisateur]" || currentEmail === userEmailSpan.textContent) ? "" : currentEmail;
            emailInput.classList.remove('d-none');
        }
        if (viewModeButtons) viewModeButtons.classList.add('d-none');
        if (editModeButtons) editModeButtons.classList.remove('d-none');
    }

    function switchToViewMode() {
        const usernameDisplay = document.getElementById('account-username-display'); // Récupérer ici car peut-être pas défini globalement si le span est caché
        const emailDisplay = document.getElementById('account-email-display');

        if (usernameDisplay) usernameDisplay.classList.remove('d-none');
        if (usernameInput) usernameInput.classList.add('d-none');
        if (emailDisplay) emailDisplay.classList.remove('d-none');
        if (emailInput) emailInput.classList.add('d-none');
        if (viewModeButtons) viewModeButtons.classList.remove('d-none');
        if (editModeButtons) editModeButtons.classList.add('d-none');
        
        if (userPseudoSpan) userPseudoSpan.textContent = currentUsername; // Mettre à jour l'affichage avec la valeur (potentiellement modifiée ou non)
        if (userEmailSpan) userEmailSpan.textContent = currentEmail;
    }

    if (editPersonalInfoBtn) {
        editPersonalInfoBtn.addEventListener('click', switchToEditMode);
    }

    if (cancelEditPersonalInfoBtn) {
        cancelEditPersonalInfoBtn.addEventListener('click', switchToViewMode);
    }

    if (personalInfoForm) {
        personalInfoForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            if (usernameInput) usernameInput.setCustomValidity("");
            if (emailInput) emailInput.setCustomValidity("");

            let isFormValid = true;
            const newUsername = usernameInput?.value.trim();
            const newEmail = emailInput?.value.trim();

            if (usernameInput && (!newUsername || newUsername.length < 3)) {
                usernameInput.setCustomValidity("Le pseudo doit contenir au moins 3 caractères.");
                isFormValid = false;
            } else if (usernameInput) {
                usernameInput.setCustomValidity("");
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (emailInput && (!newEmail || !emailRegex.test(newEmail))) { 
                emailInput.setCustomValidity("Veuillez entrer une adresse email valide.");
                isFormValid = false;
            } else if (emailInput) {
                emailInput.setCustomValidity("");
            }

            if (!isFormValid) {
                personalInfoForm.reportValidity(); 
                console.log("Validation des informations personnelles échouée.");
                return; 
            }

            console.log("Modifications des infos personnelles soumises (simulation):", { newUsername, newEmail });

            currentUsername = newUsername; 
            currentEmail = newEmail;
            sessionStorage.setItem('simulatedUserPseudo', currentUsername); 
            sessionStorage.setItem('simulatedUserEmail', currentEmail);

            alert("Informations mises à jour (simulation) !");
            switchToViewMode(); 
        });
    }

    if (roleForm) {
        roleForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(roleForm);
            const selectedRole = formData.get('user_role_form'); 

            if (selectedRole) { 
                sessionStorage.setItem('ecoRideUserRole', selectedRole);
                alert(`Rôle mis à jour en : ${selectedRole} (simulation)`);
                toggleDriverInfoSection(selectedRole);
                if (typeof showAndHideElementsForRoles === "function") {
                    showAndHideElementsForRoles(); 
                }
            } else {
                console.warn("AccountPageHandler: Aucun rôle sélectionné.");
            }
        });
    }

    if (deleteAccountBtn && confirmDeleteModal && confirmDeleteBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            confirmDeleteModal.show(); 
        });

        confirmDeleteBtn.addEventListener('click', () => {
            console.log("Suppression du compte confirmée (simulation).");
            confirmDeleteModal.hide(); 
            if (deleteAccountBtn) {
                deleteAccountBtn.focus(); 
            }
            alert("Votre compte a été supprimé (simulation).");
            if (typeof authManagerSignout === "function") { 
                authManagerSignout(); 
            } else {
                console.error("La fonction de déconnexion (authManagerSignout) n'est pas disponible.");
                sessionStorage.clear(); 
                window.location.href = "/"; 
            }
        });
    }

    // --- NOUVELLE LOGIQUE : Gestion de l'affichage du formulaire d'ajout de véhicule ---
    if (addVehicleBtn && vehicleFormContainer) {
        addVehicleBtn.addEventListener('click', () => {
            vehicleFormContainer.classList.remove('d-none'); // Afficher le formulaire
            addVehicleBtn.classList.add('d-none'); // Cacher le bouton "Ajouter un véhicule"
            // TODO: Pré-remplir le formulaire si c'est pour une modification, ou le vider si c'est un ajout.
            // TODO: Mettre le focus sur le premier champ du formulaire de véhicule.
        });
    }

    if (cancelVehicleFormBtn && vehicleFormContainer) {
        cancelVehicleFormBtn.addEventListener('click', () => {
            vehicleFormContainer.classList.add('d-none'); // Cacher le formulaire
            if (addVehicleBtn) addVehicleBtn.classList.remove('d-none'); // Réafficher le bouton "Ajouter un véhicule"
            // TODO: Réinitialiser les champs du formulaire de véhicule.
        });
    }

    // TODO: Logique pour la soumission du formulaire "driver-details-form" (qui contient le formulaire de véhicule et les préférences)
    // Il faudra probablement séparer la soumission du formulaire de véhicule de celle des préférences globales du chauffeur.
    // Pour l'instant, le bouton "Enregistrer Véhicule" est de type="submit" pour un formulaire qui n'a pas d'ID propre
    // et le bouton "Enregistrer les informations Chauffeur" est aussi un type="submit" pour "driver-details-form".
    // Il faudra clarifier quel formulaire soumet quoi.
}
