// assets/js/yourRidesPageHandler.js

// Fonction helper pour mettre à jour l'affichage des étoiles de notation
function updateStarDisplay(starsContainer, ratingValue) {
    if (!starsContainer) return;
    const stars = starsContainer.querySelectorAll('i.bi');
    stars.forEach(star => {
        const starValue = parseInt(star.getAttribute('data-value'), 10);
        // Utilisation de classList.toggle pour ajouter/enlever les classes de manière plus concise
        star.classList.toggle('bi-star-fill', starValue <= ratingValue);
        star.classList.toggle('text-warning', starValue <= ratingValue);
        star.classList.toggle('bi-star', starValue > ratingValue);
    });
}

// Fonction pour initialiser la logique de la modale d'avis
function initializeReviewModal() {
    const reviewModalElement = document.getElementById('reviewModal');
    if (!reviewModalElement) {
        // console.warn("Modal #reviewModal introuvable pour initialisation."); // Commentaire gardé si utile pour futur debug
        return;
    }

    const reviewForm = document.getElementById('submit-review-form');
    const rideDetailsSpan = document.getElementById('review-modal-ride-details');
    const driverNameSpan = document.getElementById('review-modal-driver-name');
    const ratingStarsContainer = document.getElementById('review-rating-stars');
    const ratingValueHiddenInput = document.getElementById('ratingValueHiddenInput');
    const tripGoodRadio = document.getElementById('tripGood');
    const tripBadRadio = document.getElementById('tripBad');
    const reportProblemSection = document.getElementById('report-problem-section');
    const reviewCommentTextarea = document.getElementById('review-comment');
    const reportCommentTextarea = document.getElementById('report-comment');
    const ratingErrorMessageDiv = document.getElementById('rating-error-message'); 

    let currentRideId = null; 

    reviewModalElement.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget; 
        if (button) {
            currentRideId = button.getAttribute('data-ride-id');
            const driverName = button.getAttribute('data-driver-name');
            const rideDescription = button.getAttribute('data-ride-description');

            if (rideDetailsSpan) rideDetailsSpan.textContent = rideDescription || "[Trajet non spécifié]";
            if (driverNameSpan) driverNameSpan.textContent = driverName || "[Chauffeur]";
            
            const ratingLabel = reviewModalElement.querySelector('label[for="review-rating"]'); 
            if (ratingLabel) { // Mise à jour plus concise du label
                ratingLabel.textContent = `Votre note pour ${driverName || "[PseudoChauffeur]"}:`;
            }
        } else {
            // console.warn("EVENT show.bs.modal: event.relatedTarget est null ou undefined."); // Gardé si utile
        }

        if (reviewForm) reviewForm.reset(); 
        if (ratingValueHiddenInput) {
            ratingValueHiddenInput.value = ""; 
            ratingValueHiddenInput.setCustomValidity(""); 
        }
        if (ratingStarsContainer) updateStarDisplay(ratingStarsContainer, 0); 
        if (tripGoodRadio) tripGoodRadio.checked = true; 
        if (reportProblemSection) reportProblemSection.classList.add('d-none'); 
        if (reportCommentTextarea) {
            reportCommentTextarea.value = '';
            reportCommentTextarea.setCustomValidity("");
        }
        if (reviewCommentTextarea) {
            reviewCommentTextarea.value = ''; 
            reviewCommentTextarea.setCustomValidity("");
        }
        if (ratingErrorMessageDiv) {
            ratingErrorMessageDiv.classList.add('d-none');
            ratingErrorMessageDiv.textContent = '';
        }
    });

    if (ratingStarsContainer && ratingValueHiddenInput) {
        const stars = ratingStarsContainer.querySelectorAll('i.bi'); 
        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.getAttribute('data-value'), 10);
                ratingValueHiddenInput.value = rating; 
                updateStarDisplay(ratingStarsContainer, rating); 
                if (ratingErrorMessageDiv) ratingErrorMessageDiv.classList.add('d-none'); 
            });
            star.addEventListener('mouseover', function() {
                const hoverRating = parseInt(this.getAttribute('data-value'), 10);
                // Simplification de l'effet de survol pour qu'il soit identique au clic visuellement
                updateStarDisplay(ratingStarsContainer, hoverRating); 
            });
            star.addEventListener('mouseout', function() {
                const currentRating = parseInt(ratingValueHiddenInput.value, 10) || 0;
                updateStarDisplay(ratingStarsContainer, currentRating); 
            });
        });
    }
    
    function handleTripExperienceChange() {
        if (reportProblemSection && tripBadRadio && reportCommentTextarea) {
            const showProblemSection = tripBadRadio.checked;
            reportProblemSection.classList.toggle('d-none', !showProblemSection);
            if (!showProblemSection) { // Si on cache la section (l'utilisateur a coché "Oui")
                reportCommentTextarea.value = ''; 
                reportCommentTextarea.setCustomValidity(""); 
            }
        }
    }
    if (tripGoodRadio) tripGoodRadio.addEventListener('change', handleTripExperienceChange);
    if (tripBadRadio) tripBadRadio.addEventListener('change', handleTripExperienceChange);

    if (reviewForm) {
        reviewForm.addEventListener('submit', function(event) {
            event.preventDefault();
            if (ratingValueHiddenInput) ratingValueHiddenInput.setCustomValidity(""); 
            if (reportCommentTextarea) reportCommentTextarea.setCustomValidity("");
            if (reviewCommentTextarea) reviewCommentTextarea.setCustomValidity("");
            if (ratingErrorMessageDiv) ratingErrorMessageDiv.classList.add('d-none');

            let isFormValidOverall = true;
            if (!reviewForm.checkValidity()) isFormValidOverall = false;

            const rating = parseInt(ratingValueHiddenInput?.value, 10) || 0;
            const tripExperience = document.querySelector('input[name="tripOverallExperience"]:checked')?.value;
            const reviewComment = reviewCommentTextarea?.value.trim();
            const reportComment = reportCommentTextarea?.value.trim();

            if (rating < 1 || rating > 5) {
                if (ratingErrorMessageDiv) { 
                    ratingErrorMessageDiv.textContent = "Veuillez sélectionner une note entre 1 et 5 étoiles.";
                    ratingErrorMessageDiv.classList.remove('d-none');
                }
                isFormValidOverall = false;
            }
            if (tripExperience === 'bad' && !reportComment) {
                if (reportCommentTextarea) reportCommentTextarea.setCustomValidity("Veuillez décrire le problème rencontré.");
                isFormValidOverall = false;
            }
            
            if (!isFormValidOverall) {
                reviewForm.reportValidity(); 
                // console.log("Validation du formulaire d'avis échouée."); // Commenté
            } else {
                console.log("Avis soumis (simulation) :", { // Gardé un log utile
                    rideId: currentRideId, rating, tripExperience, reviewComment, 
                    reportComment: (tripExperience === 'bad' ? reportComment : null) 
                });
                alert("Avis soumis avec succès (simulation) !");
                const modalInstance = bootstrap.Modal.getInstance(reviewModalElement);
                if (modalInstance) modalInstance.hide(); 
            }
        });
    }
    [reviewCommentTextarea, reportCommentTextarea].forEach(textarea => {
        if (textarea) {
            textarea.addEventListener('input', () => textarea.setCustomValidity(""));
        }
    });
}

