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
        // console.warn("AccountPageHandler: Section 'driver-info-section' non trouvée.");
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
        if (!window.confirmDeleteAccountModalInstance) {
            window.confirmDeleteAccountModalInstance = new bootstrap.Modal(confirmDeleteAccountModalElement);
        }
        confirmDeleteAccountModal = window.confirmDeleteAccountModalInstance;
    }

    // Éléments pour la gestion des véhicules
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const vehicleForm = document.getElementById('vehicle-form'); 
    const vehicleFormTitle = document.getElementById('vehicle-form-title');
    const editingVehicleIdInput = document.getElementById('editing-vehicle-id');
    const cancelVehicleFormBtn = document.getElementById('cancel-vehicle-form-btn');

    const vehiclesList = document.getElementById('vehicles-list'); 
    const confirmDeleteVehicleModalElementFromHTML = document.getElementById('confirmDeleteVehicleModal');
    const confirmVehicleDeleteBtn = document.getElementById('confirm-vehicle-delete-btn');
    const vehicleToDeleteInfoSpan = document.querySelector('#confirmDeleteVehicleModal .vehicle-to-delete-info');
    let confirmDeleteVehicleModalInstance = null; 
    let vehicleIdToDelete = null;

    if (confirmDeleteVehicleModalElementFromHTML) { 
        if (!window.confirmDeleteVehicleModalVehicleInstance) { 
            window.confirmDeleteVehicleModalVehicleInstance = new bootstrap.Modal(confirmDeleteVehicleModalElementFromHTML);
        }
        confirmDeleteVehicleModalInstance = window.confirmDeleteVehicleModalVehicleInstance;
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
            
            const brandDisplayElement = vehicleItem.querySelector('.vehicle-brand-display');
            const modelDisplayElement = vehicleItem.querySelector('.vehicle-model-display');
            const plateDisplayElement = vehicleItem.querySelector('.vehicle-plate-display');
            
            const brand = brandDisplayElement ? brandDisplayElement.textContent : "Marque Inconnue";
            const model = modelDisplayElement ? modelDisplayElement.textContent : "Modèle Inconnu";
            const plate = plateDisplayElement ? plateDisplayElement.textContent : "Plaque Inconnue";

            if (target.classList.contains('edit-vehicle-btn') || target.closest('.edit-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Modifier."); return; }
                // console.log("Clic sur Modifier véhicule ID:", vehicleId);
                
                const vehicleDataForEdit = { 
                    id: vehicleId, 
                    brand: brand, 
                    model: model, 
                    plate: plate,
                    // Récupérer les autres infos si elles sont dans des data-attributes ou des spans cachés
                    color: vehicleItem.getAttribute('data-color') || "CouleurExemple", 
                    registrationDate: vehicleItem.getAttribute('data-reg-date') || "",    
                    seats: parseInt(vehicleItem.getAttribute('data-seats'), 10) || 2,                
                    isElectric: (vehicleItem.getAttribute('data-is-electric') === 'true') || false        
                };
                showVehicleForm(true, vehicleDataForEdit);
            } else if (target.classList.contains('delete-vehicle-btn') || target.closest('.delete-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Supprimer."); return; }
                // console.log("Clic sur Supprimer véhicule ID:", vehicleId);
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
                // console.log("Confirmation de suppression pour véhicule ID:", vehicleIdToDelete);
                const vehicleElementToRemove = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleIdToDelete}"]`);
                if (vehicleElementToRemove) vehicleElementToRemove.remove();
                alert(`Véhicule ID ${vehicleIdToDelete} supprimé (simulation).`);
                vehicleIdToDelete = null; 
            }
            if(confirmDeleteVehicleModalInstance) confirmDeleteVehicleModalInstance.hide();
        });
    }
    
    // --- GESTION DE LA SOUMISSION DU FORMULAIRE VÉHICULE ---
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log("Soumission du formulaire véhicule interceptée.");

            const brandInput = document.getElementById('vehicle-brand');
            const modelInput = document.getElementById('vehicle-model');
            const colorInput = document.getElementById('vehicle-color');
            const plateInput = document.getElementById('vehicle-license-plate');
            const regDateInput = document.getElementById('vehicle-registration-date');
            const seatsInput = document.getElementById('vehicle-seats');
            const electricInput = document.getElementById('vehicle-electric');
            
            // Réinitialiser les customValidity
            [brandInput, modelInput, plateInput, seatsInput, regDateInput, colorInput].forEach(input => {
                if(input) input.setCustomValidity("");
            });

            let isVehicleFormValid = true;
            if (!vehicleForm.checkValidity()) { // Valide 'required', 'min', 'max' etc. du HTML
                isVehicleFormValid = false;
            }

            const brand = brandInput?.value.trim();
            const model = modelInput?.value.trim();
            const plate = plateInput?.value.trim();
            const seats = seatsInput ? parseInt(seatsInput.value, 10) : 0;
            const color = colorInput?.value.trim();
            const registrationDate = regDateInput?.value;
            const isElectric = electricInput?.checked || false;


            // Validations JS personnalisées (exemples)
            if (brandInput && !brand) { 
                brandInput.setCustomValidity("La marque est requise.");
                isVehicleFormValid = false;
            }
            if (modelInput && !model) {
                modelInput.setCustomValidity("Le modèle est requis.");
                isVehicleFormValid = false;
            }
            if (plateInput && !plate) { 
                plateInput.setCustomValidity("La plaque d'immatriculation est requise.");
                isVehicleFormValid = false;
            }
            if (seatsInput && (isNaN(seats) || seats < 1 || seats > 8)) {
                seatsInput.setCustomValidity("Nombre de places invalide (doit être entre 1 et 8).");
                isVehicleFormValid = false;
            }

            if (!isVehicleFormValid) {
                vehicleForm.reportValidity();
                console.log("Validation du formulaire de véhicule échouée.");
                return; 
            }

            const vehicleDataFromForm = {
                id: editingVehicleIdInput.value, 
                brand: brand,
                model: model,
                color: color,
                plate: plate,
                registrationDate: registrationDate,
                seats: seats,
                isElectric: isElectric
            };

            if (vehicleDataFromForm.id) { // Mode édition
                console.log("MODIFICATION Véhicule (simulation):", vehicleDataFromForm);
                const itemToUpdate = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleDataFromForm.id}"]`);
                if (itemToUpdate) {
                    // Mettre à jour les spans d'affichage
                    const brandDisplay = itemToUpdate.querySelector('.vehicle-brand-display');
                    const modelDisplay = itemToUpdate.querySelector('.vehicle-model-display');
                    const plateDisplay = itemToUpdate.querySelector('.vehicle-plate-display');
                    // TODO: Ajouter des spans pour couleur, places, électrique dans le HTML de vehicle-item si tu veux les voir mis à jour
                    
                    if(brandDisplay) brandDisplay.textContent = vehicleDataFromForm.brand;
                    if(modelDisplay) modelDisplay.textContent = vehicleDataFromForm.model;
                    if(plateDisplay) plateDisplay.textContent = vehicleDataFromForm.plate;

                    // Mettre à jour aussi les data-attributes si on les utilise pour pré-remplir
                    itemToUpdate.setAttribute('data-brand', vehicleDataFromForm.brand);
                    itemToUpdate.setAttribute('data-model', vehicleDataFromForm.model);
                    itemToUpdate.setAttribute('data-plate', vehicleDataFromForm.plate);
                    itemToUpdate.setAttribute('data-color', vehicleDataFromForm.color);
                    itemToUpdate.setAttribute('data-reg-date', vehicleDataFromForm.registrationDate);
                    itemToUpdate.setAttribute('data-seats', vehicleDataFromForm.seats.toString());
                    itemToUpdate.setAttribute('data-is-electric', vehicleDataFromForm.isElectric.toString());
                }
                alert("Véhicule modifié (simulation) !");
            } else { // Mode ajout
                console.log("AJOUT Véhicule (simulation):", vehicleDataFromForm);
                const newVehicleId = "simulated-" + Date.now(); 
                
                const newVehicleElement = document.createElement('div');
                newVehicleElement.className = 'vehicle-item card card-body mb-2';
                newVehicleElement.setAttribute('data-vehicle-id', newVehicleId); 
                // Stocker toutes les données dans les data-attributes pour le mode édition futur
                newVehicleElement.setAttribute('data-brand', vehicleDataFromForm.brand);
                newVehicleElement.setAttribute('data-model', vehicleDataFromForm.model);
                newVehicleElement.setAttribute('data-plate', vehicleDataFromForm.plate);
                newVehicleElement.setAttribute('data-color', vehicleDataFromForm.color);
                newVehicleElement.setAttribute('data-reg-date', vehicleDataFromForm.registrationDate);
                newVehicleElement.setAttribute('data-seats', vehicleDataFromForm.seats.toString());
                newVehicleElement.setAttribute('data-is-electric', vehicleDataFromForm.isElectric.toString());

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
