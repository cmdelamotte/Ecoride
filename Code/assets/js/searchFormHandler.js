import { LoadContentPage } from '../../router/Router.js';

export function initializeSearchForm() {
    const searchForm = document.getElementById('search-form');
    const departureInput = document.getElementById('search-form-departure');
    const destinationInput = document.getElementById('search-form-destination');
    const dateInput = document.getElementById('search-form-date');
    const passengersInput = document.getElementById('search-form-passenger-numbers');

    // --- Fonction pour pré-remplir le formulaire depuis les paramètres de l'URL ---
    function prefillSearchFormFromURL() {
        const queryParams = new URLSearchParams(window.location.search);

        if (queryParams.has('departure') && departureInput) {
            departureInput.value = queryParams.get('departure');
        }
        if (queryParams.has('destination') && destinationInput) {
            destinationInput.value = queryParams.get('destination');
        }
        if (queryParams.has('date') && dateInput) {
            dateInput.value = queryParams.get('date');
        }
        if (queryParams.has('seats') && passengersInput) {
            passengersInput.value = queryParams.get('seats');
        }
    }

    // --- Attacher l'écouteur de soumission ---
    if (searchForm) {
        searchForm.addEventListener('submit', function(event) {            
            event.preventDefault(); 
            if (dateInput) dateInput.setCustomValidity("");
            let isFormValidOverall = true;

            if (!searchForm.checkValidity()) {
                isFormValidOverall = false; 
            }

            const rideDateValue = dateInput?.value;
            if (dateInput && rideDateValue) { 
                const today = new Date();
                const selectedDate = new Date(rideDateValue);
                today.setHours(0, 0, 0, 0);
                selectedDate.setHours(0,0,0,0);
                if (selectedDate < today) {
                    dateInput.setCustomValidity("La date du trajet ne peut pas être dans le passé.");
                    isFormValidOverall = false; 
                } else {
                    dateInput.setCustomValidity(""); 
                }
            }
            
            if (!isFormValidOverall) {
                searchForm.reportValidity(); 
                console.log("Validation du formulaire de recherche échouée (native ou custom).");
            } else {
                console.log("Formulaire de recherche valide.");
                const departure = departureInput?.value.trim();
                const destination = destinationInput?.value.trim();
                const passengers = parseInt(passengersInput?.value, 10);

                const searchCriteria = { departure, destination, date: rideDateValue, seats: passengers };
                console.log("Critères de recherche :", searchCriteria);

                const queryParams = new URLSearchParams(searchCriteria).toString();
                const targetUrl = `/rides-search?${queryParams}`;

                window.history.pushState({ searchCriteria }, "", targetUrl);
                if (typeof LoadContentPage === "function") {
                    LoadContentPage();
                } else {
                    console.warn("LoadContentPage n'est pas défini. Tentative de rechargement forcé.");
                    window.location.href = targetUrl;
                }
            }
        });

        // Réinitialisation de la validité custom sur changement de la date
        if (dateInput) {
            dateInput.addEventListener('input', () => {
                dateInput.setCustomValidity("");
            });
        }
    } else {
        // console.warn("Formulaire 'search-form' non trouvé pour initialisation.");
    }

    // --- Exécuter le pré-remplissage si on est sur la page de résultats de recherche ---
    // On vérifie si on est bien sur /rides-search avant de tenter de pré-remplir
    // et si les champs du formulaire sont bien présents (ce qui est déjà fait par la présence de `searchForm`)
    if (window.location.pathname === '/rides-search' && searchForm) {
        prefillSearchFormFromURL();
    }
}