// Données factices pour les trajets de l'utilisateur
let userRides = [
    { id: 'RIDE001', depart: 'Paris', arrivee: 'Lyon', date: '2025-05-20', heure: '08:00', role: 'Chauffeur', statut: 'À venir', dureeEstimee: '4h30', vehicule: 'Peugeot 208 (AA-123-BB)', passagersInscrits: 2, passagersMax: 3, gainEstime: 45, estEco: true, driverName: 'MoiChauffeur', driverRating: null },
    // === TRAJET PASSAGER À VENIR/CONFIRMÉ POUR TEST ===
    { id: 'RIDE006', depart: 'Bordeaux', arrivee: 'Toulouse', date: '2025-05-22', heure: '10:00', role: 'Passager', statut: 'Terminé', dureeEstimee: '2h30', vehicule: 'Volkswagen Golf', prixPaye: 18, estEco: false, driverName: 'SuperConducteur', driverRating: '4.9' },
    // =================================================
    { id: 'RIDE002', depart: 'Rennes', arrivee: 'Nantes', date: '2025-05-18', heure: '14:30', role: 'Passager', statut: 'Confirmé', dureeEstimee: '1h15', vehicule: 'Renault Clio', prixPaye: 10, estEco: false, driverName: 'ChauffeurCool', driverRating: '4.8' },
    { id: 'RIDE003', depart: 'Lille', arrivee: 'Bordeaux', date: '2025-05-01', heure: '09:00', role: 'Chauffeur', statut: 'Terminé', dureeEstimee: '7h00', vehicule: 'Tesla Model 3', passagersTransportes: 3, gainObtenu: 60, estEco: true, driverName: 'MoiChauffeur', driverRating: null },
    { id: 'RIDE004', depart: 'Marseille', arrivee: 'Nice', date: '2025-04-25', heure: '11:00', role: 'Passager', statut: 'Terminé', dureeEstimee: '2h00', vehicule: 'Fiat 500', prixPaye: 12, estEco: false, driverName: 'Soleil Conducteur', driverRating: '4.2' },
    { id: 'RIDE005', depart: 'Brest', arrivee: 'Quimper', date: '2025-05-19', heure: '10:00', role: 'Chauffeur', statut: 'En cours', dureeEstimee: '1h00', vehicule: 'Citroën C3', passagersInscrits: 1, passagersMax: 2, gainEstime: 10, estEco: false, driverName: 'MoiChauffeur', driverRating: null },
];

