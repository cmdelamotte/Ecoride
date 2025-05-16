import { getRole, showAndHideElementsForRoles, signout as authManagerSignout } from './authManager.js';
import { LoadContentPage } from '../../router/Router.js'; 

/**
 * Affiche ou masque la section des informations du chauffeur en fonction du rôle.
 * @param {string|null} currentRole - Le rôle actuel de l'utilisateur.
 */
function toggleDriverInfoSection(currentRole, driverInfoSectionElement) {
    if (driverInfoSectionElement) {
        if (currentRole === 'driver' || currentRole === 'passenger-driver') {
            driverInfoSectionElement.classList.remove('d-none');
        } else {
            driverInfoSectionElement.classList.add('d-none');
        }
    }
}

/**
 * Pré-coche le bouton radio correspondant au rôle actuel de l'utilisateur.
 * @param {string|null} currentRole - Le rôle actuel de l'utilisateur.
 */
function preselectUserRole(currentRole, radiosNodeList) {
    let roleActuallySelected = false;
    if (currentRole && radiosNodeList) {
        radiosNodeList.forEach(radio => {
            if (radio.value === currentRole) {
                radio.checked = true;
                roleActuallySelected = true;
            } else {
                radio.checked = false;
            }
        });
    }
    // Fallback : s'assurer qu'une option est cochée si aucune ne l'a été par currentRole ou par défaut en HTML
        if (!roleActuallySelected && radiosNodeList && radiosNodeList.length > 0) {
        // Si currentRole n'a rien coché, on applique notre défaut.
        const passengerRadio = document.getElementById('passenger-role');
        if (passengerRadio && Array.from(radiosNodeList).includes(passengerRadio)) {
            passengerRadio.checked = true;
        } else {
            // Si 'passenger-role' n'est pas trouvé ou ne fait pas partie du groupe,
            // on coche le premier radio disponible dans la liste.
            radiosNodeList[0].checked = true;
        }
    }
}


/**
 * Affiche le formulaire d'ajout/modification de véhicule.
 * @param {boolean} isEditing - True si on édite un véhicule existant, false si on en ajoute un nouveau.
 * @param {object|null} vehicleData - Les données du véhicule à éditer (si isEditing est true).
 */
function showVehicleForm(isEditing = false, vehicleData = null) {
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const vehicleForm = document.getElementById('vehicle-form'); 
    const vehicleFormTitle = document.getElementById('vehicle-form-title');
    const editingVehicleIdInput = document.getElementById('editing-vehicle-id');
    const addVehicleBtn = document.getElementById('add-vehicle-btn');

    if (vehicleFormContainer && vehicleForm && vehicleFormTitle && editingVehicleIdInput && addVehicleBtn) {
        vehicleForm.reset(); 

        if (isEditing && vehicleData) {
            vehicleFormTitle.textContent = "Modifier le Véhicule";
            editingVehicleIdInput.value = vehicleData.id || "";
            
            const brandInput = document.getElementById('vehicle-brand');
            const modelInput = document.getElementById('vehicle-model');
            const colorInput = document.getElementById('vehicle-color');
            const plateInput = document.getElementById('vehicle-license-plate');
            const regDateInput = document.getElementById('vehicle-registration-date');
            const seatsInput = document.getElementById('vehicle-seats');
            const electricInput = document.getElementById('vehicle-electric');

            if(brandInput) brandInput.value = vehicleData.brand || "";
            if(modelInput) modelInput.value = vehicleData.model || "";
            if(colorInput) colorInput.value = vehicleData.color || "";
            if(plateInput) plateInput.value = vehicleData.plate || "";
            if(regDateInput) regDateInput.value = vehicleData.registrationDate || "";
            if(seatsInput) seatsInput.value = vehicleData.seats || "";
            if(electricInput) electricInput.checked = vehicleData.isElectric || false;

        } else {
            vehicleFormTitle.textContent = "Ajouter un Véhicule";
            editingVehicleIdInput.value = ""; 
        }
        vehicleFormContainer.classList.remove('d-none');
        addVehicleBtn.classList.add('d-none');
        document.getElementById('vehicle-brand')?.focus();
    } else {
        console.warn("Éléments manquants pour initialiser showVehicleForm.");
    }
}

/**
 * Masque le formulaire d'ajout/modification de véhicule et réaffiche le bouton "Ajouter".
 */
