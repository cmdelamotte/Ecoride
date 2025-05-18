import { getRole, showAndHideElementsForRoles, signout as authManagerSignout } from './authManager.js';
import { LoadContentPage } from '../../router/Router.js'; 


// -- SECTION DES FONCTIONS HELPER --

/**
 * Affiche ou masque la section des informations du chauffeur.
 * @param {string|null} currentRole - Le rôle fonctionnel actuel.
 * @param {HTMLElement|null} driverInfoSectionElement - L'élément DOM de la section.
 */
function toggleDriverInfoSection(currentRole, driverInfoSectionElement) {
    if (driverInfoSectionElement) {
        const isDriver = currentRole === 'driver' || currentRole === 'passenger_driver';
        driverInfoSectionElement.classList.toggle('d-none', !isDriver);
    } else {
        console.warn("toggleDriverInfoSection: driverInfoSectionElement non fourni.");
    }
}

/**
 * Pré-coche le bouton radio du rôle fonctionnel.
 * @param {string|null} currentRole - Le rôle fonctionnel actuel.
 * @param {NodeListOf<HTMLInputElement>|null} radiosNodeList - Les boutons radio.
 */
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
 * Peuple la liste déroulante des marques de véhicules.
 * @param {HTMLSelectElement} brandSelectElement - L'élément <select> à peupler.
 */
async function populateBrandSelect(brandSelectElement) {
    if (!brandSelectElement) {
        console.warn("L'élément select pour les marques n'a pas été trouvé.");
        return;
    }
    function setSelectMessage(messageText) {
        brandSelectElement.innerHTML = ''; 
        const option = document.createElement('option');
        option.value = ""; option.textContent = messageText; option.disabled = true; option.selected = true;
        brandSelectElement.appendChild(option);
    }
    setSelectMessage('Chargement des marques...');
    try {
        const response = await fetch('http://ecoride.local/api/get_brands.php');
        if (!response.ok) throw new Error(`Erreur HTTP ${response.status} (marques)`);
        const data = await response.json();
        if (data.success && data.brands && data.brands.length > 0) {
            brandSelectElement.innerHTML = ''; 
            const defaultOption = document.createElement('option');
            defaultOption.value = ""; defaultOption.textContent = "Sélectionnez une marque...";
            defaultOption.disabled = true; defaultOption.selected = true;
            brandSelectElement.appendChild(defaultOption);
            data.brands.forEach(brand => {
                const option = document.createElement('option');
                option.value = brand.id; option.textContent = brand.name;
                brandSelectElement.appendChild(option);
            });
        } else {
            setSelectMessage('Aucune marque disponible');
            console.warn("Aucune marque récupérée ou API échec.", data.message || '');
        }
    } catch (error) {
        console.error("Erreur fetch des marques:", error);
        setSelectMessage('Erreur chargement marques');
    }
}

/**
 * Affiche la liste des véhicules de l'utilisateur.
 * @param {Array} vehiclesData - Les données des véhicules.
 * @param {HTMLElement} vehiclesListElement - L'élément DOM de la liste.
 */
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
            vehicleElement.setAttribute('data-brand-id', String(vehicle.brand_id));
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


/**
 * Affiche/masque le formulaire d'ajout/modification de véhicule.
 * @param {boolean} isEditing - True pour édition, false pour ajout.
 * @param {object|null} vehicleData - Données pour pré-remplir en mode édition.
 * @param {object} formElements - Références aux éléments du formulaire véhicule.
 */
