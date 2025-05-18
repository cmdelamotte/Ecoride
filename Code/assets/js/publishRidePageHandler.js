import { LoadContentPage } from '../../router/Router.js';

export function initializePublishRidePage() {
    const publishForm = document.getElementById('publish-ride-form');
    if (!publishForm) {
        console.warn("Formulaire 'publish-ride-form' non trouvé.");
        return;
    }
    
    // Sélection de tous les champs du formulaire
    const departureLocationInput = document.getElementById('departure-location');
    const arrivalLocationInput = document.getElementById('arrival-location');
    const departureDateInput = document.getElementById('departure-date');
    const departureTimeInput = document.getElementById('departure-time');
    const arrivalTimeInput = document.getElementById('arrival-time');
    const availableSeatsInput = document.getElementById('available-seats');
    const pricePerSeatInput = document.getElementById('price-per-seat');
    const rideVehicleSelect = document.getElementById('ride-vehicle'); 
    const rideMessageTextarea = document.getElementById('ride-message'); 
    const globalMessageDiv = document.getElementById('publish-ride-message-global'); 

async function populateVehicleSelect(vehicleSelectElement) {
        if (!vehicleSelectElement) return;
        // Fonction pour afficher un message dans le select
        function setVehicleSelectMessage(message) {
            vehicleSelectElement.innerHTML = `<option value="" disabled selected>${message}</option>`;
        }
        setVehicleSelectMessage("Chargement des véhicules...");

        try {
            // On suppose que get_user_profile.php renvoie les véhicules de l'utilisateur connecté
            const response = await fetch('http://ecoride.local/api/get_user_profile.php');
            if (!response.ok) throw new Error('Erreur récupération profil/véhicules');
            const data = await response.json();

            if (data.success && data.vehicles && data.vehicles.length > 0) {
                vehicleSelectElement.innerHTML = '<option value="" disabled selected>Choisissez votre véhicule...</option>';
                data.vehicles.forEach(vehicle => {
                    const option = document.createElement('option');
                    option.value = vehicle.id;
                    option.textContent = `${vehicle.brand_name} ${vehicle.model_name} (${vehicle.license_plate})`;
                    vehicleSelectElement.appendChild(option);
                });
            } else {
                setVehicleSelectMessage("Aucun véhicule trouvé. Ajoutez-en un via 'Mon Compte'.");
            }
        } catch (error) {
            console.error("Erreur chargement des véhicules:", error);
            setVehicleSelectMessage("Erreur chargement véhicules.");
        }
    }

    if (rideVehicleSelect) {
        populateVehicleSelect(rideVehicleSelect);
    }

    // Listeners 'input'/'change' pour effacer les messages d'erreur custom et globaux
    [departureLocationInput, arrivalLocationInput, departureDateInput, departureTimeInput, arrivalTimeInput, 
    availableSeatsInput, pricePerSeatInput, rideVehicleSelect, rideMessageTextarea]
    .forEach(input => {
        if (input) {
            const eventType = input.tagName.toLowerCase() === 'select' ? 'change' : 'input';
            input.addEventListener(eventType, () => {
                input.setCustomValidity("");
                if (globalMessageDiv) {
                    globalMessageDiv.classList.add('d-none');
                    globalMessageDiv.textContent = '';
                }
            });
        }
    });

    publishForm.addEventListener('submit', function(event) {
        event.preventDefault(); 

        // Réinitialisation (déjà fait par les listeners 'input', mais bon pour la div globale)
        if (globalMessageDiv) {
            globalMessageDiv.classList.add('d-none');
            globalMessageDiv.textContent = '';
            globalMessageDiv.classList.remove('alert-danger', 'alert-success', 'alert-info');
        }
        // Réinitialiser les setCustomValidity pour tous les champs avant une nouvelle validation
        [departureLocationInput, arrivalLocationInput, departureDateInput, 
        departureTimeInput, availableSeatsInput, pricePerSeatInput, rideVehicleSelect]
        .forEach(input => { if (input) input.setCustomValidity(""); });


        let isFormValidOverall = true;
        if (!publishForm.checkValidity()) {
            isFormValidOverall = false;
        }

        // Récupération des valeurs
        const departureLocation = departureLocationInput?.value.trim();
        const arrivalLocation = arrivalLocationInput?.value.trim();
        const rideDateValue = departureDateInput?.value; // AAAA-MM-JJ
        const rideTimeValue = departureTimeInput?.value; // HH:MM
        const rideArrivalTimeValue = arrivalTimeInput?.value;
        const availableSeatsValue = availableSeatsInput?.value.trim();
        const pricePerSeatValue = pricePerSeatInput?.value.trim();
        const vehicleId = rideVehicleSelect?.value;
        const message = rideMessageTextarea?.value.trim();

        // Validations JS
        let departureDateTimeString = null;
        let estimatedArrivalDateTimeString = null;
        if (rideDateValue && rideTimeValue) {
            departureDateTimeString = `${rideDateValue}T${rideTimeValue}`; 
            const selectedDepartureDateTime = new Date(departureDateTimeString);
            const minDepartureTime = new Date(new Date().getTime() + 15 * 60000); 
            if (selectedDepartureDateTime < minDepartureTime) {
                departureDateInput.setCustomValidity("Le départ ne peut pas être dans le passé.");
                isFormValidOverall = false;
            } 

        // Validation et construction de estimatedArrivalDateTimeString
            if (rideArrivalTimeValue) {
                estimatedArrivalDateTimeString = `${rideDateValue}T${rideArrivalTimeValue}`; // On utilise la MÊME DATE que le départ
                const selectedArrivalDateTime = new Date(estimatedArrivalDateTimeString);
                if (selectedArrivalDateTime <= selectedDepartureDateTime) {
                    arrivalTimeInput.setCustomValidity("L'heure d'arrivée doit être après l'heure de départ.");
                    isFormValidOverall = false;
                }
            } else if (arrivalTimeInput && arrivalTimeInput.hasAttribute('required')) {
                // Si requis et vide, checkValidity() devrait l'attraper, mais on peut forcer
                arrivalTimeInput.setCustomValidity("L'heure d'arrivée est requise.");
                isFormValidOverall = false;
            }
        } else { // Si date de départ ou heure de départ sont vides (et requis)
            if (departureDateInput && departureDateInput.hasAttribute('required') && !rideDateValue) {
                departureDateInput.setCustomValidity("Date de départ requise.");
                isFormValidOverall = false;
            }
            if (departureTimeInput && departureTimeInput.hasAttribute('required') && !rideTimeValue) {
                departureTimeInput.setCustomValidity("Heure de départ requise.");
                isFormValidOverall = false;
            }
        }

        if (availableSeatsInput && availableSeatsValue) {
            const seats = parseInt(availableSeatsValue, 10);
            const minSeats = parseInt(availableSeatsInput.min, 10) || 1;
            const maxSeats = availableSeatsInput.max ? parseInt(availableSeatsInput.max, 10) : 8; // 8 comme fallback
            if (isNaN(seats) || seats < minSeats || seats > maxSeats) {
                availableSeatsInput.setCustomValidity(`Places valides (${minSeats}-${maxSeats}).`);
                isFormValidOverall = false;
            }
        }
        if (pricePerSeatInput && pricePerSeatValue) {
            const price = parseFloat(pricePerSeatValue);
            const minPrice = parseFloat(pricePerSeatInput.min) || 0; // L'API PHP vérifiera >= commission
            if (isNaN(price) || price < minPrice) {
                pricePerSeatInput.setCustomValidity(`Prix valide (${minPrice} ou plus).`);
                isFormValidOverall = false;
            }
        }
        if (rideVehicleSelect && !vehicleId && rideVehicleSelect.hasAttribute('required')) {
            isFormValidOverall = false;
        }
            
        if (!isFormValidOverall) {
            publishForm.reportValidity(); 
            if (globalMessageDiv) {
                globalMessageDiv.textContent = "Veuillez corriger les erreurs indiquées.";
                globalMessageDiv.className = 'alert alert-danger';
            }
            return; 
        }
        
        // Le formulaire est valide côté client, préparation des données pour l'API
        const rideData = {
            departure_city: departureLocation,
            arrival_city: arrivalLocation, 
            departure_address: departureLocation, // Placeholder
            arrival_address: arrivalLocation,     // Placeholder
            departure_datetime: departureDateTimeString, // Format AAAA-MM-JJTHH:MM
            estimated_arrival_datetime: estimatedArrivalDateTimeString,
            vehicle_id: parseInt(vehicleId, 10),
            seats_offered: parseInt(availableSeatsValue, 10),
            price_per_seat: parseFloat(pricePerSeatValue),
            driver_message: message
        };

        console.log("publishRidePageHandler: Envoi du trajet à l'API :", rideData);
        const submitButton = publishForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;
        if (globalMessageDiv) { 
            globalMessageDiv.textContent = 'Publication du trajet en cours...';
            globalMessageDiv.className = 'alert alert-info';
        }

        fetch('http://ecoride.local/api/publish_ride.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(rideData)
        })
        .then(response => {
                    console.log("Publish Ride Fetch: Statut Réponse:", response.status); // Bon pour le log
                    // Essayer de parser en JSON. Si ça échoue, c'est que la réponse n'était pas du JSON valide
                    return response.json()
                        .then(data => ({ 
                            ok: response.ok,
                            status: response.status,
                            body: data
                        }))
                        .catch(jsonError => {
                            // Le parsing JSON a échoué. La réponse n'était pas du JSON.
                            console.error("Publish Ride Fetch: Erreur parsing JSON de la réponse.", jsonError);
                            // On essaie de lire la réponse comme du texte brut pour voir ce que le serveur a envoyé.
                            return response.text().then(textData => {
                                console.log("Publish Ride Fetch: Réponse brute non-JSON du serveur:", textData);
                                // On propage une nouvelle erreur pour que le .catch() global du fetch soit activé
                                // avec un message plus descriptif.
                                throw new Error(`Réponse non-JSON du serveur (statut ${response.status}): ${textData.substring(0,100)}...`);
                            });
                        });
                })
        .then(({ ok, body }) => {
            if (submitButton) submitButton.disabled = false;
            console.log("Publish Ride Fetch: Réponse API:", body);
            

            if (ok && body.success && body.ride) {
                if (globalMessageDiv) {
                    globalMessageDiv.textContent = body.message || 'Trajet publié avec succès !';
                    globalMessageDiv.className = 'alert alert-success';
                } else {
                    alert(body.message || 'Trajet publié avec succès !');
                }
                publishForm.reset();
                setTimeout(() => {
                    if (typeof LoadContentPage === "function") {
                        window.history.pushState({}, "", "/your-rides"); // Ou vers le détail du trajet créé: /rides-search?id=${body.ride.id} (nécessite adaptation)
                        LoadContentPage();
                    } else {
                        window.location.href = "/your-rides";
                    }
                }, 1500);
            } else { // Erreur renvoyée par l'API (validation ou autre)
                        let globalErrorMessageForDiv = body.message || "Erreur lors de la publication du trajet.";
                        let specificFieldErrorsHandled = false;

                        if (body.errors) {
                            console.log("Erreurs de validation du serveur reçues:", body.errors);
                            for (const key in body.errors) {
                                let inputElement = null;
                                if (key === 'departure_city') inputElement = departureLocationInput; 
                                else if (key === 'arrival_city') inputElement = arrivalLocationInput;
                                else if (key === 'departure_datetime') inputElement = departureDateInput; 
                                else if (key === 'estimated_arrival_datetime') inputElement = arrivalTimeInput;
                                else if (key === 'vehicle_id') inputElement = rideVehicleSelect;
                                else if (key === 'seats_offered') inputElement = availableSeatsInput;
                                else if (key === 'price_per_seat') inputElement = pricePerSeatInput;
                                else if (key === 'driver_message') inputElement = rideMessageTextarea;

                                if (inputElement && typeof inputElement.setCustomValidity === 'function') {
                                    inputElement.setCustomValidity(body.errors[key]);
                                    specificFieldErrorsHandled = true;
                                }
                            }
                        }

                        if (globalMessageDiv) {
                            if (specificFieldErrorsHandled) {
                                // Si des erreurs ont été mappées aux champs, on peut mettre un message global plus simple
                                globalMessageDiv.textContent = "Veuillez corriger les erreurs indiquées sur les champs.";
                                publishForm.reportValidity(); // Demande au formulaire d'afficher toutes les bulles d'erreur custom
                            } else {
                                // Si aucune erreur de champ spécifique n'a été mappée, affiche le message global plus détaillé
                                globalMessageDiv.textContent = globalErrorMessageForDiv.replace(/\n/g, ' ');
                            }
                            globalMessageDiv.className = 'alert alert-danger mt-3'; // Assure la visibilité
                            globalMessageDiv.classList.remove('d-none'); 
                        } else if (!specificFieldErrorsHandled) { 
                            // S'il n'y a pas de div globale et pas d'erreur de champ spécifique, fallback sur alert
                            alert(globalErrorMessageForDiv);
                        }
                        // Si des erreurs ont été mises sur les champs, un seul appel à reportValidity() sur le formulaire
                        // devrait les faire apparaître (selon le comportement du navigateur).
                        if (specificFieldErrorsHandled) {
                            publishForm.reportValidity();
                        }

                        console.error('Erreur API Publish Ride:', body);
                    }
        })
        .catch(error => {
            if (submitButton) submitButton.disabled = false;
            console.error('Erreur Fetch globale (Publish Ride):', error);
            if (globalMessageDiv) {
                globalMessageDiv.textContent = 'Erreur de communication. ' + error.message;
                globalMessageDiv.className = 'alert alert-danger';
            } else {
                alert('Erreur de communication. ' + error.message);
            }
        });
    });
}