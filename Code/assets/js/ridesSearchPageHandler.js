import { initializeSearchForm } from './searchFormHandler.js'; 
import { LoadContentPage } from '../../router/Router.js'; 

/**
 * Met à jour l'affichage de la valeur du slider de durée.
 * @param {string} valueString - La valeur actuelle du slider
 */
function updateDurationOutputDisplay(valueString) {
    const outputElement = document.getElementById('duration-output');
    if (outputElement) {
        const value = parseFloat(valueString);
        const hours = Math.floor(value);
        const minutes = (value - hours) * 60;
        outputElement.textContent = hours + "h" + (minutes < 10 ? '0' : '') + minutes;
    }
}

/**
 * Met à jour l'affichage de la valeur du slider de prix.
 * @param {string} valueString - La valeur actuelle du slider (ex: "50").
 */
function updatePriceOutputDisplay(valueString) {
    // Cible l'output du prix par son ID unique "price-output".
    const outputElement = document.getElementById('price-output'); 
    
    if (outputElement) { 
        outputElement.textContent = valueString + " crédits"; 
    }
}

/**
 * Pré-remplit les champs du formulaire de filtres à partir des paramètres de l'URL.
 */
function prefillFilterFormFromURL() {
    const queryParams = new URLSearchParams(window.location.search);

    const priceRangeInput = document.getElementById('price-filter');
    const durationRangeInput = document.getElementById('duration-filter-range');
    const animalRadios = document.querySelectorAll('input[name="animal-option"]');
    const ratingRadios = document.querySelectorAll('input[name="rating-options"]');
    const ecoSwitch = document.getElementById('eco-filter');

    if (queryParams.has('maxPrice') && priceRangeInput) {
        priceRangeInput.value = queryParams.get('maxPrice');
        updatePriceOutputDisplay(priceRangeInput.value); // Appel de la fonction pour mettre à jour l'output
    }

    if (queryParams.has('maxDuration') && durationRangeInput) {
        durationRangeInput.value = queryParams.get('maxDuration');
        updateDurationOutputDisplay(durationRangeInput.value);
    }

    if (queryParams.has('animalsAllowed') && animalRadios.length) {
        const animalsValue = queryParams.get('animalsAllowed');
        animalRadios.forEach(radio => {
            if (radio.value === animalsValue) {
                radio.checked = true;
            }
        });
    }

    if (queryParams.has('minRating') && ratingRadios.length) {
        const ratingValue = queryParams.get('minRating');
        ratingRadios.forEach(radio => {
            if (radio.value === ratingValue) {
                radio.checked = true;
            }
        });
    }

    if (queryParams.has('ecoOnly') && ecoSwitch) {
        ecoSwitch.checked = (queryParams.get('ecoOnly') === 'true');
    }
}

/**
 * Crée un élément de carte de trajet à partir des données d'un trajet et d'un template.
 * @param {object} rideData - Les données du trajet venant de l'API.
 * @returns {Node|null} Le nœud DOM de la carte de trajet remplie, ou null si erreur.
 */