function showVehicleForm(isEditing = false, vehicleData = null) {
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const vehicleForm = document.getElementById('vehicle-form'); 
    const vehicleFormTitle = document.getElementById('vehicle-form-title');
    const editingVehicleIdInput = document.getElementById('editing-vehicle-id');
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    
    const brandSelect = document.getElementById('vehicle-brand-select');
    const modelInput = document.getElementById('vehicle-model');
    const colorInput = document.getElementById('vehicle-color');
    const plateInput = document.getElementById('vehicle-license-plate');
    const regDateInput = document.getElementById('vehicle-registration-date');
    const seatsInput = document.getElementById('vehicle-seats');
    const electricInput = document.getElementById('vehicle-electric');

    if (vehicleFormContainer && vehicleForm && vehicleFormTitle && editingVehicleIdInput && addVehicleBtn && brandSelect) {
        vehicleForm.reset(); 

        if (isEditing && vehicleData) {
            vehicleFormTitle.textContent = "Modifier le Véhicule";
            editingVehicleIdInput.value = vehicleData.id || "";
            
            // Pré-remplissage du <select> pour la marque
            if (brandSelect) brandSelect.value = vehicleData.brand_id || ""; 
            
            // Pré-remplissage des autres champs
            if (brandSelect) brandSelect.value = vehicleData.brand_id || "";
            if (modelInput) modelInput.value = vehicleData.model_name || ""; // L'API renvoie model_name
            if (colorInput) colorInput.value = vehicleData.color || "";
            if (plateInput) plateInput.value = vehicleData.license_plate || "";
            if (regDateInput) regDateInput.value = vehicleData.registration_date || "";
            if (seatsInput) seatsInput.value = vehicleData.passenger_capacity || ""; // L'API renvoie passenger_capacity
            if (electricInput) electricInput.checked = vehicleData.is_electric || false; // L'API renvoie is_electric

        } else {
            vehicleFormTitle.textContent = "Ajouter un Véhicule";
            editingVehicleIdInput.value = ""; 
            // S'assurer que le select de marque est sur son option par défaut "Sélectionnez une marque..."
            if (brandSelect) brandSelect.value = ""; 
        }
        vehicleFormContainer.classList.remove('d-none');
        addVehicleBtn.classList.add('d-none');
        if (brandSelect) brandSelect.focus(); // Met le focus sur le select de marque
    } else {
        console.warn("Éléments manquants pour initialiser showVehicleForm (vérifier aussi #vehicle-brand-select).");
    }
}

/**
 * Masque le formulaire véhicule.
 * @param {object} formElements - Références aux éléments du formulaire véhicule.
 */
function hideVehicleForm() {
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    if (vehicleFormContainer && addVehicleBtn) {
        vehicleFormContainer.classList.add('d-none');
        addVehicleBtn.classList.remove('d-none');
    }
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

    const vehicleBrandSelect = document.getElementById('vehicle-brand-select');

    
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
                if (prefSmokerInput) prefSmokerInput.checked = userData.driver_pref_smoker; // booléen du PHP
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
                // Fallback
                window.location.href = "/404"; 
            }
        }
});

    if (vehicleBrandSelect) {
        populateBrandSelect(vehicleBrandSelect);
    } else {
        console.warn("Élément select #vehicle-brand-select non trouvé pour peupler les marques.");
    }

    // --- Ajout des écouteurs d'événements ---
    if (roleForm) {
    roleForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(roleForm);
        const selectedRole = formData.get('user_role_form'); 

        if (selectedRole) { 
            console.log("accountPageHandler: Rôle fonctionnel sélectionné pour MàJ :", selectedRole);

            // Désactive le bouton de soumission du formulaire de rôle
            const roleSubmitButton = roleForm.querySelector('button[type="submit"]');
            if (roleSubmitButton) roleSubmitButton.disabled = true;

            fetch('http://ecoride.local/api/update_user_role.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role: selectedRole }) 
            })
            .then(response => {
                console.log("Update Role Fetch: Statut Réponse:", response.status);
                return response.json().then(data => ({ status: response.status, body: data, ok: response.ok }))
                    .catch(jsonError => {
                        console.error("Update Role: Erreur parsing JSON:", jsonError);
                        return response.text().then(textData => {
                            console.log("Update Role: Réponse brute non-JSON:", textData);
                            throw new Error(`Réponse non-JSON du serveur (statut ${response.status}): ${textData.substring(0,200)}...`);
                        });
                    });
            })
            .then(({ status, body, ok }) => {
                if (roleSubmitButton) roleSubmitButton.disabled = false; // Réactiver le bouton
                console.log("Update Role: Réponse API:", body);

                if (ok && body.success) {
                    alert(body.message || 'Rôle mis à jour avec succès !');

                    // Mettre à jour l'état local dans sessionStorage pour que l'UI reflète le changement
                    // et que authManager.js ait le bon rôle pour la navbar
                    sessionStorage.setItem('userFunctionalRole', body.new_functional_role); // L'API renvoie le nouveau rôle

                    // Déterminer le primaryRoleForUI pour authManager
                    let primaryRoleForUI = body.new_functional_role;
                    // Récupérer les rôles système actuels (ils ne changent pas ici, mais on en a besoin pour la logique)
                    const userRolesSystem = JSON.parse(sessionStorage.getItem('userRolesSystem') || '[]'); 
                                                                                                    
                    if (userRolesSystem.includes('ROLE_ADMIN')) {
                        primaryRoleForUI = 'admin';
                    } else if (userRolesSystem.includes('ROLE_EMPLOYEE')) {
                        primaryRoleForUI = 'employee';
                    }
                    sessionStorage.setItem('ecoRideUserRole', primaryRoleForUI);

                    // Mettre à jour l'affichage de la section chauffeur si nécessaire
                    toggleDriverInfoSection(body.new_functional_role, driverInfoSection);

                    if (typeof showAndHideElementsForRoles === "function") {
                        showAndHideElementsForRoles(); // Mettre à jour la navbar
                    }
                } else {
                    alert(body.message || `Erreur lors de la mise à jour du rôle (statut ${status}).`);
                    console.error("Erreur API Update Role:", body);
                }
            })
            .catch(error => {
                if (roleSubmitButton) roleSubmitButton.disabled = false;
                console.error("Erreur Fetch globale (Update Role):", error);
                alert('Erreur de communication avec le serveur pour la mise à jour du rôle. ' + error.message);
            });
        }
    });
}

