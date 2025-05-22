import { initializeSearchForm } from './searchFormHandler.js';
import { LoadContentPage } from '../../router/Router.js';

const RIDES_PER_PAGE = 5; // Nombre de résultats par page

function updateDurationOutputDisplay(valueString) {
    const outputElement = document.getElementById('duration-output');
    if (outputElement) {
        const value = parseFloat(valueString);
        const hours = Math.floor(value);
        const minutes = (value - hours) * 60;
        outputElement.textContent = hours + "h" + (minutes < 10 ? '0' : '') + minutes;
    }
}

function updatePriceOutputDisplay(valueString) {
    const outputElement = document.getElementById('price-output');
    if (outputElement) {
        outputElement.textContent = valueString + " crédits";
    }
}

function prefillFilterFormFromURL() {
    const queryParams = new URLSearchParams(window.location.search);
    const priceRangeInput = document.getElementById('price-filter');
    const durationRangeInput = document.getElementById('duration-filter-range');
    const animalRadios = document.querySelectorAll('input[name="animal-option"]');
    const ratingRadios = document.querySelectorAll('input[name="rating-options"]');
    const ecoSwitch = document.getElementById('eco-filter');

    if (queryParams.has('maxPrice') && priceRangeInput) {
        priceRangeInput.value = queryParams.get('maxPrice');
        updatePriceOutputDisplay(priceRangeInput.value);
    }
    if (queryParams.has('maxDuration') && durationRangeInput) {
        durationRangeInput.value = queryParams.get('maxDuration');
        updateDurationOutputDisplay(durationRangeInput.value);
    }
    if (queryParams.has('animalsAllowed') && animalRadios.length) {
        const animalsValue = queryParams.get('animalsAllowed');
        animalRadios.forEach(radio => { if (radio.value === animalsValue) radio.checked = true; });
    }
    if (queryParams.has('minRating') && ratingRadios.length) {
        const ratingValue = queryParams.get('minRating');
        ratingRadios.forEach(radio => { if (radio.value === ratingValue) radio.checked = true; });
    }
    if (queryParams.has('ecoOnly') && ecoSwitch) {
        ecoSwitch.checked = (queryParams.get('ecoOnly') === 'true');
    }
}