function createRideCardElement(rideData) {
        const templateElement = document.getElementById('ride-card-template');
    if (!templateElement) {
        console.error("Template #ride-card-template est manquant.");
        return null;
    }

    const clone = templateElement.content.cloneNode(true);
    const cardElement = clone.querySelector('.ride-card');

    if (!cardElement) {
        console.error("Élément '.ride-card' non trouvé dans le template cloné.");
        return null; 
    }
    
    // Rendre les ID uniques pour le collapse 
    const uniqueRideIdSuffix = `_ride_${rideData.ride_id}`; // rideData est l'objet du trajet en cours
    const detailsButton = cardElement.querySelector('.ride-details-button');
    
    // 1. Sélectionne l'élément qui va devenir le "collapse" par une classe stable
    const collapseElement = cardElement.querySelector('.collapse'); // Assure-toi que ton div.collapse a bien cette classe

    if (collapseElement) {
        // 2. Assigne un ID unique
        const newCollapseId = `detailsCollapse${uniqueRideIdSuffix}`;
        collapseElement.id = newCollapseId;

        // 3. Mets à jour le bouton "Détails" pour qu'il cible ce nouvel ID
        if (detailsButton) {
            detailsButton.setAttribute('data-bs-target', `#${newCollapseId}`);
            detailsButton.setAttribute('aria-controls', newCollapseId);
            detailsButton.setAttribute('data-ride-id', rideData.ride_id); // Tu l'as déjà
        } else {
            console.error("Bouton Détails (.ride-details-button) non trouvé pour trajet", rideData.ride_id);
        }
    } else {
        console.error("Div .collapse non trouvée dans le template pour trajet ID", rideData.ride_id);
    }

    // Remplir les informations de la carte
    const driverPhotoEl = cardElement.querySelector('.driver-profile-photo');
    const driverUsernameEl = cardElement.querySelector('.driver-username');
    const driverRatingEl = cardElement.querySelector('.driver-rating');
    const departureLocationEl = cardElement.querySelector('.ride-departure-location');
    const arrivalLocationEl = cardElement.querySelector('.ride-arrival-location');
    const departureTimeEl = cardElement.querySelector('.ride-departure-time');
    const estimatedDurationEl = cardElement.querySelector('.ride-estimated-duration');
    const priceEl = cardElement.querySelector('.ride-price');
    const seatsAvailableEl = cardElement.querySelector('.ride-available-seats');

    // Détails dans le collapse
    const carModelEl = cardElement.querySelector('.ride-car-model');
    const carEnergyEl = cardElement.querySelector('.ride-car-energy');
    const participateButton = cardElement.querySelector('.participate-button');
    const carRegYearEl = cardElement.querySelector('.ride-car-registration-year');
    const departureAddressDetailEl = cardElement.querySelector('.ride-departure-address-details');
    const arrivalAddressDetailEl = cardElement.querySelector('.ride-arrival-address-details');
    // const seatsInModalEl = cardElement.querySelector('.ride-available-seats-modal'); // La modale est globale

    if (departureAddressDetailEl) {
        departureAddressDetailEl.textContent = rideData.departure_address; 
    }
    if (arrivalAddressDetailEl) {
        arrivalAddressDetailEl.textContent = rideData.arrival_address;
    }

    // --- Remplissage des données principales de la carte ---
    if (driverPhotoEl && rideData.driver_photo) {
        driverPhotoEl.src = rideData.driver_photo;
        driverPhotoEl.alt = `Photo de ${rideData.driver_username}`;
    } else if (driverPhotoEl) {
        driverPhotoEl.src = "././img/default-profile.png" ; // Chemin vers une image par défaut
        driverPhotoEl.alt = 'Photo de profil par défaut';
    }
    if (driverUsernameEl) driverUsernameEl.textContent = rideData.driver_username;
    
    // Note moyenne du chauffeur (l'API search_rides ne la renvoie pas encore, ce sera pour les détails)
    if (driverRatingEl) driverRatingEl.textContent = rideData.driver_average_rating ? `${parseFloat(rideData.driver_average_rating).toFixed(1)} (${rideData.driver_review_count || 0} avis)` : 'N/A';
    else if (driverRatingEl) driverRatingEl.textContent = 'N/A';


    if (departureLocationEl) departureLocationEl.textContent = rideData.departure_city || 'N/A'; 
    if (arrivalLocationEl) arrivalLocationEl.textContent = rideData.arrival_city || 'N/A';

    if (departureTimeEl && rideData.departure_time) {
        const depDate = new Date(rideData.departure_time.replace(' ', 'T'));
        departureTimeEl.textContent = `${depDate.toLocaleDateString([], {day:'2-digit', month:'2-digit', year:'numeric'})} ${depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    
    // Calcul et affichage de la durée estimée
    if (estimatedDurationEl && rideData.departure_time && rideData.estimated_arrival_time) {
        const departure = new Date(rideData.departure_time.replace(' ', 'T'));
        const arrival = new Date(rideData.estimated_arrival_time.replace(' ', 'T'));
        const durationMs = arrival - departure;
        
        console.log("🕒 Départ brut :", rideData.departure_time);
        console.log("🕒 Arrivée brut :", rideData.estimated_arrival_time);
        console.log("🧠 Date objets :", departure, arrival);
        console.log("🧮 Durée ms :", durationMs);

        if (durationMs > 0) {
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            estimatedDurationEl.textContent = `${hours}h${minutes < 10 ? '0' : ''}${minutes}`;
        } else {
            estimatedDurationEl.textContent = "N/A";
        }
    } else if (estimatedDurationEl) {
        estimatedDurationEl.textContent = "N/A";
    }

    if (priceEl) priceEl.textContent = `${rideData.price_per_seat} crédits`;
    if (seatsAvailableEl) seatsAvailableEl.textContent = rideData.seats_available !== null ? rideData.seats_available : 'N/A';
    
    const ecoCheckbox = cardElement.querySelector('input.is-ride-eco');
    const ecoLabel = cardElement.querySelector('label.is-ride-eco'); // Sélectionne par classe

    if (ecoCheckbox) {
        const newEcoId = `ecoCheck_ride_${rideData.ride_id}`; // Crée un ID unique
        ecoCheckbox.id = newEcoId; // Change l'ID de l'input
        if (ecoLabel) ecoLabel.setAttribute('for', newEcoId); // Met à jour le 'for' du label
        
        ecoCheckbox.checked = rideData.is_eco_ride || false;
        ecoCheckbox.disabled = true;

        const ecoCheckWrapper = ecoCheckbox.closest('.form-check');
        if (ecoCheckWrapper) {
            ecoCheckWrapper.style.display = rideData.is_eco_ride ? 'inline-block' : 'none';
        }
    }


    // --- Remplissage des détails dans le "collapse" ---
    if (carModelEl) carModelEl.textContent = `${rideData.vehicle_brand || ''} ${rideData.vehicle_model || ''}`.trim();
        if (carEnergyEl) {
        carEnergyEl.textContent = rideData.vehicle_energy || 'N/A';
    }
    
    if (carRegYearEl && rideData.vehicle_registration_date) {
        // Extrait juste l'année de la date AAAA-MM-JJ
        carRegYearEl.textContent = rideData.vehicle_registration_date.substring(0, 4); 
    } else if (carRegYearEl) {
        carRegYearEl.textContent = 'N/A';
    }


    if (detailsButton && collapseElement) { // Vérifie les deux
        detailsButton.addEventListener('click', async () => { 
            // À L'INTÉRIEUR du listener, collapseElement est celui défini ci-dessus et a un ID
            console.log("Clic sur Détails pour trajet ID:", rideData.ride_id, "Section à afficher/peupler:", collapseElement.id);
        });
        }

    if (participateButton) {
        participateButton.setAttribute('data-ride-id', rideData.ride_id);
        participateButton.addEventListener('click', () => {
            // Mettre à jour les infos dans la modale #confirmationModal
            document.getElementById('modal-ride-departure-location').textContent = rideData.departure_city;
            document.getElementById('modal-ride-arrival-location').textContent = rideData.arrival_city;
            const depDate = new Date(rideData.departure_time.replace(' ', 'T'));
            document.getElementById('modal-ride-date-text').textContent = depDate.toLocaleDateString();
            document.getElementById('modal-ride-time-text').textContent = depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            document.getElementById('modal-ride-credits-cost').textContent = rideData.price_per_seat;
            // Mettre à jour le data-ride-id sur le bouton de confirmation de la modale
            document.getElementById('confirm-booking-btn').setAttribute('data-ride-id', rideData.ride_id);
            // Les places dispo pour la modale
            const modalSeatsSpan = document.querySelector('#confirmationModal .ride-available-seats-modal');
            if (modalSeatsSpan) modalSeatsSpan.textContent = rideData.seats_available;

        });
    }
    (async () => {
    try {
        const detailsRes = await fetch(`http://ecoride.local/api/get_ride_details.php?ride_id=${rideData.ride_id}`);
        if (!detailsRes.ok) throw new Error(`Erreur API détails trajet (statut ${detailsRes.status})`);

        const detailsData = await detailsRes.json();
        if (!detailsData.success) throw new Error("Réponse API échec: " + (detailsData.message || "inconnue"));

        // === Préférences chauffeur ===
        const prefs = detailsData.details?.driver_preferences || {};
        const prefsContainer = cardElement.querySelector('.driver-preferences-text');
        const noPrefsMsg = cardElement.querySelector('.no-prefs-message');
        if (prefsContainer) {
            prefsContainer.innerHTML = ''; // Reset

            let hasPref = false;

            if (prefs.smoker !== undefined) {
                hasPref = true;
                const smokeText = prefs.smoker ? 'Accepte les fumeurs' : 'Non-fumeur';
                const el = document.createElement('p');
                el.classList.add('mb-1');
                el.textContent = smokeText;
                prefsContainer.appendChild(el);
            }

            if (prefs.animals !== undefined) {
                hasPref = true;
                const animalText = prefs.animals ? 'Accepte les animaux' : 'N’accepte pas les animaux';
                const el = document.createElement('p');
                el.classList.add('mb-1');
                el.textContent = animalText;
                prefsContainer.appendChild(el);
            }

            if (prefs.custom && prefs.custom.trim() !== '') {
                hasPref = true;
                const el = document.createElement('p');
                el.classList.add('mb-1');
                el.textContent = prefs.custom;
                prefsContainer.appendChild(el);
            }

            if (!hasPref && noPrefsMsg) {
                noPrefsMsg.classList.remove('d-none');
            }
        }

        // === Avis chauffeur ===
        const reviewsContainer = cardElement.querySelector('.driver-reviews-container');
        const reviewTemplate = document.getElementById('driver-review-item-template');

        if (reviewsContainer && reviewTemplate) {
            const reviews = detailsData.details?.reviews || [];

            reviews.forEach(review => {
                const reviewClone = reviewTemplate.content.cloneNode(true);
                const authorEl = reviewClone.querySelector('.review-author');
                const dateEl = reviewClone.querySelector('.review-date');
                const starsEl = reviewClone.querySelector('.review-stars');
                const commentEl = reviewClone.querySelector('.review-comment');

                if (authorEl) authorEl.textContent = review.author_username || "Utilisateur";
                if (dateEl) {
                    const date = new Date(review.submission_date.replace(' ', 'T'));
                    dateEl.textContent = date.toLocaleDateString('fr-FR');
                }
                if (starsEl) {
                    const stars = parseInt(review.rating, 10);
                    starsEl.innerHTML = '★'.repeat(stars) + '☆'.repeat(5 - stars);
                }
                if (commentEl) commentEl.textContent = review.comment || "";

                reviewsContainer.appendChild(reviewClone);
            });
        }
    } catch (err) {
        console.warn(`Erreur lors de la récupération des détails du trajet ${rideData.ride_id} :`, err);
    }
})();
    return cardElement; 
}


