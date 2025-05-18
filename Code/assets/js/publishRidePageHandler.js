import { LoadContentPage } from '../../router/Router.js'; // Pour la redirection éventuelle

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
                // Optionnel: désactiver le formulaire de publication si aucun véhicule
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
    [departureLocationInput, arrivalLocationInput, departureDateInput, departureTimeInput, 
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
        const availableSeatsValue = availableSeatsInput?.value.trim();
        const pricePerSeatValue = pricePerSeatInput?.value.trim();
        const vehicleId = rideVehicleSelect?.value;
        const message = rideMessageTextarea?.value.trim();

        // Validations JS
        let departureDateTimeString = null;
        if (rideDateValue && rideTimeValue) {
            departureDateTimeString = `${rideDateValue}T${rideTimeValue}`; // Format ISO partiel
            const selectedDateTime = new Date(departureDateTimeString);
            const minDepartureTime = new Date(new Date().getTime() + 15 * 60000); 
            if (selectedDateTime < minDepartureTime) {
                departureDateInput.setCustomValidity("Départ doit être dans au moins 15 mins.");
                isFormValidOverall = false;
            }
        } // Les 'required' sont gérés par checkValidity()

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
            departure_city: departureLocation, // L'API attend departure_city et arrival_city
            arrival_city: arrivalLocation, 
            departure_address: departureLocation, // Placeholder
            arrival_address: arrivalLocation,     // Placeholder
            departure_datetime: departureDateTimeString, // Format AAAA-MM-JJTHH:MM
            // estimated_arrival_datetime: ... // L'API le calcule ou attend du JS
            vehicle_id: parseInt(vehicleId, 10),
            seats_offered: parseInt(availableSeatsValue, 10),
            price_per_seat: parseFloat(pricePerSeatValue),
            driver_message: message
        };
        // Note: L'API s'attend à `departure_city` et `arrival_city` distincts de `departure_address` et `arrival_address`.
        // Il faudra que ton formulaire HTML ou ton JS fasse cette distinction.
        // Pour l'instant, j'ai mis les mêmes pour `_city` et `_address`.
        // L'API s'attend aussi à `estimated_arrival_datetime`. Si le JS ne l'envoie pas, le PHP mettra un +3h.

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
                    // (ex: erreur PHP qui a affiché du HTML, ou réponse vide, etc.)
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
            } else {
                let errorMessage = body.message || "Erreur lors de la publication du trajet.";
                if (body.errors) {
                    for (const key in body.errors) { errorMessage += `\n- ${key}: ${body.errors[key]}`; }
                }
                if (globalMessageDiv) {
                    globalMessageDiv.textContent = errorMessage.replace(/\n/g, ' ');
                    globalMessageDiv.className = 'alert alert-danger';
                } else {
                    alert(errorMessage);
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