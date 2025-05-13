export function initializePublishRidePage() {
    const publishForm = document.getElementById('publish-ride-form');
    
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

    if (publishForm) {
        publishForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation des messages custom précédents pour chaque champ
            // et de la div d'erreur globale (globalMessageDiv)
            [departureLocationInput, arrivalLocationInput, departureDateInput, 
            departureTimeInput, availableSeatsInput, pricePerSeatInput, rideVehicleSelect]
            .forEach(input => {
                if (input) input.setCustomValidity("");
            });
            if (globalMessageDiv) {
                globalMessageDiv.classList.add('d-none');
                globalMessageDiv.textContent = '';
                globalMessageDiv.classList.remove('alert-danger', 'alert-success');
            }

            let isFormValidOverall = true;

            // 1. Validation HTML5 native (s'occupe des 'required', type, min, max etc.)
            if (!publishForm.checkValidity()) {
                isFormValidOverall = false;
            }

            // 2. Récupération des valeurs des champs
            const departureLocation = departureLocationInput?.value.trim();
            const arrivalLocation = arrivalLocationInput?.value.trim();
            const rideDateValue = departureDateInput?.value;
            const rideTimeValue = departureTimeInput?.value;
            const availableSeatsValue = availableSeatsInput?.value.trim();
            const pricePerSeatValue = pricePerSeatInput?.value.trim();
            const vehicleId = rideVehicleSelect?.value;
            const message = rideMessageTextarea?.value.trim();

            // 3. Validations JS personnalisées spécifiques
            // Ces validations ne s'appliquent que si le champ a une valeur,
            // laissant checkValidity() gérer le 'required' initial.
            // Ou, si checkValidity() est déjà false, ces conditions peuvent ajouter des messages plus spécifiques.

            if (departureLocationInput.value && departureLocation.length < 2) { 
                departureLocationInput.setCustomValidity("Le lieu de départ doit contenir au moins 2 caractères.");
                isFormValidOverall = false;
            }
            if (arrivalLocationInput.value && arrivalLocation.length < 2) {
                arrivalLocationInput.setCustomValidity("Le lieu d'arrivée doit contenir au moins 2 caractères.");
                isFormValidOverall = false;
            }
            if (departureLocation && arrivalLocation && departureLocation.toLowerCase() === arrivalLocation.toLowerCase()) {
                arrivalLocationInput.setCustomValidity("Le lieu d'arrivée doit être différent du lieu de départ.");
                departureLocationInput.setCustomValidity("Le lieu de départ doit être différent du lieu d'arrivée.");
                isFormValidOverall = false;
            }

            if (rideDateValue && rideTimeValue) {
                const selectedDateTime = new Date(`${rideDateValue}T${rideTimeValue}`);
                const now = new Date();
                const minDepartureTime = new Date(now.getTime() + 15 * 60000); 

                if (selectedDateTime < minDepartureTime) {
                    departureDateInput.setCustomValidity("La date et l'heure de départ doivent être au moins 15 minutes dans le futur.");
                    isFormValidOverall = false;
                }
            } // Les 'required' pour date/heure sont gérés par checkValidity()

            if (availableSeatsInput.value) { // Ne valide que si une valeur est entrée
                const seats = parseInt(availableSeatsValue, 10);
                // Utilise les attributs min/max du HTML s'ils existent
                const minSeats = parseInt(availableSeatsInput.min, 10) || 1;
                const maxSeats = availableSeatsInput.max ? parseInt(availableSeatsInput.max, 10) : Infinity;
                if (isNaN(seats) || seats < minSeats || seats > maxSeats) {
                    availableSeatsInput.setCustomValidity(`Veuillez entrer un nombre de places valide (entre ${minSeats} et ${availableSeatsInput.max || 'max'}).`);
                    isFormValidOverall = false;
                }
            } 

            if (pricePerSeatInput.value) { // Ne valide que si une valeur est entrée
                const price = parseFloat(pricePerSeatValue);
                const minPrice = parseFloat(pricePerSeatInput.min) || 0;
                if (isNaN(price) || price < minPrice) {
                    pricePerSeatInput.setCustomValidity(`Veuillez entrer un prix valide (${minPrice} ou plus).`);
                    isFormValidOverall = false;
                }
            } 
            
            // 4. Affichage des erreurs ou traitement si valide
            if (!isFormValidOverall) {
                publishForm.reportValidity(); // ESSENTIEL pour afficher les tooltips
                console.log("Validation du formulaire de publication de trajet échouée.");
                if (globalMessageDiv) {
                    globalMessageDiv.textContent = "Veuillez corriger les erreurs indiquées dans le formulaire.";
                    globalMessageDiv.classList.remove('d-none', 'alert-success');
                    globalMessageDiv.classList.add('alert-danger');
                }
            } else {
                const finalAvailableSeats = parseInt(availableSeatsValue, 10);
                const finalPricePerSeat = parseFloat(pricePerSeatValue);

                console.log("Formulaire de publication de trajet valide. Données :", {
                    departureLocation, arrivalLocation, departureDate: rideDateValue, departureTime: rideTimeValue,
                    availableSeats: finalAvailableSeats, pricePerSeat: finalPricePerSeat, vehicleId, message
                });
                
                if (globalMessageDiv) {
                    globalMessageDiv.textContent = "Trajet publié avec succès (simulation) !";
                    globalMessageDiv.classList.remove('d-none', 'alert-danger');
                    globalMessageDiv.classList.add('alert-success');
                } else {
                    alert("Trajet publié avec succès (simulation) !");
                }
                publishForm.reset();
            }
        }); // Fin du listener 'submit'

        // UX: Réinitialiser les messages custom sur input/change
        // (exactement comme dans ton registerFormHandler.js, avec le tableau à la volée)
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
    } 
} 