if (deleteAccountBtn && confirmDeleteAccountModal && confirmDeleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            if (confirmDeleteAccountModal) confirmDeleteAccountModal.show();
        });

        // Listener pour le bouton de confirmation de suppression de compte
        confirmDeleteAccountBtn.addEventListener('click', () => {
            console.log("accountPageHandler: Confirmation de suppression de compte. Appel API...");

            // Désactiver le bouton pour éviter double clic
            confirmDeleteAccountBtn.disabled = true;

            fetch('http://ecoride.local/api/delete_account.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json' 
                    // Le cookie de session PHPSESSID sera envoyé automatiquement
                },
                // Implémenter la demande supplémentaire de mot de passe ici
            })
            .then(response => {
                console.log("Delete Account Fetch: Statut Réponse:", response.status);
                return response.json().then(data => ({ ok: response.ok, status: response.status, body: data }))
                    .catch(jsonError => {
                        console.error("Delete Account Fetch: Erreur parsing JSON:", jsonError);
                        return response.text().then(textData => {
                            console.log("Delete Account Fetch: Réponse brute non-JSON:", textData);
                            throw new Error(`Réponse non-JSON (statut ${response.status}) pour suppression compte: ${textData.substring(0,100)}...`);
                        });
                    });
            })
.then(({ ok, status, body }) => {
            console.log("Delete Account Fetch: Réponse API:", body);

            if (ok && body.success) {
                alert(body.message || "Votre compte a été supprimé avec succès. Vous allez être déconnecté.");
                
                // --- Nettoyage de la modale avant redirection ---
                if (confirmDeleteAccountModal && typeof confirmDeleteAccountModal.hide === 'function') {
                    // S'assurer que la modale est cachée
                    confirmDeleteAccountModal.hide();

                    // Suppression manuelle du backdrop de Bootstrap
                    setTimeout(() => {
                        const backdrop = document.querySelector('.modal-backdrop');
                        if (backdrop) {
                            backdrop.remove();
                        }
                        // Bootstrap ajoute aussi parfois 'modal-open' au body, ce qui peut bloquer le scroll
                        document.body.classList.remove('modal-open');
                        // Il peut aussi ajouter du padding-right, on le remet à null
                        document.body.style.overflow = ''; 
                        document.body.style.paddingRight = '';

                        // Maintenant on peut appeler signout
                        if (typeof authManagerSignout === "function") {
                            authManagerSignout(); 
                        } else {
                            sessionStorage.clear();
                            window.location.href = "/";
                        }
                    }, 100); // Un petit délai (100ms) pour laisser le temps à hide() de Bootstrap.

                } else { // Fallback si la modale n'est pas gérable via son instance
                    if (typeof authManagerSignout === "function") {
                        authManagerSignout(); 
                    } else {
                        sessionStorage.clear();
                        window.location.href = "/";
                    }
                }

            } else {
                alert(body.message || `Erreur lors de la suppression du compte (statut ${status}).`);
                console.error("Erreur API Delete Account:", body);
                if (confirmDeleteAccountBtn) confirmDeleteAccountBtn.disabled = false;
                if (confirmDeleteAccountModal && typeof confirmDeleteAccountModal.hide === 'function') {
                    confirmDeleteAccountModal.hide(); 
                }
            }
        })
        .catch(error => {
            console.error("Erreur Fetch globale (Delete Account):", error);
            alert('Erreur de communication avec le serveur pour la suppression du compte. ' + error.message);
            if (confirmDeleteAccountBtn) confirmDeleteAccountBtn.disabled = false;
            if (confirmDeleteAccountModal && typeof confirmDeleteAccountModal.hide === 'function') {
                confirmDeleteAccountModal.hide();
            }
        })
        .finally(() => { // Ce finally est peut-être redondant si on gère déjà la fermeture partout
            // vehicleIdToDelete = null; // Tu n'as pas de vehicleIdToDelete pour la suppression de compte
            // if(confirmDeleteAccountModal) confirmDeleteAccountModal.hide(); // Déjà fait
        });
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
            if (!vehicleItem)
                return;

            const vehicleId = vehicleItem.getAttribute('data-vehicle-id');
            
            if (target.classList.contains('edit-vehicle-btn') || target.closest('.edit-vehicle-btn')) {
                if (!vehicleId) { 
                    console.error("ID de véhicule manquant pour Modifier.");
                    return; }
                const vehicleDataForEdit = { 
                    id: vehicleId, 
                    brand_id: vehicleItem.getAttribute('data-brand-id'),
                    model_name: vehicleItem.getAttribute('data-model'),
                    license_plate: vehicleItem.getAttribute('data-plate'),
                    color: vehicleItem.getAttribute('data-color') || "", 
                    registration_date: vehicleItem.getAttribute('data-reg-date'),
                    passenger_capacity: parseInt(vehicleItem.getAttribute('data-seats'), 10) || 1,       
                    is_electric: (vehicleItem.getAttribute('data-is-electric') === 'true') || false     
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

    // Listener pour la confirmation de suppression de VÉHICULE
    if (confirmVehicleDeleteBtn && confirmDeleteVehicleModalInstance && vehiclesList) { // Ajout de vehiclesList pour être sûr qu'il est dispo
        confirmVehicleDeleteBtn.addEventListener('click', () => {
            if (vehicleIdToDelete) {
                console.log("Confirmation de suppression pour véhicule ID:", vehicleIdToDelete);

                // Désactiver le bouton de confirmation pendant l'appel
                confirmVehicleDeleteBtn.disabled = true;

                fetch('http://ecoride.local/api/delete_vehicle.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ vehicle_id: parseInt(vehicleIdToDelete, 10) }) // L'API attend vehicle_id
                })
                .then(response => {
                    console.log("Delete Vehicle Fetch: Statut Réponse:", response.status);
                    return response.json().then(data => ({ ok: response.ok, status: response.status, body: data }))
                        .catch(jsonError => {
                            console.error("Delete Vehicle Fetch: Erreur parsing JSON:", jsonError);
                            return response.text().then(textData => {
                                console.log("Delete Vehicle Fetch: Réponse brute non-JSON:", textData);
                                throw new Error(`Réponse non-JSON (statut ${response.status}) pour suppression véhicule: ${textData.substring(0,100)}...`);
                            });
                        });
                })
                .then(({ ok, status, body }) => {
                    confirmVehicleDeleteBtn.disabled = false; // Réactiver le bouton
                    console.log("Delete Vehicle Fetch: Réponse API:", body);

                    if (ok && body.success) {
                        alert(body.message || `Véhicule ID ${vehicleIdToDelete} supprimé avec succès !`);
                        
                        // Supprimer l'élément de la liste côté client
                        const vehicleElementToRemove = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleIdToDelete}"]`);
                        if (vehicleElementToRemove) {
                            vehicleElementToRemove.remove();
                        } else {
                            console.warn("L'élément véhicule à supprimer du DOM n'a pas été trouvé après succès API.");
                        }
                    } else {
                        // Gérer les erreurs renvoyées par l'API (ex: non autorisé, véhicule non trouvé, contrainte FK)
                        alert(body.message || `Erreur lors de la suppression du véhicule (statut ${status}).`);
                        console.error("Erreur API Delete Vehicle:", body);
                    }
                })
                .catch(error => {
                    confirmVehicleDeleteBtn.disabled = false;
                    console.error("Erreur Fetch globale (Delete Vehicle):", error);
                    alert('Erreur de communication avec le serveur pour la suppression du véhicule. ' + error.message);
                })
                .finally(() => {
                    vehicleIdToDelete = null; // Réinitialise l'ID stocké
                    if(confirmDeleteVehicleModalInstance) confirmDeleteVehicleModalInstance.hide();
                });
            } else {
                console.warn("Tentative de suppression sans vehicleIdToDelete défini.");
                if(confirmDeleteVehicleModalInstance) confirmDeleteVehicleModalInstance.hide();
            }
        });
    }
    
    if (vehicleForm) {
        vehicleForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const vehicleBrandSelect = document.getElementById('vehicle-brand-select');
            const modelInput = document.getElementById('vehicle-model');
            const colorInput = document.getElementById('vehicle-color');
            const plateInput = document.getElementById('vehicle-license-plate');
            const regDateInput = document.getElementById('vehicle-registration-date');
            const seatsInput = document.getElementById('vehicle-seats');
            const electricInput = document.getElementById('vehicle-electric');
            
            [vehicleBrandSelect, modelInput, plateInput, seatsInput, regDateInput, colorInput].forEach(input => {
                if(input) input.setCustomValidity("");
            });

            let isVehicleFormValid = true;
            if (!vehicleForm.checkValidity()) { 
                isVehicleFormValid = false;
            }

            const brandId = vehicleBrandSelect ? vehicleBrandSelect.value : null;
            const model = modelInput?.value.trim();
            const plate = plateInput?.value.trim();
            const seats = seatsInput ? parseInt(seatsInput.value, 10) : 0;
            const color = colorInput?.value.trim();
            const registrationDate = regDateInput?.value;
            const isElectric = electricInput?.checked || false;

            if (vehicleBrandSelect && !brandId && vehicleBrandSelect.hasAttribute('required')) {
                // Le message HTML5 "Veuillez sélectionner un élément dans la liste." sera affiché par reportValidity().
                isVehicleFormValid = false;
            }
            if (modelInput && !model) {
                modelInput.setCustomValidity("Le modèle est requis.");
                isVehicleFormValid = false; }
            if (plateInput && !plate) {
                plateInput.setCustomValidity("La plaque d'immatriculation est requise.");
                isVehicleFormValid = false; }
            if (seatsInput && (isNaN(seats) || seats < 1 || seats > 8)) {
                seatsInput.setCustomValidity("Nombre de places invalide (doit être entre 1 et 8).");
                isVehicleFormValid = false; }
            if (regDateInput && registrationDate) {
                const today = new Date().toISOString().split('T')[0];
                if (registrationDate > today) { regDateInput.setCustomValidity("La date d'immatriculation ne peut pas être dans le futur."); isVehicleFormValid = false; }
            } else if (regDateInput && regDateInput.hasAttribute('required') && !registrationDate) {
                regDateInput.setCustomValidity("La date d'immatriculation est requise.");
                isVehicleFormValid = false;
            }

            if (!isVehicleFormValid) {
                vehicleForm.reportValidity();
                return;
            }

            const currentVehicleId = editingVehicleIdInput.value;

            const vehicleDataFromForm = {
                id: currentVehicleId || `simulated-${Date.now()}`,
                brandId, model, color, plate, registrationDate, seats, isElectric
            };

            const vehicleDataToSend = { 
                brand_id: brandId ? parseInt(brandId, 10) : null, 
                model_name: model,
                color: color,
                license_plate: plate,
                registration_date: registrationDate,
                passenger_capacity: seats,
                is_electric: isElectric,
            };
            console.log("Données du véhicule prêtes à être envoyées à l'API (avant if/else ajout/modif):", vehicleDataToSend);


            if (currentVehicleId) { 
                console.log("Préparation pour MODIFIER Véhicule via API. Données:", vehicleDataToSend, "pour ID:", currentVehicleId);
                
                // L'objet vehicleDataToSend contient déjà les nouvelles valeurs.
                // Ajout de l'ID du véhicule à mettre à jour, que l'API attend.
                const dataToSendWithId = { 
                    ...vehicleDataToSend, id: parseInt(currentVehicleId, 10) }; // Ajoute l'ID

                const submitButton = vehicleForm.querySelector('button[type="submit"]');
                if (submitButton) submitButton.disabled = true;

                fetch('http://ecoride.local/api/update_vehicle.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSendWithId) // Envoie les données avec l'ID du véhicule
                })
                .then(response => {
                    console.log("Update Vehicle Fetch: Statut Réponse:", response.status);
                    return response.json().then(data => ({ ok: response.ok, status: response.status, body: data }))
                        .catch(jsonError => {
                            console.error("Update Vehicle Fetch: Erreur parsing JSON:", jsonError);
                            return response.text().then(textData => {
                                console.log("Update Vehicle Fetch: Réponse brute non-JSON:", textData);
                                throw new Error(`Réponse non-JSON (statut ${response.status}) pour modif véhicule: ${textData.substring(0,100)}...`);
                            });
                        });
                })
                .then(({ ok, body }) => {
                    if (submitButton) submitButton.disabled = false;
                    console.log("Update Vehicle Fetch: Réponse API:", body);

                    if (ok && body.success && body.vehicle) {
                        alert(body.message || "Véhicule mis à jour avec succès !");
                        
                        // --- Mise à jour de l'affichage du véhicule modifié dans la liste ---
                        const itemToUpdate = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${currentVehicleId}"]`);
                        if (itemToUpdate) {
                            // Met à jour les data-attributes et le texte affiché avec les données renvoyées par l'API
                            // body.vehicle contient les données à jour du véhicule
                            itemToUpdate.setAttribute('data-brand-id', String(body.vehicle.brand_id));
                            itemToUpdate.setAttribute('data-brand', body.vehicle.brand_name);
                            itemToUpdate.setAttribute('data-model', body.vehicle.model_name);
                            itemToUpdate.setAttribute('data-plate', body.vehicle.license_plate);
                            itemToUpdate.setAttribute('data-color', body.vehicle.color || "");
                            itemToUpdate.setAttribute('data-reg-date', body.vehicle.registration_date || "");
                            itemToUpdate.setAttribute('data-seats', String(body.vehicle.passenger_capacity));
                            itemToUpdate.setAttribute('data-is-electric', String(body.vehicle.is_electric));

                            itemToUpdate.querySelector('.vehicle-brand-display').textContent = body.vehicle.brand_name;
                            itemToUpdate.querySelector('.vehicle-model-display').textContent = body.vehicle.model_name;
                            itemToUpdate.querySelector('.vehicle-plate-display').textContent = body.vehicle.license_plate;
                        } else {
                            console.warn("L'élément véhicule à mettre à jour n'a pas été trouvé dans le DOM. Un rechargement peut être nécessaire.");
                        }
                        hideVehicleForm();
                    } else {
                        // Gérer les erreurs renvoyées par l'API (ex: validation serveur, plaque dupliquée)
                        let errorMessage = body.message || "Erreur lors de la modification du véhicule.";
                        if (body.errors) {
                            for (const key in body.errors) {
                                errorMessage += `\n- ${key}: ${body.errors[key]}`;
                            }
                        }
                        alert(errorMessage);
                        console.error("Erreur API Update Vehicle:", body);
                    }
                })
                .catch(error => {
                    if (submitButton) submitButton.disabled = false;
                    console.error("Erreur Fetch globale (Update Vehicle):", error);
                    alert('Erreur de communication avec le serveur pour la modification du véhicule. ' + error.message);
                });
            } else { 
                console.log("Préparation pour AJOUTER Véhicule via API. Données:", vehicleDataToSend);
                
                const submitButton = vehicleForm.querySelector('button[type="submit"]');
                if (submitButton) submitButton.disabled = true;

                fetch('http://ecoride.local/api/add_vehicle.php', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(vehicleDataToSend)
                })
                .then(response => {
                    return response.json().then(data => ({ ok: response.ok, status: response.status, body: data }))
                        .catch(jsonError => {
                            console.error("Add Vehicle: Erreur parsing JSON:", jsonError);
                            return response.text().then(textData => {
                                console.log("Add Vehicle: Réponse brute non-JSON:", textData);
                                throw new Error(`Réponse non-JSON (statut ${response.status}) pour ajout véhicule: ${textData.substring(0,100)}...`);
                            });
                        });
                })
                .then(({ ok, status, body }) => {
                    if (submitButton) submitButton.disabled = false;

                    if (ok && body.success && body.vehicle) {
                        alert(body.message || "Véhicule ajouté avec succès !");
                        hideVehicleForm(); 

                        console.log("Véhicule ajouté. Rechargement de la page Mon Compte pour voir la mise à jour.");
                        if (typeof LoadContentPage === "function") {
                            LoadContentPage(); 
                        } else {
                            window.location.reload(); 
                        }

                    } else {
                        let errorMessage = body.message || "Erreur lors de l'ajout du véhicule.";
                        if (body.errors) {
                            for (const key in body.errors) {
                                errorMessage += `\n- ${key}: ${body.errors[key]}`;
                            }
                        }
                        alert(errorMessage);
                        console.error("Erreur API Add Vehicle:", body);
                    }
                })
                .catch(error => {
                    if (submitButton) submitButton.disabled = false;
                    console.error("Erreur Fetch globale (Add Vehicle):", error);
                    alert("Erreur de communication avec le serveur pour l'ajout du véhicule. " + error.message);
                });
            }
        });
    }