// Fonction pour créer l'élément HTML d'une carte de trajet
function createRideCardElement(rideData) {
    const template = document.getElementById('ride-card-template');
    if (!template) return null; // Simplification du console.error

    const clone = template.content.cloneNode(true);
    const cardElement = clone.querySelector('.ride-card');

    const setText = (selector, text) => {
        const el = cardElement.querySelector(selector);
        if (el) el.textContent = text || '';
    };
    const setClassAndText = (selector, text, baseClass, specificClass) => { // Simplifié
        const el = cardElement.querySelector(selector);
        if (el) {
            el.textContent = text || '';
            el.className = `badge ${baseClass} ${specificClass || ''}`.trim();
        }
    };
    const toggleElement = (selector, show) => {
        const el = cardElement.querySelector(selector);
        if (el) el.classList.toggle('d-none', !show);
    };

    setText('.ride-id', `ID Trajet: #${rideData.id}`);
    setText('.ride-title', `${rideData.depart} → ${rideData.arrivee}`);
    setText('.ride-date', rideData.date); 
    setText('.ride-time', rideData.heure);
    setText('.ride-duration', rideData.dureeEstimee || 'N/A');
    setText('.ride-status-text', rideData.statut);

    setClassAndText('.ride-role', rideData.role, 
        rideData.role === 'Chauffeur' ? 'bg-primary' : 'bg-success'); // Simplifié
    toggleElement('.ride-eco-badge', rideData.estEco);

    if (rideData.role === 'Chauffeur') {
        toggleElement('.driver-view-passengers-info', true);
        setText('.ride-passengers-current', rideData.passagersInscrits ?? '0');
        setText('.ride-passengers-max', rideData.passagersMax ?? 'N/A');
        setText('.price-label', 'Gain estimé/obtenu :');
        setText('.ride-price-amount', rideData.gainEstime ?? rideData.gainObtenu ?? 'N/A');
        toggleElement('.passenger-view-driver-info', false); 
    } else { 
        toggleElement('.passenger-view-driver-info', true);
        setText('.ride-driver-name', rideData.driverName || 'N/A');
        setText('.ride-driver-rating', rideData.driverRating || 'N/A');
        setText('.price-label', 'Prix payé :');
        setText('.ride-price-amount', rideData.prixPaye ?? 'N/A');
        toggleElement('.driver-view-passengers-info', false); 
    }
    toggleElement('.ride-price-info', true);
    setText('.ride-vehicle-details', rideData.vehicule || 'N/A');
    toggleElement('.ride-vehicle-info', true);

    const actionsContainer = cardElement.querySelector('.ride-actions');
    actionsContainer.innerHTML = ''; 

    if (rideData.role === 'Chauffeur') {
        if (rideData.statut === 'À venir') {
            actionsContainer.innerHTML = `
                <button class="btn primary-btn btn-sm mb-1 w-100 action-start-ride" data-ride-id="${rideData.id}">Démarrer le trajet</button>
                <button class="btn btn-outline-danger btn-sm w-100 action-cancel-ride-driver" data-ride-id="${rideData.id}">Annuler ce trajet</button>`;
        } else if (rideData.statut === 'En cours') {
            actionsContainer.innerHTML = `<button class="btn primary-btn btn-sm mb-1 w-100 action-finish-ride" data-ride-id="${rideData.id}">Arrivée à destination</button>`;
        }
    } else if (rideData.role === 'Passager') {
        if (rideData.statut === 'Confirmé' || rideData.statut === 'À venir') {
            actionsContainer.innerHTML = `<button class="btn btn-outline-danger btn-sm w-100 action-cancel-booking" data-ride-id="${rideData.id}">Annuler ma réservation</button>`;
        } else if (rideData.statut === 'Terminé') {
            const reviewButton = document.createElement('button');
            reviewButton.className = 'btn secondary-btn btn-sm w-100 action-leave-review';
            reviewButton.textContent = 'Laisser un avis';
            // data-bs-toggle et data-bs-target sont nécessaires si on veut que Bootstrap gère l'ouverture nativement
            // Si on gère manuellement dans handleRideAction, ils ne sont pas strictement nécessaires mais ne gênent pas.
            // Pour la robustesse et si la gestion manuelle pose souci, on les remet.
            reviewButton.setAttribute('data-bs-toggle', 'modal'); 
            reviewButton.setAttribute('data-bs-target', '#reviewModal');
            reviewButton.setAttribute('data-ride-id', rideData.id);
            reviewButton.setAttribute('data-driver-name', rideData.driverName || 'Chauffeur Inconnu'); 
            reviewButton.setAttribute('data-ride-description', `${rideData.depart} → ${rideData.arrivee}`);
            actionsContainer.appendChild(reviewButton);
        }
    }
    return cardElement;
}