function createRideCardElement(rideData) {
    const templateElement = document.getElementById('ride-card-template');
    if (!templateElement) {
        console.error("Template #ride-card-template est manquant.");
        return null;
    }
    const clone = templateElement.content.cloneNode(true);
    const cardElement = clone.querySelector('.ride-card');
    if (!cardElement) {
        console.error("Élément '.ride-card' non trouvé.");
        return null;
    }
    const uniqueRideIdSuffix = `_ride_${rideData.ride_id}`;
    const detailsButton = cardElement.querySelector('.ride-details-button');
    const collapseElement = cardElement.querySelector('.collapse');
    if (collapseElement) {
        const newCollapseId = `detailsCollapse${uniqueRideIdSuffix}`;
        collapseElement.id = newCollapseId;
        if (detailsButton) {
            detailsButton.setAttribute('data-bs-target', `#${newCollapseId}`);
            detailsButton.setAttribute('aria-controls', newCollapseId);
            detailsButton.setAttribute('data-ride-id', rideData.ride_id);
        }
    }

    const driverPhotoEl = cardElement.querySelector('.driver-profile-photo');
    const driverUsernameEl = cardElement.querySelector('.driver-username');
    const driverRatingEl = cardElement.querySelector('.driver-rating');
    const departureLocationEl = cardElement.querySelector('.ride-departure-location');
    const arrivalLocationEl = cardElement.querySelector('.ride-arrival-location');
    const departureTimeEl = cardElement.querySelector('.ride-departure-time');
    const estimatedDurationEl = cardElement.querySelector('.ride-estimated-duration');
    const priceEl = cardElement.querySelector('.ride-price');
    const seatsAvailableEl = cardElement.querySelector('.ride-available-seats');
    const carModelEl = cardElement.querySelector('.ride-car-model');
    const carEnergyEl = cardElement.querySelector('.ride-car-energy');
    const participateButton = cardElement.querySelector('.participate-button');
    const carRegYearEl = cardElement.querySelector('.ride-car-registration-year');
    const departureAddressDetailEl = cardElement.querySelector('.ride-departure-address-details');
    const arrivalAddressDetailEl = cardElement.querySelector('.ride-arrival-address-details');

    if (departureAddressDetailEl) departureAddressDetailEl.textContent = rideData.departure_address;
    if (arrivalAddressDetailEl) arrivalAddressDetailEl.textContent = rideData.arrival_address;

    if (driverPhotoEl && rideData.driver_photo) {
        driverPhotoEl.src = rideData.driver_photo;
        driverPhotoEl.alt = `Photo de ${rideData.driver_username}`;
    } else if (driverPhotoEl) {
        driverPhotoEl.src = "/img/default-profile.png";
        driverPhotoEl.alt = 'Photo de profil par défaut';
    }
    if (driverUsernameEl) driverUsernameEl.textContent = rideData.driver_username;
    if (driverRatingEl) driverRatingEl.textContent = rideData.driver_average_rating ? `${parseFloat(rideData.driver_average_rating).toFixed(1)} (${rideData.driver_review_count || 0} avis)` : 'N/A';
    else if (driverRatingEl) driverRatingEl.textContent = 'N/A';
    if (departureLocationEl) departureLocationEl.textContent = rideData.departure_city || 'N/A';
    if (arrivalLocationEl) arrivalLocationEl.textContent = rideData.arrival_city || 'N/A';
    if (departureTimeEl && rideData.departure_time) {
        const depDate = new Date(rideData.departure_time.replace(' ', 'T'));
        departureTimeEl.textContent = `${depDate.toLocaleDateString([], {day:'2-digit', month:'2-digit', year:'numeric'})} ${depDate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
    if (estimatedDurationEl && rideData.departure_time && rideData.estimated_arrival_time) {
        const departure = new Date(rideData.departure_time.replace(' ', 'T'));
        const arrival = new Date(rideData.estimated_arrival_time.replace(' ', 'T'));
        const durationMs = arrival - departure;
        if (durationMs > 0) {
            const hours = Math.floor(durationMs / (1000 * 60 * 60));
            const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
            estimatedDurationEl.textContent = `${hours}h${minutes < 10 ? '0' : ''}${minutes}`;
        } else { estimatedDurationEl.textContent = "N/A"; }
    } else if (estimatedDurationEl) { estimatedDurationEl.textContent = "N/A"; }
    if (priceEl) priceEl.textContent = `${rideData.price_per_seat} crédits`;
    if (seatsAvailableEl) seatsAvailableEl.textContent = rideData.seats_available !== null ? rideData.seats_available : 'N/A';
    
    const ecoCheckbox = cardElement.querySelector('input.is-ride-eco');
    const ecoLabel = cardElement.querySelector('label.is-ride-eco');
    if (ecoCheckbox) {
        const newEcoId = `ecoCheck_ride_${rideData.ride_id}`;
        ecoCheckbox.id = newEcoId;
        if (ecoLabel) ecoLabel.setAttribute('for', newEcoId);
        ecoCheckbox.checked = rideData.is_eco_ride || false;
        ecoCheckbox.disabled = true;
        const ecoCheckWrapper = ecoCheckbox.closest('.form-check');
        if (ecoCheckWrapper) ecoCheckWrapper.style.display = rideData.is_eco_ride ? 'inline-block' : 'none';
    }

    if (carModelEl) carModelEl.textContent = `${rideData.vehicle_brand || ''} ${rideData.vehicle_model || ''}`.trim();
    if (carEnergyEl) carEnergyEl.textContent = rideData.vehicle_energy || 'N/A';
    if (carRegYearEl && rideData.vehicle_registration_date) {
        carRegYearEl.textContent = rideData.vehicle_registration_date.substring(0, 4);
    } else if (carRegYearEl) { carRegYearEl.textContent = 'N/A'; }

    if (participateButton) {
        participateButton.setAttribute('data-ride-id', rideData.ride_id);
    }

    (async () => {
    try {
        const detailsRes = await fetch(`/api/get_ride_details.php?ride_id=${rideData.ride_id}`);
        if (!detailsRes.ok) throw new Error(`Erreur API détails trajet (statut ${detailsRes.status})`);
        const detailsData = await detailsRes.json();
        if (!detailsData.success) throw new Error("Réponse API échec: " + (detailsData.message || "inconnue"));
        const prefs = detailsData.details?.driver_preferences || {};
        const prefsContainer = cardElement.querySelector('.driver-preferences-text');
        const noPrefsMsg = cardElement.querySelector('.no-prefs-message');
        if (prefsContainer) {
            prefsContainer.innerHTML = ''; let hasPref = false;
            if (prefs.smoker !== undefined) { hasPref = true; const el = document.createElement('p'); el.classList.add('mb-1'); el.textContent = prefs.smoker ? 'Accepte les fumeurs' : 'Non-fumeur'; prefsContainer.appendChild(el); }
            if (prefs.animals !== undefined) { hasPref = true; const el = document.createElement('p'); el.classList.add('mb-1'); el.textContent = prefs.animals ? 'Accepte les animaux' : 'N’accepte pas les animaux'; prefsContainer.appendChild(el); }
            if (prefs.custom && prefs.custom.trim() !== '') { hasPref = true; const el = document.createElement('p'); el.classList.add('mb-1'); el.textContent = prefs.custom; prefsContainer.appendChild(el); }
            if (!hasPref && noPrefsMsg) noPrefsMsg.classList.remove('d-none');
        }
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
                if (dateEl) dateEl.textContent = new Date(review.submission_date.replace(' ', 'T')).toLocaleDateString('fr-FR');
                if (starsEl) { const stars = parseInt(review.rating, 10); starsEl.innerHTML = '★'.repeat(stars) + '☆'.repeat(5 - stars); }
                if (commentEl) commentEl.textContent = review.comment || "";
                reviewsContainer.appendChild(reviewClone);
            });
        }
    } catch (err) { console.warn(`Erreur récup détails trajet ${rideData.ride_id}:`, err); }
    })();
    return cardElement;
}



function renderPaginationControls(currentPage, totalPages, currentSearchParams) {
    const paginationContainer = document.querySelector('ul.pagination');

    if (!paginationContainer) {
        console.error("Conteneur de pagination introuvable !");
        return;
    }

    paginationContainer.innerHTML = ''; // Vider les anciens contrôles

    if (totalPages <= 1) { // Pas besoin de pagination si 0 ou 1 page
        paginationContainer.classList.add('d-none'); // Cacher le conteneur
        return;
    }

    const navElement = document.querySelector('nav[aria-label="Navigation des pages de résultats"]');
    if (navElement) {
        navElement.classList.remove('d-none');
    }
    paginationContainer.classList.remove('d-none'); // Afficher le conteneur

    // Bouton Précédent
    const prevDisabled = currentPage === 1;
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${prevDisabled ? 'disabled' : ''}`;
    const prevLink = document.createElement('a');
    prevLink.className = 'page-link';
    prevLink.href = '#'; // Sera géré par JS
    prevLink.textContent = 'Précédent';
    if (!prevDisabled) {
        prevLink.onclick = (e) => {
            e.preventDefault();
            updateUrlAndReload(currentPage - 1, currentSearchParams);
        };
    }
    prevLi.appendChild(prevLink);
    paginationContainer.appendChild(prevLi);

    // Numéros de page
    for (let i = 1; i <= totalPages; i++) {
        const pageLi = document.createElement('li');
        pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
        const pageLink = document.createElement('a');
        pageLink.className = 'page-link';
        pageLink.href = '#';
        pageLink.textContent = i;
        if (i !== currentPage) {
            pageLink.onclick = (e) => {
                e.preventDefault();
                updateUrlAndReload(i, currentSearchParams);
            };
        }
        pageLi.appendChild(pageLink);
        paginationContainer.appendChild(pageLi);
    }

    // Bouton Suivant
    const nextDisabled = currentPage === totalPages;
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${nextDisabled ? 'disabled' : ''}`;
    const nextLink = document.createElement('a');
    nextLink.className = 'page-link';
    nextLink.href = '#';
    nextLink.textContent = 'Suivant';
    if (!nextDisabled) {
        nextLink.onclick = (e) => {
            e.preventDefault();
            updateUrlAndReload(currentPage + 1, currentSearchParams);
        };
    }
    nextLi.appendChild(nextLink);
    paginationContainer.appendChild(nextLi);
}

function updateUrlAndReload(newPage, searchParams) {
    searchParams.set('page', newPage); // Mettre à jour le paramètre 'page'
    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
    window.history.pushState({ page: newPage, searchParams: searchParams.toString() }, "", newUrl);
    fetchAndDisplayRides(); // Recharger les résultats pour la nouvelle page
}


async function fetchAndDisplayRides() {
    const rideResultsContainer = document.getElementById('ride-results-container');
    const noResultsMessage = document.getElementById('no-results-message');
    const loadingIndicator = document.getElementById('loading-indicator');
    const paginationNav = document.querySelector('nav[aria-label="Navigation des pages de résultats"]');

    if (!rideResultsContainer || !noResultsMessage || !loadingIndicator || !paginationNav) {
        console.error("DOM manquant pour affichage résultats recherche ou pagination.");
        return;
    }

    // Afficher l'indicateur de chargement immédiatement
    loadingIndicator.classList.remove('d-none');
    rideResultsContainer.innerHTML = ''; // Vider les anciens résultats
    noResultsMessage.innerHTML = ''; // Vider aussi le contenu du message (important pour la date proche)
    noResultsMessage.classList.add('d-none');
    paginationNav.classList.add('d-none'); // Cacher la pagination pendant le chargement

    const queryParamsFromUrl = new URLSearchParams(window.location.search);

    // Vérifier les paramètres de recherche principaux venant de l'URL
    if (!queryParamsFromUrl.get('departure') || !queryParamsFromUrl.get('destination') || !queryParamsFromUrl.get('date')) {
        loadingIndicator.classList.add('d-none');
    }

    // Construire les queryParams pour l'API en utilisant les noms attendus par search_rides.php
    const apiQueryParams = new URLSearchParams();
    apiQueryParams.set('departure_city', queryParamsFromUrl.get('departure') || '');
    apiQueryParams.set('arrival_city', queryParamsFromUrl.get('destination') || '');
    apiQueryParams.set('date', queryParamsFromUrl.get('date') || '');
    apiQueryParams.set('seats', queryParamsFromUrl.get('seats') || '1');
    apiQueryParams.set('page', queryParamsFromUrl.get('page') || '1');
    apiQueryParams.set('limit', queryParamsFromUrl.get('limit') || String(RIDES_PER_PAGE));

    // Ajouter les filtres supplémentaires s'ils sont dans l'URL
    ['maxPrice', 'maxDuration', 'animalsAllowed', 'minRating', 'ecoOnly'].forEach(filterKey => {
        if (queryParamsFromUrl.has(filterKey) && queryParamsFromUrl.get(filterKey) !== '') {
            apiQueryParams.set(filterKey, queryParamsFromUrl.get(filterKey));
        }
    });

    const apiUrl = `/api/search_rides.php?${apiQueryParams.toString()}`;

    try {
        const response = await fetch(apiUrl);
        const responseText = await response.text();
        let data;
        try {
            data = JSON.parse(responseText);
        } catch (jsonError) {
            console.error("Erreur parsing JSON (search_rides):", jsonError, "Réponse brute:", responseText);
            throw new Error(`Réponse non-JSON (statut ${response.status}): ${responseText.substring(0, 200)}`);
        }

        if (data.success) {
            if (data.rides && data.rides.length > 0) {
                data.rides.forEach(ride => {
                    const rideCard = createRideCardElement(ride);
                    if (rideCard) {
                        rideResultsContainer.appendChild(rideCard);
                    }
                });
                renderPaginationControls(data.page, data.totalPages, queryParamsFromUrl); // queryParamsFromUrl pour conserver tous les filtres dans les liens de pagination
            } else {
                // Aucun trajet pour la date actuelle
                let messageHtml = data.message || "Aucun trajet ne correspond à vos critères pour la date sélectionnée.";
                if (data.nextAvailableDate) {
                    const formattedNextDate = new Date(data.nextAvailableDate + 'T00:00:00').toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
                    messageHtml += `<br>Le prochain trajet disponible pour cet itinéraire est le <strong>${formattedNextDate}</strong>.`;
                    
                    const searchNextDateButton = document.createElement('button');
                    searchNextDateButton.className = 'btn primary-btn btn-sm mt-3';
                    searchNextDateButton.textContent = `Rechercher pour le ${formattedNextDate}`;
                    searchNextDateButton.onclick = () => {
                        const dateInput = document.getElementById('search-form-date');
                        if (dateInput) {
                            dateInput.value = data.nextAvailableDate; // AAAA-MM-JJ
                        }
                        
                        const newSearchParams = new URLSearchParams(queryParamsFromUrl.toString());
                        newSearchParams.set('date', data.nextAvailableDate);
                        newSearchParams.set('page', '1'); // Reset à la page 1 pour la nouvelle date
                        
                        const newUrl = `${window.location.pathname}?${newSearchParams.toString()}`;
                        window.history.pushState({ date: data.nextAvailableDate, searchParams: newSearchParams.toString() }, "", newUrl);
                        fetchAndDisplayRides(); 
                    };
                    
                    noResultsMessage.innerHTML = '';
                    const messageParagraph = document.createElement('p');
                    messageParagraph.innerHTML = messageHtml;
                    noResultsMessage.appendChild(messageParagraph);
                    noResultsMessage.appendChild(searchNextDateButton);

                } else {
                     noResultsMessage.innerHTML = messageHtml; // Juste le message "aucun trajet"
                }
                noResultsMessage.classList.remove('d-none');
                paginationNav.classList.add('d-none');
            }
        } else { // Si data.success est false dès le départ (erreur API)
            noResultsMessage.textContent = data.message || "Erreur lors de la recherche des trajets.";
            noResultsMessage.classList.remove('d-none');
            paginationNav.classList.add('d-none');
        }
    } catch (error) {
        console.error("Erreur Fetch globale (search_rides):", error);
        noResultsMessage.textContent = "Une erreur de communication est survenue. " + error.message;
        noResultsMessage.classList.remove('d-none');
        paginationNav.classList.add('d-none');
    } finally {
        setTimeout(() => {
            loadingIndicator.classList.add('d-none');
        }, 500); 
    }
}


export function initializeRidesSearchPage() {

    if (typeof initializeSearchForm === 'function' && document.getElementById('search-form')) {
        initializeSearchForm();
    }

    const filterForm = document.getElementById('filter-form');
    const durationRangeInput = document.getElementById('duration-filter-range');
    const priceRangeInput = document.getElementById('price-filter');
    const resetButton = filterForm ? filterForm.querySelector('button[type="button"].secondary-btn') : null;


    if (filterForm) {
        prefillFilterFormFromURL(); // Pré-remplir le formulaire de recherche ET les filtres
        if (durationRangeInput) {
            if (!new URLSearchParams(window.location.search).has('maxDuration')) {
                updateDurationOutputDisplay(durationRangeInput.value); 
            }
            durationRangeInput.addEventListener('input', function() { updateDurationOutputDisplay(this.value); });
        }
        if (priceRangeInput) {
            if (!new URLSearchParams(window.location.search).has('maxPrice')) {
                updatePriceOutputDisplay(priceRangeInput.value); 
            }
            priceRangeInput.addEventListener('input', function() { updatePriceOutputDisplay(this.value); });
        }

        filterForm.addEventListener('submit', function(event) {
            event.preventDefault();
            const currentSearchParams = new URLSearchParams(window.location.search);

            // Supprimer les anciens paramètres de filtre pour éviter les doublons
            ['maxPrice', 'maxDuration', 'animalsAllowed', 'minRating', 'ecoOnly', 'page'].forEach(key => currentSearchParams.delete(key));
            currentSearchParams.set('page', '1'); // Toujours aller à la page 1 quand on applique de nouveaux filtres

            // Ajouter les nouveaux filtres depuis le formulaire de filtre
            const formData = new FormData(filterForm);
            if (formData.get('price-filter')) currentSearchParams.set('maxPrice', formData.get('price-filter'));
            if (formData.get('duration_filter_range')) currentSearchParams.set('maxDuration', formData.get('duration_filter_range'));
            
            const animalOption = formData.get('animal-option');
            if (animalOption && animalOption !== "") currentSearchParams.set('animalsAllowed', animalOption);
            
            const ratingOption = formData.get('rating-options');
            if (ratingOption && ratingOption !== "0") currentSearchParams.set('minRating', ratingOption);
            
            if (document.getElementById('eco-filter')?.checked) currentSearchParams.set('ecoOnly', 'true');
            else currentSearchParams.delete('ecoOnly'); // S'assurer de le supprimer s'il n'est pas coché


            const newUrl = `${window.location.pathname}?${currentSearchParams.toString()}`;
            window.history.pushState({ filtersApplied: Object.fromEntries(formData) }, "", newUrl);
            fetchAndDisplayRides(); // Recharger avec les nouveaux filtres et la pagination réinitialisée
        });

        if (resetButton) {
            resetButton.addEventListener('click', function() {
                const currentSearchParams = new URLSearchParams(window.location.search);
                // Garder les paramètres de recherche principaux, supprimer les filtres et la page
                const searchCriteriaToKeep = {};
                ['departure_city', 'arrival_city', 'date', 'seats'].forEach(key => {
                    if (currentSearchParams.has(key)) searchCriteriaToKeep[key] = currentSearchParams.get(key);
                });
                
                const newUrl = `${window.location.pathname}?${new URLSearchParams(searchCriteriaToKeep).toString()}`;
                window.history.pushState({ filtersReset: true }, "", newUrl);
                // Recharger la page entière pour que prefillFilterFormFromURL remette les valeurs par défaut des filtres aussi
                if (typeof LoadContentPage === "function") {
                    LoadContentPage();
                } else {
                    window.location.href = newUrl; // Fallback
                }
            });
        }
    }

    const confirmBookingButton = document.getElementById('confirm-booking-btn');
    const confirmationModalElement = document.getElementById('confirmationModal');
    if (confirmBookingButton && confirmationModalElement) {
        confirmBookingButton.addEventListener('click', async () => {
            const rideIdToBook = confirmBookingButton.getAttribute('data-ride-id');
            const seatsToBook = 1; 
            if (!rideIdToBook) {
                alert("Erreur : ID du trajet non trouvé.");
                bootstrap.Modal.getInstance(confirmationModalElement)?.hide();
                return;
            }
            confirmBookingButton.disabled = true;
            try {
                const response = await fetch('/api/book_ride.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ride_id: parseInt(rideIdToBook, 10), seats_to_book: seatsToBook })
                });
                const data = await response.json().catch(async (jsonError) => {
                    const errorText = await response.text().catch(() => "Err JSON.");
                    throw new Error(`Non-JSON (statut ${response.status}): ${errorText.substring(0,200)}`);
                });
                if (response.ok && data.success) {
                    alert(data.message || "Réservation confirmée !");
                    fetchAndDisplayRides(); // Rafraîchir pour les places dispo et potentiellement la pagination
                } else {
                    alert(data.message || `Erreur réservation (statut ${response.status}).`);
                }
            } catch (error) {
                alert("Erreur communication réservation. " + error.message);
            } finally {
                confirmBookingButton.disabled = false;
                bootstrap.Modal.getInstance(confirmationModalElement)?.hide();
            }
        });
    }
    
    fetchAndDisplayRides(); 
}