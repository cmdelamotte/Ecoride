import { initializeSearchForm } from './searchFormHandler.js'; 
import { LoadContentPage } from '../../router/Router.js'; 

/**
 * Met à jour l'affichage de la valeur du slider de durée.
 * @param {string} valueString - La valeur actuelle du slider (ex: "3.5").
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
    
    // Le TODO pour l'appel fetch initial des résultats est toujours là
}