function renderAllRides() {
    const currentRideHighlightDiv = document.getElementById('current-ride-highlight');
    const upcomingRidesContainer = document.querySelector('#upcoming-rides .rides-list-container');
    const pastRidesContainer = document.querySelector('#past-rides .rides-list-container');
    const allRidesContainer = document.querySelector('#all-rides .rides-list-container');
    const noRidesMessageGlobal = document.getElementById('no-rides-message'); 

    if (!currentRideHighlightDiv || !upcomingRidesContainer || !pastRidesContainer || !allRidesContainer || !noRidesMessageGlobal) return;
    
    currentRideHighlightDiv.innerHTML = ''; currentRideHighlightDiv.classList.add('d-none');
    upcomingRidesContainer.innerHTML = ''; pastRidesContainer.innerHTML = ''; allRidesContainer.innerHTML = '';
    noRidesMessageGlobal.classList.add('d-none'); 

    let hasUpcomingRide = false;
    let hasPastRide = false;

    userRides.forEach(ride => {
        const rideCard = createRideCardElement(ride);
        if (!rideCard) return;

        // Toujours ajouter une copie à l'onglet "Tous les trajets"
        if (allRidesContainer) allRidesContainer.appendChild(rideCard.cloneNode(true));

        if (ride.statut === 'En cours') {
            currentRideHighlightDiv.appendChild(rideCard); // L'original va ici
            currentRideHighlightDiv.classList.remove('d-none');
            // Option: ajouter aussi une copie à "À venir" si on veut qu'il y apparaisse
            // if (upcomingRidesContainer) upcomingRidesContainer.appendChild(rideCard.cloneNode(true));
            hasUpcomingRide = true; 
        } else if (ride.statut === 'À venir' || ride.statut === 'Confirmé') {
            if (upcomingRidesContainer) upcomingRidesContainer.appendChild(rideCard);
            hasUpcomingRide = true;
        } else if (ride.statut === 'Terminé' || ride.statut === 'Annulé Chauffeur' || ride.statut === 'Annulé Passager') {
            const pastCard = rideCard.cloneNode(true); 
            pastCard.classList.add('opacity-75');
            if (pastRidesContainer) pastRidesContainer.appendChild(pastCard);
            hasPastRide = true;
        }
    });
    
    if (upcomingRidesContainer && upcomingRidesContainer.children.length === 0) upcomingRidesContainer.innerHTML = '<p class="text-center text-muted mt-3">Aucun trajet à venir.</p>';
    if (pastRidesContainer && pastRidesContainer.children.length === 0) pastRidesContainer.innerHTML = '<p class="text-center text-muted mt-3">Aucun trajet passé.</p>';
    if (allRidesContainer && allRidesContainer.children.length === 0) allRidesContainer.innerHTML = '<p class="text-center text-muted mt-3">Aucun trajet dans votre historique.</p>';
    
    if (userRides.length === 0 && currentRideHighlightDiv.classList.contains('d-none')) {
        noRidesMessageGlobal.classList.remove('d-none');
    }
}