function hideVehicleForm() {
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    if (vehicleFormContainer && addVehicleBtn) {
        vehicleFormContainer.classList.add('d-none');
        addVehicleBtn.classList.remove('d-none');
    }
}

function displayUserVehicles(vehiclesData, vehiclesListElement) {
    if (!vehiclesListElement) {
        console.warn("Élément pour la liste des véhicules non trouvé.");
        return;
    }
    vehiclesListElement.innerHTML = ''; // Vide la liste existante

    if (!vehiclesData || vehiclesData.length === 0) {
        return;
    }

    const template = document.getElementById('vehicle-item-template');
    if (!template) {
        console.error("Template '#vehicle-item-template' introuvable.");
        return;
    }

    vehiclesData.forEach(vehicle => {
        const clone = template.content.cloneNode(true);
        const vehicleElement = clone.querySelector('.vehicle-item');
        if (vehicleElement) {
            vehicleElement.setAttribute('data-vehicle-id', vehicle.id);
            vehicleElement.setAttribute('data-brand', vehicle.brand_name);
            vehicleElement.setAttribute('data-model', vehicle.model_name);
            vehicleElement.setAttribute('data-plate', vehicle.license_plate);
            vehicleElement.setAttribute('data-color', vehicle.color || "");
            vehicleElement.setAttribute('data-reg-date', vehicle.registration_date || "");
            vehicleElement.setAttribute('data-seats', String(vehicle.passenger_capacity));
            vehicleElement.setAttribute('data-is-electric', String(vehicle.is_electric));

            const brandDisplay = vehicleElement.querySelector('.vehicle-brand-display');
            const modelDisplay = vehicleElement.querySelector('.vehicle-model-display');
            const plateDisplay = vehicleElement.querySelector('.vehicle-plate-display');
            
            if (brandDisplay) brandDisplay.textContent = vehicle.brand_name;
            if (modelDisplay) modelDisplay.textContent = vehicle.model_name;
            if (plateDisplay) plateDisplay.textContent = vehicle.license_plate;
            
            vehiclesListElement.appendChild(clone);
        }
    });
}