async function fetchAndDisplayRides() {
    console.log("RidesSearchPageHandler: fetchAndDisplayRides appelée.");
    const rideResultsContainer = document.getElementById('ride-results-container');
    const noResultsMessage = document.getElementById('no-results-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const otherRidesBar = document.getElementById('other-rides-bar');

    if (!rideResultsContainer || !noResultsMessage || !loadingIndicator) {
        console.error("DOM manquant pour affichage résultats recherche.");
        return;
    }

    loadingIndicator.classList.remove('d-none');

    rideResultsContainer.innerHTML = ''; 
    noResultsMessage.classList.add('d-none');

    const queryParams = new URLSearchParams(window.location.search);
    if (!queryParams.get('departure') || !queryParams.get('destination')) {
        loadingIndicator.classList.add('d-none');
        otherRidesBar.classList.add('d-none')
        return; // Ne rien faire si pas de recherche
    }
    // On récupère les paramètres de recherche principaux depuis l'URL
    let apiUrl = 'http://ecoride.local/api/search_rides.php?' + 
                `departure_city=${encodeURIComponent(queryParams.get('departure') || '')}` +
                `&arrival_city=${encodeURIComponent(queryParams.get('destination') || '')}` +
                `&date=${encodeURIComponent(queryParams.get('date') || '')}` +
                `&seats=${encodeURIComponent(queryParams.get('seats') || '1')}`;

    ['maxPrice', 'maxDuration', 'animalsAllowed', 'minRating', 'ecoOnly'].forEach(filterKey => {
        if (queryParams.has(filterKey) && queryParams.get(filterKey) !== '') {
            // Convertir les booléens pour l'API si besoin (ecoOnly, animalsAllowed)
            let value = queryParams.get(filterKey);
            if (filterKey === 'ecoOnly' && value === 'true') value = '1';
            else if (filterKey === 'ecoOnly' && value === 'false') value = '0';
            if (filterKey === 'animalsAllowed' && value === 'true') value = '1';
            else if (filterKey === 'animalsAllowed' && value === 'false') value = '0';
            
            apiUrl += `&${filterKey}=${encodeURIComponent(value)}`;
        }
    });
    
    console.log("fetchAndDisplayRides: Appel API vers:", apiUrl);

    try {
        const response = await fetch(apiUrl);
        setTimeout(() => {
        loadingIndicator.classList.add('d-none');
        }, 1000);

        if (!response.ok) { 
            const errorText = await response.text().catch(() => "Impossible de lire le corps de l'erreur.");
            throw new Error(`Erreur API (statut ${response.status}): ${errorText.substring(0,200)}`);
        }
        const data = await response.json().catch(async (jsonError) => {
            const errorText = await response.text().catch(() => "Impossible de lire le corps de l'erreur JSON.");
            console.error("Erreur parsing JSON de la réponse search_rides:", jsonError, "Réponse brute:", errorText);
            throw new Error(`Réponse non-JSON du serveur (statut ${response.status}): ${errorText.substring(0,200)}`);
        });
        console.log("fetchAndDisplayRides: Données reçues:", data);

if (data.success && data.rides && data.rides.length > 0) {
    data.rides.forEach(ride => {
        // FILTRAGE côté client ici
        if (!applyClientSideFilters(ride)) return;  // Si le trajet ne passe pas les filtres, on le saute

        const rideCard = createRideCardElement(ride); 
        if (rideCard) {
            rideResultsContainer.appendChild(rideCard);
        }
    });

    // Si aucun résultat n’est affiché après filtrage
    if (rideResultsContainer.children.length === 0) {
        noResultsMessage.textContent = "Aucun trajet ne correspond à vos critères de recherche.";
        noResultsMessage.classList.remove('d-none');
    }

} else {
    noResultsMessage.textContent = data.message || "Aucun trajet ne correspond à vos critères de recherche.";
    noResultsMessage.classList.remove('d-none');
}

    } catch (error) {
        loadingIndicator.classList.add('d-none');
        console.error("Erreur Fetch globale (search_rides):", error);
        noResultsMessage.textContent = "Une erreur de communication est survenue. " + error.message;
        noResultsMessage.classList.remove('d-none');
    }
}

function applyClientSideFilters(ride) {
    const urlParams = new URLSearchParams(window.location.search);
    const maxPrice = parseFloat(urlParams.get('maxPrice')) || Infinity;
    const maxDuration = parseFloat(urlParams.get('maxDuration')) || Infinity;
    const animalsAllowed = urlParams.get('animalsAllowed'); // peut valoir "", "true", "false"
    const minRating = parseFloat(urlParams.get('minRating')) || 0;
    const ecoOnly = urlParams.get('ecoOnly') === 'true';

    // Prix
    if (ride.price_per_seat > maxPrice) return false;

    // Durée
    if (ride.departure_time && ride.estimated_arrival_time) {
        const dep = new Date(ride.departure_time);
        const arr = new Date(ride.estimated_arrival_time);
        const durationHours = (arr - dep) / (1000 * 60 * 60);
        if (durationHours > maxDuration) return false;
    }

    // Animaux
    if (animalsAllowed === 'true' && ride.driver_pref_animals !== true) return false;
    if (animalsAllowed === 'false' && ride.driver_pref_animals !== false) return false;

    // Note
    if (ride.driver_average_rating && parseFloat(ride.driver_average_rating) < minRating) return false;

    // Éco
    if (ecoOnly && !ride.is_eco_ride) return false;

    return true;
}



export function initializeRidesSearchPage() {
    console.log("RidesSearchPageHandler: Initialisation de la page de recherche de trajets.");

    if (typeof initializeSearchForm === 'function' && document.getElementById('search-form')) {
        initializeSearchForm(); 
        console.log("RidesSearchPageHandler: initializeSearchForm() appelée.");
    } else if (!document.getElementById('search-form')) {
        console.warn("RidesSearchPageHandler: Formulaire 'search-form' non trouvé.");
    }

    const filterForm = document.getElementById('filter-form');
    const durationRangeInput = document.getElementById('duration-filter-range');
    const priceRangeInput = document.getElementById('price-filter');
    const animalRadios = document.querySelectorAll('input[name="animal-option"]');
    const ratingRadios = document.querySelectorAll('input[name="rating-options"]');
    const ecoSwitch = document.getElementById('eco-filter');
    const resetButton = filterForm ? filterForm.querySelector('button[type="button"].secondary-btn') : null;

    // Pré-remplir les filtres à partir de l'URL
    if (filterForm) { 
        prefillFilterFormFromURL();
    }

    // Initialisation pour le slider de durée
    if (durationRangeInput) {
        // L'affichage initial est déjà géré par prefillFilterFormFromURL (qui appelle updateDurationOutputDisplay)
        // ou par updateDurationOutputDisplay(durationRangeInput.value) si prefill ne fait rien pour la durée.
        // Pour être sûr, on peut l'appeler ici aussi si prefill n'a pas de valeur d'URL pour la durée.
        if (!new URLSearchParams(window.location.search).has('maxDuration')) {
            updateDurationOutputDisplay(durationRangeInput.value); 
        }
        durationRangeInput.addEventListener('input', function() {
            updateDurationOutputDisplay(this.value);
        });
    }

    // Initialisation pour le slider de prix
    if (priceRangeInput) {
        // L'affichage initial est déjà géré par prefillFilterFormFromURL
        if (!new URLSearchParams(window.location.search).has('maxPrice')) {
            updatePriceOutputDisplay(priceRangeInput.value); 
        }
        priceRangeInput.addEventListener('input', function() {
            updatePriceOutputDisplay(this.value); 
        });
    }

    if (filterForm) {
        filterForm.addEventListener('submit', function(event) {
            event.preventDefault();
            
            const filters = {
                maxPrice: priceRangeInput ? priceRangeInput.value : null,
                maxDuration: durationRangeInput ? parseFloat(durationRangeInput.value) : null,
                animalsAllowed: null,
                minRating: null,
                ecoOnly: ecoSwitch ? ecoSwitch.checked : false
            };

            animalRadios.forEach(radio => {
                if (radio.checked && radio.value !== "") {
                    filters.animalsAllowed = radio.value; 
                }
            });

            ratingRadios.forEach(radio => {
                if (radio.checked && radio.value !== "0") {
                    filters.minRating = radio.value;
                }
            });

            console.log("Filtres appliqués :", filters);
            
            const currentSearchParams = new URLSearchParams(window.location.search);
            ['maxPrice', 'maxDuration', 'animalsAllowed', 'minRating', 'ecoOnly'].forEach(key => currentSearchParams.delete(key));

            Object.keys(filters).forEach(key => {
                if (filters[key] !== null && filters[key] !== "" && (typeof filters[key] !== 'boolean' || filters[key] === true) ) {
                    currentSearchParams.set(key, filters[key]);
                }
            });
            
            const newUrl = `${window.location.pathname}?${currentSearchParams.toString()}`;
            
            window.history.pushState({filtersApplied: filters}, "", newUrl);
            if (typeof LoadContentPage === "function") {
                LoadContentPage(); 
            } else {
                console.warn("LoadContentPage n'est pas disponible pour appliquer les filtres.");
            }
        });

        if (resetButton) {
            resetButton.addEventListener('click', function() {
                console.log("Filtres réinitialisés.");
                
                const currentSearchParams = new URLSearchParams(window.location.search);
                const searchCriteriaParams = {};
                ['departure', 'destination', 'date', 'seats'].forEach(key => {
                    if (currentSearchParams.has(key)) {
                        searchCriteriaParams[key] = currentSearchParams.get(key);
                    }
                });
                
                const newUrl = `${window.location.pathname}?${new URLSearchParams(searchCriteriaParams).toString()}`;

                window.history.pushState({filtersReset: true}, "", newUrl);
                if (typeof LoadContentPage === "function") {
                    LoadContentPage(); 
                } else {
                    console.warn("LoadContentPage n'est pas disponible pour réinitialiser les filtres.");
                }
            });
        }
    } else {
        console.warn("RidesSearchPageHandler: Formulaire 'filter-form' non trouvé.");
    }
        // APPEL INITIAL POUR CHARGER LES RÉSULTATS BASÉS SUR L'URL ACTUELLE
    fetchAndDisplayRides(); 
}