function handleRideAction(event) {
    const target = event.target;
    // Si le clic est sur le bouton d'avis, laisser Bootstrap gérer via data-attributes
    // Si c'est un autre bouton d'action, il doit avoir data-ride-id
    const reviewButtonTrigger = target.closest('button.action-leave-review');
    if (reviewButtonTrigger) {
        // Laisser Bootstrap ouvrir la modale grâce aux attributs data-bs-toggle et data-bs-target sur le bouton.
        // L'event 'show.bs.modal' dans initializeReviewModal s'occupera de peupler les données.
        return; 
    }

    const actionButton = target.closest('button[data-ride-id]'); 
    if (!actionButton) return;

    const rideId = actionButton.getAttribute('data-ride-id');
    const rideIndex = userRides.findIndex(r => r.id === rideId);
    if (rideIndex === -1) return;

    let actionAlertMessage = "";

    if (actionButton.classList.contains('action-start-ride')) {
        userRides[rideIndex].statut = 'En cours';
        actionAlertMessage = `Trajet ${rideId} démarré (simulation) !`;
    } else if (actionButton.classList.contains('action-finish-ride')) {
        userRides[rideIndex].statut = 'Terminé';
        actionAlertMessage = `Trajet ${rideId} terminé (simulation) ! Les passagers seront notifiés.`;
    } else if (actionButton.classList.contains('action-cancel-ride-driver')) {
        userRides[rideIndex].statut = 'Annulé Chauffeur'; 
        actionAlertMessage = `Trajet ${rideId} annulé par le chauffeur (simulation) !`;
    } else if (actionButton.classList.contains('action-cancel-booking')) {
        userRides[rideIndex].statut = 'Annulé Passager'; 
        actionAlertMessage = `Réservation pour le trajet ${rideId} annulée (simulation) !`;
    }

    if (actionAlertMessage) alert(actionAlertMessage);
    renderAllRides(); 
}

export function initializeYourRidesPage() {
    // console.log("YourRidesPageHandler: Initialisation de la page Mes Trajets.");
    
    initializeReviewModal(); 
    renderAllRides(); 

    const ridesHistorySection = document.querySelector('.rides-history-section');
    if (ridesHistorySection) {
        ridesHistorySection.addEventListener('click', handleRideAction);
    }

    const rideTabs = document.querySelectorAll('#ridesTabs button[data-bs-toggle="tab"]');
    rideTabs.forEach(tab => {
        tab.addEventListener('shown.bs.tab', function (event) {
            const activeTabPaneId = event.target.getAttribute('data-bs-target'); 
            const activeTabPane = document.querySelector(activeTabPaneId);
            const noRidesMessageGlobal = document.getElementById('no-rides-message');

            if (noRidesMessageGlobal) {
                const hasContentInActiveTab = activeTabPane?.querySelector('.ride-card');
                const isCurrentRideVisible = !document.getElementById('current-ride-highlight')?.classList.contains('d-none');

                if (hasContentInActiveTab || isCurrentRideVisible) {
                    noRidesMessageGlobal.classList.add('d-none');
                } else {
                    const allRidesContainer = document.querySelector('#all-rides .rides-list-container');
                    if (allRidesContainer?.children.length === 0 && !isCurrentRideVisible) {
                        noRidesMessageGlobal.classList.remove('d-none');
                    } else {
                        noRidesMessageGlobal.classList.add('d-none'); 
                    }
                }
            }
        });
    });
}