// === Fonction Principale d'Initialisation de la Page ===
export function initializeAccountPage() {
    console.log("AccountPageHandler: Initialisation de la page Mon Espace.");

    // --- Sélection des éléments du DOM ---
    const roleForm = document.getElementById('role-form');
    const userPseudoSpan = document.getElementById('account-username-display');
    const userEmailSpan = document.getElementById('account-email-display');   
    const userCreditsSpan = document.getElementById('account-credits');
    const lastNameDisplay = document.getElementById('account-last-name-display');
    const firstNameDisplay = document.getElementById('account-first-name-display');
    const birthdateDisplay = document.getElementById('account-birthdate-display');
    const phoneDisplay = document.getElementById('account-phone-display');
    const roleRadios = document.querySelectorAll('input[name="user_role_form"]');
    const driverInfoSection = document.getElementById('driver-info-section');
    
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

    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const vehicleForm = document.getElementById('vehicle-form'); 
    const cancelVehicleFormBtn = document.getElementById('cancel-vehicle-form-btn');
    const vehiclesList = document.getElementById('vehicles-list'); 
    const editingVehicleIdInput = document.getElementById('editing-vehicle-id');
    
    const confirmDeleteVehicleModalElementFromHTML = document.getElementById('confirmDeleteVehicleModal');
    const confirmVehicleDeleteBtn = document.getElementById('confirm-vehicle-delete-btn');
    const vehicleToDeleteInfoSpan = confirmDeleteVehicleModalElementFromHTML?.querySelector('.vehicle-to-delete-info');
    let confirmDeleteVehicleModalInstance = null;
    let vehicleIdToDelete = null; 

    if (confirmDeleteVehicleModalElementFromHTML) { 
        if (!window.confirmDeleteVehicleModalVehicleInstance) {
            window.confirmDeleteVehicleModalVehicleInstance = new bootstrap.Modal(confirmDeleteVehicleModalElementFromHTML);
        }
        confirmDeleteVehicleModalInstance = window.confirmDeleteVehicleModalVehicleInstance;
    }

    const preferencesForm = document.getElementById('driver-preferences-form');
    const prefSmokerInput = document.getElementById('pref-smoker');
    const prefAnimalsInput = document.getElementById('pref-animals');
    const prefCustomTextarea = document.getElementById('pref-custom');

    const logoutAccountBtn = document.getElementById('logout-account-btn');

    if (logoutAccountBtn) {
        logoutAccountBtn.addEventListener('click', (event) => {
            event.preventDefault();
            if (typeof authManagerSignout === 'function') {
                authManagerSignout();
            } else {
                sessionStorage.removeItem('ecoRideUserToken');
                sessionStorage.removeItem('ecoRideUserRole');
                window.location.href = "/";
            }
        });
    }


fetch('http://ecoride.local/api/get_user_profile.php', { 
        method: 'GET',
        headers: {
            'Accept': 'application/json',
        }
    })
    .then(response => {
        console.log("Profil Fetch: Statut Réponse:", response.status);
        if (response.status === 401) {
            console.warn("Utilisateur non authentifié, redirection vers login.");
            if (typeof LoadContentPage === "function") {
                window.history.pushState({}, "", "/login");
                LoadContentPage();
            } else {
                window.location.href = "/"; 
            }
            throw new Error('Non authentifié');
        }
        if (!response.ok) { 
            return response.text().then(text => { 
                throw new Error(`Erreur HTTP ${response.status} lors de la récupération du profil: ${text}`);
            });
        }
        return response.json();
    })
    .then(data => {
        console.log("Profil Fetch: Données reçues:", data);
        if (data.success && data.user) {
            const userData = data.user;
            const vehiclesData = data.vehicles || [];

            // Peuplement des informations personnelles
            if (userPseudoSpan) userPseudoSpan.textContent = userData.username || "[N/A]";
            if (lastNameDisplay) lastNameDisplay.textContent = userData.last_name || "[N/A]";
            if (firstNameDisplay) firstNameDisplay.textContent = userData.first_name || "[N/A]";
            if (userEmailSpan) userEmailSpan.textContent = userData.email || "[N/A]";
            if (userCreditsSpan) userCreditsSpan.textContent = userData.credits !== null ? String(userData.credits) : "[N/A]";

            if (birthdateDisplay) {
                if (userData.birth_date && userData.birth_date.includes('-')) { 
                    const parts = userData.birth_date.split('-');
                    birthdateDisplay.textContent = `${parts[2]}/${parts[1]}/${parts[0]}`;
                } else {
                    birthdateDisplay.textContent = userData.birth_date || "Non renseignée";
                }
            }
            if (phoneDisplay) phoneDisplay.textContent = userData.phone_number || "Non renseigné";

            // Pré-remplissage du rôle fonctionnel et affichage de la section chauffeur
            const currentFunctionalRole = userData.functional_role || 'passenger';
            preselectUserRole(currentFunctionalRole, roleRadios); 
            toggleDriverInfoSection(currentFunctionalRole, driverInfoSection);

            // Pré-remplissage des préférences du chauffeur
            if (currentFunctionalRole === 'driver' || currentFunctionalRole === 'passenger_driver') {
                if (prefSmokerInput) prefSmokerInput.checked = userData.driver_pref_smoker; // Devrait être un booléen du PHP
                if (prefAnimalsInput) prefAnimalsInput.checked = userData.driver_pref_animals; // Idem
                if (prefCustomTextarea) prefCustomTextarea.value = userData.driver_pref_custom || '';
            }

            // Affichage des véhicules
            if(vehiclesList) {
                displayUserVehicles(vehiclesData, vehiclesList);
            } else {
                console.warn("Élément #vehicles-list non trouvé pour afficher les véhicules.");
            }

        } else {
            console.error("Erreur lors de la récupération des données du profil:", data.message || "Format de réponse inattendu.");
        }
    })
    .catch(error => {
    console.error("Erreur Fetch globale pour get_user_profile:", error);

        if (error.message !== 'Non authentifié') {
            console.log("Redirection vers la page 404 suite à une erreur de chargement du profil.");
            if (typeof LoadContentPage === "function") {
                window.history.pushState({}, "", "/404");
                LoadContentPage(); 
            } else {
                // Fallback si LoadContentPage n'est pas dispo
                window.location.href = "/404"; 
            }
        }
});

    // --- Ajout des écouteurs d'événements ---
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
            alert("Votre compte a été supprimé (simulation).");
            if (typeof authManagerSignout === "function") {
                authManagerSignout(); 
            } else { 
                console.error("authManagerSignout non disponible."); 
                sessionStorage.clear(); 
                window.location.href = "/";
            }
        });
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
            
            if (target.classList.contains('edit-vehicle-btn') || target.closest('.edit-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Modifier."); return; }
                const vehicleDataForEdit = { 
                    id: vehicleId, 
                    brand: vehicleItem.getAttribute('data-brand') || "", 
                    model: vehicleItem.getAttribute('data-model') || "", 
                    plate: vehicleItem.getAttribute('data-plate') || "",
                    color: vehicleItem.getAttribute('data-color') || "", 
                    registrationDate: vehicleItem.getAttribute('data-reg-date') || "",    
                    seats: parseInt(vehicleItem.getAttribute('data-seats'), 10) || 1,            
                    isElectric: (vehicleItem.getAttribute('data-is-electric') === 'true') || false        
                };
                showVehicleForm(true, vehicleDataForEdit);
            } else if (target.classList.contains('delete-vehicle-btn') || target.closest('.delete-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Supprimer."); return; }
                vehicleIdToDelete = vehicleId;
                if (vehicleToDeleteInfoSpan) {
                    vehicleToDeleteInfoSpan.textContent = `Marque: ${vehicleItem.getAttribute('data-brand') || "N/A"}, Modèle: ${vehicleItem.getAttribute('data-model') || "N/A"}, Plaque: ${vehicleItem.getAttribute('data-plate') || "N/A"}`;
                }
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
                if (vehicleElementToRemove) {
                    vehicleElementToRemove.remove();
                    alert(`Véhicule ID ${vehicleIdToDelete} supprimé (simulation).`);
                }
                vehicleIdToDelete = null;
            }
            if(confirmDeleteVehicleModalInstance) confirmDeleteVehicleModalInstance.hide();
        });
    }
    
    if (vehicleForm && editingVehicleIdInput && vehiclesList) {
        vehicleForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const brandInput = document.getElementById('vehicle-brand');
            const modelInput = document.getElementById('vehicle-model');
            const colorInput = document.getElementById('vehicle-color');
            const plateInput = document.getElementById('vehicle-license-plate');
            const regDateInput = document.getElementById('vehicle-registration-date');
            const seatsInput = document.getElementById('vehicle-seats');
            const electricInput = document.getElementById('vehicle-electric');
            
            [brandInput, modelInput, plateInput, seatsInput, regDateInput, colorInput].forEach(input => {
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
            const color = colorInput?.value.trim();
            const registrationDate = regDateInput?.value;
            const isElectric = electricInput?.checked || false;
            const currentVehicleId = editingVehicleIdInput.value;

            if (brandInput && !brand) { brandInput.setCustomValidity("La marque est requise."); isVehicleFormValid = false; }
            if (modelInput && !model) { modelInput.setCustomValidity("Le modèle est requis."); isVehicleFormValid = false; }
            if (plateInput && !plate) { plateInput.setCustomValidity("La plaque d'immatriculation est requise."); isVehicleFormValid = false; }
            if (seatsInput && (isNaN(seats) || seats < 1 || seats > 8)) { seatsInput.setCustomValidity("Nombre de places invalide (doit être entre 1 et 8)."); isVehicleFormValid = false; }
            if (regDateInput && registrationDate) {
                const today = new Date().toISOString().split('T')[0];
                if (registrationDate > today) { regDateInput.setCustomValidity("La date d'immatriculation ne peut pas être dans le futur."); isVehicleFormValid = false; }
            } else if (regDateInput && regDateInput.hasAttribute('required') && !registrationDate) {
                regDateInput.setCustomValidity("La date d'immatriculation est requise."); isVehicleFormValid = false;
            }

            if (!isVehicleFormValid) {
                vehicleForm.reportValidity();
                return;
            }

            const vehicleDataFromForm = {
                id: currentVehicleId || `simulated-${Date.now()}`,
                brand, model, color, plate, registrationDate, seats, isElectric
            };

            if (currentVehicleId) { 
                console.log("MODIFICATION Véhicule (simulation):", vehicleDataFromForm);
                const itemToUpdate = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleDataFromForm.id}"]`);
                if (itemToUpdate) {
                    itemToUpdate.setAttribute('data-brand', vehicleDataFromForm.brand);
                    itemToUpdate.setAttribute('data-model', vehicleDataFromForm.model);
                    itemToUpdate.setAttribute('data-plate', vehicleDataFromForm.plate);
                    itemToUpdate.setAttribute('data-color', vehicleDataFromForm.color);
                    itemToUpdate.setAttribute('data-reg-date', vehicleDataFromForm.registrationDate);
                    itemToUpdate.setAttribute('data-seats', vehicleDataFromForm.seats.toString());
                    itemToUpdate.setAttribute('data-is-electric', vehicleDataFromForm.isElectric.toString());
                    
                    itemToUpdate.querySelector('.vehicle-brand-display').textContent = vehicleDataFromForm.brand;
                    itemToUpdate.querySelector('.vehicle-model-display').textContent = vehicleDataFromForm.model;
                    itemToUpdate.querySelector('.vehicle-plate-display').textContent = vehicleDataFromForm.plate;
                    alert("Véhicule modifié (simulation) !");
                }
            } else { 
                console.log("AJOUT Véhicule (simulation):", vehicleDataFromForm);
                const template = document.getElementById('vehicle-item-template');
                if (template) {
                    const clone = template.content.cloneNode(true);
                    const newVehicleElement = clone.querySelector('.vehicle-item');
                    if (newVehicleElement) {
                        newVehicleElement.setAttribute('data-vehicle-id', vehicleDataFromForm.id);
                        newVehicleElement.setAttribute('data-brand', vehicleDataFromForm.brand);
                        newVehicleElement.setAttribute('data-model', vehicleDataFromForm.model);
                        newVehicleElement.setAttribute('data-plate', vehicleDataFromForm.plate);
                        newVehicleElement.setAttribute('data-color', vehicleDataFromForm.color);
                        newVehicleElement.setAttribute('data-reg-date', vehicleDataFromForm.registrationDate);
                        newVehicleElement.setAttribute('data-seats', vehicleDataFromForm.seats.toString());
                        newVehicleElement.setAttribute('data-is-electric', vehicleDataFromForm.isElectric.toString());

                        newVehicleElement.querySelector('.vehicle-brand-display').textContent = vehicleDataFromForm.brand;
                        newVehicleElement.querySelector('.vehicle-model-display').textContent = vehicleDataFromForm.model;
                        newVehicleElement.querySelector('.vehicle-plate-display').textContent = vehicleDataFromForm.plate;
                        
                        vehiclesList.appendChild(newVehicleElement);
                        alert("Véhicule ajouté (simulation) !");
                    }
                }
            }
            hideVehicleForm(); 
        });
    }

        if (prefSmokerInput) { 
            const storedSmokerPref = sessionStorage.getItem('simulatedUserPrefSmoker');
            if (storedSmokerPref !== null) {
                prefSmokerInput.checked = (storedSmokerPref === 'true');
            }
        }

        if (prefAnimalsInput) {
            const storedAnimalsPref = sessionStorage.getItem('simulatedUserPrefAnimals');
            if (storedAnimalsPref !== null) {
                prefAnimalsInput.checked = (storedAnimalsPref === 'true');
            }
        }

        if (prefCustomTextarea) {
            const storedCustomPrefs = sessionStorage.getItem('simulatedUserPrefCustom');
            if (storedCustomPrefs !== null) {
                prefCustomTextarea.value = storedCustomPrefs;
            } else {
                prefCustomTextarea.value = '';
            }
        }
    
        if (preferencesForm) {
        preferencesForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const acceptsSmokers = prefSmokerInput?.checked;
            const acceptsAnimals = prefAnimalsInput?.checked;
            const customPrefs = prefCustomTextarea?.value.trim();

            sessionStorage.setItem('simulatedUserPrefSmoker', acceptsSmokers ? 'true' : 'false');
            sessionStorage.setItem('simulatedUserPrefAnimals', acceptsAnimals ? 'true' : 'false');
            sessionStorage.setItem('simulatedUserPrefCustom', customPrefs);

            console.log("Sauvegarde des préférences (simulation):", { acceptsSmokers, acceptsAnimals, customPrefs });
            alert("Préférences enregistrées (simulation) !");
        });
    }
}