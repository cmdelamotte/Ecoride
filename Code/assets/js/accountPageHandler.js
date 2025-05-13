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
    const lastNameDisplay = document.getElementById('account-last-name-display');
    const firstNameDisplay = document.getElementById('account-first-name-display');
    
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const confirmDeleteAccountModalElement = document.getElementById('confirmDeleteAccountModal');
    const confirmDeleteAccountBtn = document.getElementById('confirm-delete-btn'); 
    let confirmDeleteAccountModal = null;
    if (confirmDeleteAccountModalElement) {
        confirmDeleteAccountModal = new bootstrap.Modal(confirmDeleteAccountModalElement);
    }

    // Éléments pour la gestion des véhicules
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const vehicleForm = document.getElementById('vehicle-form'); 
    const vehicleFormTitle = document.getElementById('vehicle-form-title');
    const editingVehicleIdInput = document.getElementById('editing-vehicle-id');
    const cancelVehicleFormBtn = document.getElementById('cancel-vehicle-form-btn');

    const vehiclesList = document.getElementById('vehicles-list'); 
    const confirmDeleteVehicleModalElementFromHTML = document.getElementById('confirmDeleteVehicleModal'); // Renommé pour éviter conflit de scope
    const confirmVehicleDeleteBtn = document.getElementById('confirm-vehicle-delete-btn');
    const vehicleToDeleteInfoSpan = document.querySelector('#confirmDeleteVehicleModal .vehicle-to-delete-info');
    let confirmDeleteVehicleModalInstance = null; 
    let vehicleIdToDelete = null;

    if (confirmDeleteVehicleModalElementFromHTML) { 
        if (!window.confirmDeleteVehicleModalInstance) { // Assurer une seule initialisation
            window.confirmDeleteVehicleModalInstance = new bootstrap.Modal(confirmDeleteVehicleModalElementFromHTML);
        }
        confirmDeleteVehicleModalInstance = window.confirmDeleteVehicleModalInstance;
    }
    
    if (userPseudoSpan) userPseudoSpan.textContent = sessionStorage.getItem('simulatedUserPseudo') || userPseudoSpan.textContent;
    if (lastNameDisplay) lastNameDisplay.textContent = sessionStorage.getItem('simulatedUserLastName') || lastNameDisplay.textContent;
    if (firstNameDisplay) firstNameDisplay.textContent = sessionStorage.getItem('simulatedUserFirstName') || firstNameDisplay.textContent;
    if (userEmailSpan) userEmailSpan.textContent = sessionStorage.getItem('simulatedUserEmail') || userEmailSpan.textContent;
    if (userCreditsSpan) userCreditsSpan.textContent = sessionStorage.getItem('simulatedUserCredits') || userCreditsSpan.textContent;

    const currentRole = getRole(); 
    preselectUserRole(currentRole); 
    toggleDriverInfoSection(currentRole); 

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

    if (deleteAccountBtn && confirmDeleteAccountModal && confirmDeleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            if(confirmDeleteAccountModal) confirmDeleteAccountModal.show(); 
        });
        confirmDeleteAccountBtn.addEventListener('click', () => {
            console.log("Suppression du compte confirmée (simulation).");
            if(confirmDeleteAccountModal) confirmDeleteAccountModal.hide(); 
            if (deleteAccountBtn) deleteAccountBtn.focus(); 
            alert("Votre compte a été supprimé (simulation).");
            if (typeof authManagerSignout === "function") authManagerSignout(); 
            else { console.error("authManagerSignout non disponible."); sessionStorage.clear(); window.location.href = "/"; }
        });
    }

    function showVehicleForm(isEditing = false, vehicleData = null) {
        if (vehicleFormContainer && vehicleFormTitle && editingVehicleIdInput && addVehicleBtn) {
            if (vehicleForm) vehicleForm.reset(); 

            if (isEditing && vehicleData) {
                vehicleFormTitle.textContent = "Modifier le Véhicule";
                editingVehicleIdInput.value = vehicleData.id || "";
                if(document.getElementById('vehicle-brand')) document.getElementById('vehicle-brand').value = vehicleData.brand || "";
                if(document.getElementById('vehicle-model')) document.getElementById('vehicle-model').value = vehicleData.model || "";
                if(document.getElementById('vehicle-color')) document.getElementById('vehicle-color').value = vehicleData.color || "";
                if(document.getElementById('vehicle-license-plate')) document.getElementById('vehicle-license-plate').value = vehicleData.plate || "";
                if(document.getElementById('vehicle-registration-date')) document.getElementById('vehicle-registration-date').value = vehicleData.registrationDate || "";
                if(document.getElementById('vehicle-seats')) document.getElementById('vehicle-seats').value = vehicleData.seats || "";
                if(document.getElementById('vehicle-electric')) document.getElementById('vehicle-electric').checked = vehicleData.isElectric || false;
            } else {
                vehicleFormTitle.textContent = "Ajouter un Véhicule";
                editingVehicleIdInput.value = ""; 
            }
            vehicleFormContainer.classList.remove('d-none');
            addVehicleBtn.classList.add('d-none');
            document.getElementById('vehicle-brand')?.focus();
        } else {
            console.warn("Éléments manquants pour showVehicleForm.");
        }
    }

    function hideVehicleForm() {
        if (vehicleFormContainer && addVehicleBtn) {
            vehicleFormContainer.classList.add('d-none');
            addVehicleBtn.classList.remove('d-none');
        }
    }

    if (addVehicleBtn) {
        addVehicleBtn.addEventListener('click', () => {
            showVehicleForm(false); 
        });
    }

    if (cancelVehicleFormBtn) {
        cancelVehicleFormBtn.addEventListener('click', hideVehicleForm);
    }

    if (vehiclesList) {
        vehiclesList.addEventListener('click', function(event) {
            const target = event.target;
            const vehicleItem = target.closest('.vehicle-item');
            if (!vehicleItem) return;
            const vehicleId = vehicleItem.getAttribute('data-vehicle-id');
            
            // Récupérer les infos affichées pour le pré-remplissage ou la modale
            const brandDisplayElement = vehicleItem.querySelector('.vehicle-brand-display');
            const modelDisplayElement = vehicleItem.querySelector('.vehicle-model-display');
            const plateDisplayElement = vehicleItem.querySelector('.vehicle-plate-display');
            
            const brand = brandDisplayElement ? brandDisplayElement.textContent : "Marque Inconnue";
            const model = modelDisplayElement ? modelDisplayElement.textContent : "Modèle Inconnu";
            const plate = plateDisplayElement ? plateDisplayElement.textContent : "Plaque Inconnue";
            // Tu devras récupérer les autres valeurs (color, seats, etc.) de manière similaire
            // si tu les affiches dans le vehicle-item et que tu veux les utiliser pour pré-remplir le formulaire.
            // Pour la simulation, on peut mettre des valeurs d'exemple.

            if (target.classList.contains('edit-vehicle-btn') || target.closest('.edit-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Modifier."); return; }
                console.log("Clic sur Modifier véhicule ID:", vehicleId);
                
                const vehicleDataForEdit = { 
                    id: vehicleId, 
                    brand: brand, // Utilise la valeur lue du DOM
                    model: model, 
                    plate: plate,
                    // Pour les autres, on met des exemples car ils ne sont pas dans ton HTML de liste actuel
                    color: "CouleurExemple", 
                    registrationDate: "", 
                    seats: 2, 
                    isElectric: false 
                };
                showVehicleForm(true, vehicleDataForEdit);
            } else if (target.classList.contains('delete-vehicle-btn') || target.closest('.delete-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Supprimer."); return; }
                console.log("Clic sur Supprimer véhicule ID:", vehicleId);
                vehicleIdToDelete = vehicleId; 
                if (vehicleToDeleteInfoSpan) vehicleToDeleteInfoSpan.textContent = `Marque: ${brand}, Modèle: ${model}, Plaque: ${plate}`;
                if (confirmDeleteVehicleModalInstance) { 
                    confirmDeleteVehicleModalInstance.show();
                }
            }
        });
    }

    if (confirmVehicleDeleteBtn && confirmDeleteVehicleModalInstance) {
        confirmVehicleDeleteBtn.addEventListener('click', () => {
            if (vehicleIdToDelete) {
                console.log("Confirmation de suppression pour véhicule ID:", vehicleIdToDelete);
                const vehicleElementToRemove = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleIdToDelete}"]`);
                if (vehicleElementToRemove) vehicleElementToRemove.remove();
                alert(`Véhicule ID ${vehicleIdToDelete} supprimé (simulation).`);
                vehicleIdToDelete = null; 
            }
            if(confirmDeleteVehicleModalInstance) confirmDeleteVehicleModalInstance.hide();
        });
    }
    
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const brandInput = document.getElementById('vehicle-brand');
            const modelInput = document.getElementById('vehicle-model');
            const colorInput = document.getElementById('vehicle-color');
            const plateInput = document.getElementById('vehicle-license-plate');
            const regDateInput = document.getElementById('vehicle-registration-date');
            const seatsInput = document.getElementById('vehicle-seats');
            const electricInput = document.getElementById('vehicle-electric');
            
            [brandInput, modelInput, plateInput, seatsInput, regDateInput].forEach(input => {
                if(input) input.setCustomValidity("");
            });

            let isVehicleFormValid = true;
            if (!vehicleForm.checkValidity()) {
                isVehicleFormValid = false;
            }

            const brand = brandInput?.value.trim();
            const model = modelInput?.value.trim();
            const plate = plateInput?.value.trim();
            const seats = seatsInput ? parseInt(seatsInput.value, 10) : 0;

            if (brandInput && !brand) { 
                brandInput.setCustomValidity("La marque est requise.");
                isVehicleFormValid = false;
            } else if (brandInput) { brandInput.setCustomValidity(""); }
            if (modelInput && !model) {
                modelInput.setCustomValidity("Le modèle est requis.");
                isVehicleFormValid = false;
            } else if (modelInput) { modelInput.setCustomValidity(""); }
            if (plateInput && !plate) { 
                plateInput.setCustomValidity("La plaque d'immatriculation est requise.");
                isVehicleFormValid = false;
            } else if (plateInput) { plateInput.setCustomValidity(""); }
            if (seatsInput && (isNaN(seats) || seats < 1 || seats > 8)) {
                seatsInput.setCustomValidity("Nombre de places invalide (doit être entre 1 et 8).");
                isVehicleFormValid = false;
            } else if (seatsInput) { seatsInput.setCustomValidity(""); }

            if (!isVehicleFormValid) {
                vehicleForm.reportValidity();
                console.log("Validation du formulaire de véhicule échouée.");
                return; 
            }

            const vehicleDataFromForm = {
                id: editingVehicleIdInput.value, 
                brand: brand,
                model: model,
                color: colorInput?.value.trim(),
                plate: plate,
                registrationDate: regDateInput?.value,
                seats: seats,
                isElectric: electricInput?.checked || false
            };

            if (vehicleDataFromForm.id) { 
                console.log("Données du véhicule à MODIFIER (simulation):", vehicleDataFromForm);
                const itemToUpdate = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleDataFromForm.id}"]`);
                if (itemToUpdate) {
                    // --- DÉBUT DE LA CORRECTION POUR LA MISE À JOUR DE L'AFFICHAGE ---
                    const brandDisplay = itemToUpdate.querySelector('.vehicle-brand-display');
                    const modelDisplay = itemToUpdate.querySelector('.vehicle-model-display');
                    const plateDisplay = itemToUpdate.querySelector('.vehicle-plate-display');
                    
                    if(brandDisplay) brandDisplay.textContent = vehicleDataFromForm.brand;
                    if(modelDisplay) modelDisplay.textContent = vehicleDataFromForm.model;
                    if(plateDisplay) plateDisplay.textContent = vehicleDataFromForm.plate;
                    // TODO: Mettre à jour d'autres spans si tu les ajoutes dans le HTML du vehicle-item
                    // (ex: couleur, places, statut électrique)
                    // --- FIN DE LA CORRECTION ---
                }
                alert("Véhicule modifié (simulation) !");
            } else { 
                console.log("Données du véhicule à AJOUTER (simulation):", vehicleDataFromForm);
                const newVehicleId = "simulated-" + Date.now(); 
                const newVehicleElement = document.createElement('div');
                newVehicleElement.className = 'vehicle-item card card-body mb-2';
                newVehicleElement.setAttribute('data-vehicle-id', newVehicleId); 
                // S'assurer que le HTML généré ici inclut bien les spans avec les bonnes classes
                newVehicleElement.innerHTML = `
                    <p class="mb-1">
                        <span class="form-label">Marque :</span> <span class="vehicle-brand-display">${vehicleDataFromForm.brand}</span><br>
                        <span class="form-label">Modèle :</span> <span class="vehicle-model-display">${vehicleDataFromForm.model}</span> - 
                        <span class="form-label">Plaque :</span> <span class="vehicle-plate-display">${vehicleDataFromForm.plate}</span>
                    </p>
                    <div class="mt-2">
                        <button type="button" class="btn btn-sm btn-outline-secondary edit-vehicle-btn">Modifier</button>
                        <button type="button" class="btn btn-sm btn-outline-danger mt-1 mt-sm-0 ms-sm-1 delete-vehicle-btn">Supprimer</button>
                    </div>`;
                if(vehiclesList) vehiclesList.appendChild(newVehicleElement);
                alert("Véhicule ajouté (simulation) !");
            }
            
            hideVehicleForm(); 
        });
    }
}
