// assets/js/accountPageHandler.js

// Imports (Assure-toi que les chemins sont corrects par rapport à ton arborescence)
import { getRole, showAndHideElementsForRoles, signout as authManagerSignout } from './authManager.js';
import { LoadContentPage } from '../../router/Router.js'; 

/**
 * Affiche ou masque la section des informations du chauffeur en fonction du rôle.
 * @param {string|null} currentRole - Le rôle actuel de l'utilisateur.
 */
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

/**
 * Pré-coche le bouton radio correspondant au rôle actuel de l'utilisateur.
 * @param {string|null} currentRole - Le rôle actuel de l'utilisateur.
 */
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
    // Fallback si aucun rôle n'est défini ou si le rôle stocké ne correspond à aucune option
    if (!roleActuallySelected) {
        const passengerRadio = document.getElementById('passenger-role');
        if (passengerRadio) {
             passengerRadio.checked = true; // Défaut sur passager si possible
        } else if (roleRadios.length > 0) {
             roleRadios[0].checked = true; // Sinon, le premier de la liste
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
        vehicleForm.reset(); // Réinitialise le formulaire

        if (isEditing && vehicleData) {
            // Mode Édition : pré-remplir le formulaire
            vehicleFormTitle.textContent = "Modifier le Véhicule";
            editingVehicleIdInput.value = vehicleData.id || "";
            
            // Sélection et remplissage des champs (avec vérification d'existence)
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
            // Mode Ajout
            vehicleFormTitle.textContent = "Ajouter un Véhicule";
            editingVehicleIdInput.value = ""; // S'assurer que l'ID caché est vide
        }
        // Afficher le formulaire et masquer le bouton "Ajouter"
        vehicleFormContainer.classList.remove('d-none');
        addVehicleBtn.classList.add('d-none');
        document.getElementById('vehicle-brand')?.focus(); // Met le focus sur le premier champ
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
    
    // Éléments pour la suppression de compte
    const deleteAccountBtn = document.getElementById('delete-account-btn');
    const confirmDeleteAccountModalElement = document.getElementById('confirmDeleteAccountModal'); // Assure-toi que cet ID existe dans ton HTML modal
    const confirmDeleteAccountBtn = document.getElementById('confirm-delete-btn'); // Assure-toi que cet ID existe
    let confirmDeleteAccountModal = null; // Instance de la modal Bootstrap
    if (confirmDeleteAccountModalElement) {
        // Évite de recréer l'instance si la page est rechargée partiellement
        if (!window.confirmDeleteAccountModalInstance) { 
            window.confirmDeleteAccountModalInstance = new bootstrap.Modal(confirmDeleteAccountModalElement);
        }
        confirmDeleteAccountModal = window.confirmDeleteAccountModalInstance;
    }

    // Éléments pour la gestion des véhicules
    const addVehicleBtn = document.getElementById('add-vehicle-btn');
    const vehicleFormContainer = document.getElementById('vehicle-form-container');
    const vehicleForm = document.getElementById('vehicle-form'); 
    const cancelVehicleFormBtn = document.getElementById('cancel-vehicle-form-btn');
    const vehiclesList = document.getElementById('vehicles-list'); 
    const editingVehicleIdInput = document.getElementById('editing-vehicle-id'); // Nécessaire pour la soumission
    
    // Éléments pour la suppression de véhicule
    const confirmDeleteVehicleModalElementFromHTML = document.getElementById('confirmDeleteVehicleModal'); // ID de la modal HTML
    const confirmVehicleDeleteBtn = document.getElementById('confirm-vehicle-delete-btn'); // ID du bouton de confirmation dans la modal
    const vehicleToDeleteInfoSpan = document.querySelector('#confirmDeleteVehicleModal .vehicle-to-delete-info'); // Span pour afficher infos du véhicule à supprimer
    let confirmDeleteVehicleModalInstance = null; // Instance de la modal Bootstrap pour véhicule
    let vehicleIdToDelete = null; // Variable pour stocker l'ID du véhicule à supprimer

    if (confirmDeleteVehicleModalElementFromHTML) { 
        if (!window.confirmDeleteVehicleModalVehicleInstance) { // Évite recréation
            window.confirmDeleteVehicleModalVehicleInstance = new bootstrap.Modal(confirmDeleteVehicleModalElementFromHTML);
        }
        confirmDeleteVehicleModalInstance = window.confirmDeleteVehicleModalVehicleInstance;
    }

    // --- Initialisation de l'affichage ---
    
    // Remplir les informations utilisateur (simulation actuelle)
    if (userPseudoSpan) userPseudoSpan.textContent = sessionStorage.getItem('user_pseudo') || "[PseudoUtilisateur]"; // Utilise les clés stockées par l'API/login simulé
    if (lastNameDisplay) lastNameDisplay.textContent = sessionStorage.getItem('simulatedUserLastName') || "[NomUtilisateur]"; // A adapter si l'API renvoie nom/prénom
    if (firstNameDisplay) firstNameDisplay.textContent = sessionStorage.getItem('simulatedUserFirstName') || "[PrénomUtilisateur]"; // A adapter
    if (userEmailSpan) userEmailSpan.textContent = sessionStorage.getItem('simulatedUserEmail') || "[EmailUtilisateur]"; // A adapter
    if (userCreditsSpan) userCreditsSpan.textContent = sessionStorage.getItem('simulatedUserCredits') || "[N/A]"; // A adapter
    
    // Gérer l'affichage en fonction du rôle
    const currentRole = getRole(); 
    preselectUserRole(currentRole); 
    toggleDriverInfoSection(currentRole); 

    // --- Ajout des écouteurs d'événements ---

    // Formulaire de changement de rôle
    if (roleForm) {
        roleForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(roleForm);
            const selectedRole = formData.get('user_role_form'); 
            if (selectedRole) { 
                // TODO: Remplacer par un appel API pour sauvegarder le rôle côté serveur
                sessionStorage.setItem('ecoRideUserRole', selectedRole); // Mise à jour de la simulation locale
                alert(`Rôle mis à jour en : ${selectedRole} (simulation)`);
                toggleDriverInfoSection(selectedRole); // Met à jour l'affichage de la section chauffeur
                if (typeof showAndHideElementsForRoles === "function") {
                    showAndHideElementsForRoles(); // Met à jour les éléments conditionnels (ex: navbar)
                }
            } else {
                console.warn("AccountPageHandler: Aucun rôle sélectionné.");
            }
        });
    }

    // Bouton et Modal de suppression de compte
    if (deleteAccountBtn && confirmDeleteAccountModal && confirmDeleteAccountBtn) {
        // Ouvre la modal au clic sur le bouton principal
        deleteAccountBtn.addEventListener('click', () => {
            if(confirmDeleteAccountModal) confirmDeleteAccountModal.show(); 
        });
        // Gère la confirmation de suppression dans la modal
        confirmDeleteAccountBtn.addEventListener('click', () => {
            console.log("Suppression du compte confirmée (simulation).");
            // TODO: Appel API pour supprimer le compte côté serveur
            if(confirmDeleteAccountModal) confirmDeleteAccountModal.hide(); 
            
            alert("Votre compte a été supprimé (simulation).");
            // Déconnecte l'utilisateur après suppression
            if (typeof authManagerSignout === "function") {
                authManagerSignout(); 
            } else { 
                console.error("authManagerSignout non disponible."); 
                sessionStorage.clear(); // Fallback
                window.location.href = "/"; // Fallback
            }
        });
    }

    // Bouton "Ajouter un véhicule"
    if (addVehicleBtn) {
        addVehicleBtn.addEventListener('click', () => {
            showVehicleForm(false); // Ouvre le formulaire en mode ajout
        });
    }

    // Bouton "Annuler" dans le formulaire véhicule
    if (cancelVehicleFormBtn) {
        cancelVehicleFormBtn.addEventListener('click', hideVehicleForm); // Cache simplement le formulaire
    }

    // Gestion des clics sur les boutons "Modifier" et "Supprimer" des véhicules (Délégation d'événements)
    if (vehiclesList) {
        vehiclesList.addEventListener('click', function(event) {
            const target = event.target;
            // Trouve l'élément .vehicle-item parent le plus proche du bouton cliqué
            const vehicleItem = target.closest('.vehicle-item'); 
            if (!vehicleItem) return; // Si le clic n'est pas dans un item de véhicule, on ignore

            const vehicleId = vehicleItem.getAttribute('data-vehicle-id');
            
            // Vérifie si le clic vient du bouton Modifier (ou de son icône intérieure)
            if (target.classList.contains('edit-vehicle-btn') || target.closest('.edit-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Modifier."); return; }
                
                // Récupère toutes les données stockées dans les data-attributes de l'item
                const vehicleDataForEdit = { 
                    id: vehicleId, 
                    brand: vehicleItem.getAttribute('data-brand') || "", 
                    model: vehicleItem.getAttribute('data-model') || "", 
                    plate: vehicleItem.getAttribute('data-plate') || "",
                    color: vehicleItem.getAttribute('data-color') || "", 
                    registrationDate: vehicleItem.getAttribute('data-reg-date') || "",    
                    seats: parseInt(vehicleItem.getAttribute('data-seats'), 10) || 1, // Met une valeur par défaut si NaN               
                    isElectric: (vehicleItem.getAttribute('data-is-electric') === 'true') || false        
                };
                showVehicleForm(true, vehicleDataForEdit); // Ouvre le formulaire en mode édition avec les données
            
            // Vérifie si le clic vient du bouton Supprimer
            } else if (target.classList.contains('delete-vehicle-btn') || target.closest('.delete-vehicle-btn')) {
                if (!vehicleId) { console.error("ID de véhicule manquant pour Supprimer."); return; }
                
                vehicleIdToDelete = vehicleId; // Stocke l'ID pour la confirmation
                
                // Affiche des infos dans la modal de confirmation
                const brand = vehicleItem.getAttribute('data-brand') || "Inconnue";
                const model = vehicleItem.getAttribute('data-model') || "Inconnu";
                const plate = vehicleItem.getAttribute('data-plate') || "Inconnue";
                if (vehicleToDeleteInfoSpan) {
                    vehicleToDeleteInfoSpan.textContent = `Marque: ${brand}, Modèle: ${model}, Plaque: ${plate}`;
                }

                // Ouvre la modal de confirmation de suppression
                if (confirmDeleteVehicleModalInstance) { 
                    confirmDeleteVehicleModalInstance.show();
                }
            }
        });
    }

    // Gestion de la confirmation de suppression de véhicule dans la modal
    if (confirmVehicleDeleteBtn && confirmDeleteVehicleModalInstance) {
        confirmVehicleDeleteBtn.addEventListener('click', () => {
            if (vehicleIdToDelete) {
                // TODO: Appel API pour supprimer le véhicule côté serveur
                console.log("Confirmation de suppression pour véhicule ID:", vehicleIdToDelete);
                
                // Supprime l'élément de la liste côté client (simulation)
                const vehicleElementToRemove = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleIdToDelete}"]`);
                if (vehicleElementToRemove) {
                    vehicleElementToRemove.remove();
                    alert(`Véhicule ID ${vehicleIdToDelete} supprimé (simulation).`);
                } else {
                    console.warn("Élément véhicule à supprimer non trouvé dans le DOM.");
                }
                vehicleIdToDelete = null; // Réinitialise l'ID stocké
            }
            if(confirmDeleteVehicleModalInstance) confirmDeleteVehicleModalInstance.hide(); // Ferme la modal
        });
    }
    
    // --- Gestion de la SOUMISSION du Formulaire Véhicule (Ajout ou Modification) ---
    if (vehicleForm && editingVehicleIdInput && vehiclesList) { // Assure-toi que tous les éléments nécessaires existent
        vehicleForm.addEventListener('submit', function(event) {
            event.preventDefault();
            console.log("Soumission du formulaire véhicule interceptée.");

            // Récupération des éléments du formulaire
            const brandInput = document.getElementById('vehicle-brand');
            const modelInput = document.getElementById('vehicle-model');
            const colorInput = document.getElementById('vehicle-color');
            const plateInput = document.getElementById('vehicle-license-plate');
            const regDateInput = document.getElementById('vehicle-registration-date');
            const seatsInput = document.getElementById('vehicle-seats');
            const electricInput = document.getElementById('vehicle-electric');
            
            // --- Validation Côté Client ---
            // Réinitialiser les messages d'erreur custom précédents
            [brandInput, modelInput, plateInput, seatsInput, regDateInput, colorInput].forEach(input => {
                if(input) input.setCustomValidity("");
            });

            let isVehicleFormValid = true;
            // Utilise checkValidity() pour les contraintes HTML (required, min, max...)
            if (!vehicleForm.checkValidity()) { 
                isVehicleFormValid = false;
            }

            // Récupération et nettoyage des valeurs
            const brand = brandInput?.value.trim();
            const model = modelInput?.value.trim();
            const plate = plateInput?.value.trim();
            const seats = seatsInput ? parseInt(seatsInput.value, 10) : 0;
            const color = colorInput?.value.trim();
            const registrationDate = regDateInput?.value; // Garde le format YYYY-MM-DD
            const isElectric = electricInput?.checked || false;
            const currentVehicleId = editingVehicleIdInput.value; // Récupère l'ID (vide si ajout, rempli si édition)

            // Ajout de validations JS spécifiques si nécessaire (exemples)
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
             // Vérifie explicitement la plaque si tu as un format précis (exemple simple : non vide)
             // Tu pourrais ajouter une regex pour le format AA-123-BB si besoin.

            if (seatsInput && (isNaN(seats) || seats < 1 || seats > 8)) { // Validation du nombre de places
                seatsInput.setCustomValidity("Nombre de places invalide (doit être entre 1 et 8).");
                isVehicleFormValid = false;
            }

             // Validation de la date (simple vérification qu'elle n'est pas vide si requise, le type="date" aide)
             if (regDateInput && !registrationDate && regDateInput.hasAttribute('required')) { // Si tu ajoutes 'required' au HTML
                 regDateInput.setCustomValidity("La date d'immatriculation est requise.");
                 isVehicleFormValid = false;
             } else if (regDateInput && registrationDate) {
                 // Optionnel : Vérifier que la date n'est pas dans le futur
                 const today = new Date().toISOString().split('T')[0];
                 if (registrationDate > today) {
                    regDateInput.setCustomValidity("La date d'immatriculation ne peut pas être dans le futur.");
                    isVehicleFormValid = false;
                 }
             }

            // Si une validation a échoué...
            if (!isVehicleFormValid) {
                vehicleForm.reportValidity(); // Affiche les messages d'erreur (natifs et custom)
                console.log("Validation du formulaire de véhicule échouée.");
                return; // Arrête la soumission
            }

            // --- Le formulaire est valide côté client ---
            
            // Prépare les données à envoyer (ou à utiliser pour la simulation)
            const vehicleDataFromForm = {
                id: currentVehicleId || null, // null si ajout, l'ID si édition
                brand: brand,
                model: model,
                color: color,
                plate: plate,
                registrationDate: registrationDate,
                seats: seats,
                isElectric: isElectric
            };

            // --- Logique d'Ajout ou de Modification ---
            
            if (vehicleDataFromForm.id) { 
                // == MODE ÉDITION ==
                // TODO: Appel API (méthode PUT ou PATCH) pour modifier le véhicule avec vehicleDataFromForm
                console.log("MODIFICATION Véhicule (simulation):", vehicleDataFromForm);
                
                // Met à jour l'affichage dans la liste (simulation)
                const itemToUpdate = vehiclesList.querySelector(`.vehicle-item[data-vehicle-id="${vehicleDataFromForm.id}"]`);
                if (itemToUpdate) {
                    // Met à jour les spans d'affichage
                    const brandDisplay = itemToUpdate.querySelector('.vehicle-brand-display');
                    const modelDisplay = itemToUpdate.querySelector('.vehicle-model-display');
                    const plateDisplay = itemToUpdate.querySelector('.vehicle-plate-display');
                    
                    if(brandDisplay) brandDisplay.textContent = vehicleDataFromForm.brand;
                    if(modelDisplay) modelDisplay.textContent = vehicleDataFromForm.model;
                    if(plateDisplay) plateDisplay.textContent = vehicleDataFromForm.plate;

                    // Met à jour aussi les data-attributes pour les prochaines éditions/infos
                    itemToUpdate.setAttribute('data-brand', vehicleDataFromForm.brand);
                    itemToUpdate.setAttribute('data-model', vehicleDataFromForm.model);
                    itemToUpdate.setAttribute('data-plate', vehicleDataFromForm.plate);
                    itemToUpdate.setAttribute('data-color', vehicleDataFromForm.color);
                    itemToUpdate.setAttribute('data-reg-date', vehicleDataFromForm.registrationDate);
                    itemToUpdate.setAttribute('data-seats', vehicleDataFromForm.seats.toString());
                    itemToUpdate.setAttribute('data-is-electric', vehicleDataFromForm.isElectric.toString());
                    
                    alert("Véhicule modifié (simulation) !");
                } else {
                    console.warn("Impossible de trouver l'élément véhicule à mettre à jour dans le DOM.");
                     alert("Erreur lors de la mise à jour de l'affichage du véhicule.");
                }

            } else { 
                // == MODE AJOUT == (Utilisation du template HTML)
                 // TODO: Appel API (méthode POST) pour ajouter le véhicule, qui retournera le vrai ID
                console.log("AJOUT Véhicule (simulation):", vehicleDataFromForm);
                const newVehicleId = "simulated-" + Date.now(); // Simule un ID retourné par l'API

                const template = document.getElementById('vehicle-item-template'); // Récupère le template HTML
                
                if (template) {
                    const clone = template.content.cloneNode(true); // Clone le contenu du template
                    const newVehicleElement = clone.querySelector('.vehicle-item'); // Récupère le div principal du clone

                    if (newVehicleElement) {
                        // --- Remplir les data-attributes ---
                        newVehicleElement.setAttribute('data-vehicle-id', newVehicleId); // Utilise le nouvel ID (simulé ici)
                        newVehicleElement.setAttribute('data-brand', vehicleDataFromForm.brand);
                        newVehicleElement.setAttribute('data-model', vehicleDataFromForm.model);
                        newVehicleElement.setAttribute('data-plate', vehicleDataFromForm.plate);
                        newVehicleElement.setAttribute('data-color', vehicleDataFromForm.color);
                        newVehicleElement.setAttribute('data-reg-date', vehicleDataFromForm.registrationDate);
                        newVehicleElement.setAttribute('data-seats', vehicleDataFromForm.seats.toString());
                        newVehicleElement.setAttribute('data-is-electric', vehicleDataFromForm.isElectric.toString());

                        // --- Remplir les spans visibles ---
                        const brandDisplay = newVehicleElement.querySelector('.vehicle-brand-display');
                        const modelDisplay = newVehicleElement.querySelector('.vehicle-model-display');
                        const plateDisplay = newVehicleElement.querySelector('.vehicle-plate-display');
                        
                        if (brandDisplay) brandDisplay.textContent = vehicleDataFromForm.brand;
                        if (modelDisplay) modelDisplay.textContent = vehicleDataFromForm.model;
                        if (plateDisplay) plateDisplay.textContent = vehicleDataFromForm.plate;
                        
                        // --- Ajouter le clone rempli à la liste ---
                        vehiclesList.appendChild(newVehicleElement);
                        alert("Véhicule ajouté (simulation) !");

                    } else {
                        console.error("L'élément '.vehicle-item' n'a pas été trouvé dans le clone du template.");
                        alert("Erreur lors de la création de l'affichage du véhicule.");
                    }
                } else {
                    console.error("Le template '#vehicle-item-template' est introuvable.");
                    alert("Erreur : le template de véhicule est manquant.");
                }
            }
            
            // Dans les deux cas (ajout ou modif réussie), on cache le formulaire
            hideVehicleForm(); 
        });
    } else {
        console.warn("Le formulaire véhicule, l'input d'ID caché ou la liste des véhicules n'a pas été trouvé. La soumission ne sera pas gérée.");
    }

    // TODO: Ajouter un listener pour le formulaire des préférences si nécessaire
    const preferencesForm = document.getElementById('driver-preferences-form');
    if (preferencesForm) {
        preferencesForm.addEventListener('submit', function(event) {
            event.preventDefault();
            // TODO: Récupérer les valeurs des préférences et appeler l'API pour les sauvegarder
            const acceptsSmokers = document.getElementById('pref-smoker')?.checked;
            const acceptsAnimals = document.getElementById('pref-animals')?.checked;
            const customPrefs = document.getElementById('pref-custom')?.value;
            console.log("Sauvegarde des préférences (simulation):", {acceptsSmokers, acceptsAnimals, customPrefs});
            alert("Préférences enregistrées (simulation) !");
        });
    }

} // Fin de initializeAccountPage