if (preferencesForm) {
    preferencesForm.addEventListener('submit', function(event) {
        event.preventDefault();
        console.log("accountPageHandler: Soumission du formulaire des préférences.");

        const prefSmoker = prefSmokerInput ? prefSmokerInput.checked : false;
        const prefAnimals = prefAnimalsInput ? prefAnimalsInput.checked : false;
        const prefCustom = prefCustomTextarea ? prefCustomTextarea.value.trim() : "";

        const preferencesData = {
            pref_smoker: prefSmoker,
            pref_animals: prefAnimals,
            pref_custom: prefCustom
        };

        console.log("accountPageHandler: Envoi des préférences à l'API:", preferencesData);

        // Désactiver le bouton de soumission
        const prefSubmitButton = preferencesForm.querySelector('button[type="submit"]');
        if (prefSubmitButton) prefSubmitButton.disabled = true;

        fetch('http://ecoride.local/api/update_driver_preferences.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(preferencesData)
        })
        .then(response => {
            console.log("Update Prefs Fetch: Statut Réponse:", response.status);
            return response.json().then(data => ({ status: response.status, body: data, ok: response.ok }))
                .catch(jsonError => {
                    console.error("Update Prefs: Erreur parsing JSON:", jsonError);
                    return response.text().then(textData => {
                        console.log("Update Prefs: Réponse brute non-JSON:", textData);
                        throw new Error(`Réponse non-JSON (statut ${response.status}): ${textData.substring(0,200)}...`);
                    });
                });
        })
        .then(({ status, body, ok }) => {
            if (prefSubmitButton) prefSubmitButton.disabled = false;
            console.log("Update Prefs: Réponse API:", body);

            if (ok && body.success) {
                alert(body.message || 'Préférences mises à jour avec succès !');
            } else {
                alert(body.message || `Erreur lors de la mise à jour des préférences (statut ${status}).`);
                console.error("Erreur API Update Prefs:", body);
            }
        })
        .catch(error => {
            if (prefSubmitButton) prefSubmitButton.disabled = false;
            console.error("Erreur Fetch globale (Update Prefs):", error);
            alert('Erreur de communication avec le serveur pour la mise à jour des préférences. ' + error.message);
        });
    });
}
}