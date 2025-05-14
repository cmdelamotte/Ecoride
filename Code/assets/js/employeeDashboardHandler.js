// --- Données Simulées ---
let pendingReviewsData = [
    {
        reviewId: 'REV001',
        passengerName: 'Alice Voyageuse',
        driverName: 'Bob Conducteur',
        rating: 4, // Note sur 5
        comment: "Trajet agréable, conducteur sympathique et prudent. Arrivé à l'heure.",
        submittedDate: '2025-05-14',
        rideId: 'RIDE123',
        rideDetails: 'Paris -> Lyon'
    },
    {
        reviewId: 'REV002',
        passengerName: 'Charles Client',
        driverName: 'Carole Chauffeuse',
        rating: 2,
        comment: "Conductrice en retard de 30 minutes sans prévenir. Voiture un peu sale.",
        submittedDate: '2025-05-13',
        rideId: 'RIDE124',
        rideDetails: 'Rennes -> Nantes'
    },
    {
        reviewId: 'REV003',
        passengerName: 'David Passager',
        driverName: 'Diane Pilote',
        rating: 5,
        comment: "Excellent ! Conduite souple, voiture propre, très bonne discussion. Je recommande vivement !",
        submittedDate: '2025-05-12',
        rideId: 'RIDE125',
        rideDetails: 'Lille -> Bruxelles'
    }
];

let reportedRidesData = [
    {
        reportId: 'REP001', // Ou utiliser rideId si un trajet ne peut être signalé qu'une fois
        rideId: 'RIDE456',
        rideDeparture: 'Marseille',
        rideArrival: 'Nice',
        rideDate: '2025-05-10',
        reportSubmissionDate: '2025-05-11',
        passengerName: 'Eva Plaignante',
        passengerEmail: 'eva.plaignante@email.com',
        driverName: 'Fred Fautif',
        driverEmail: 'fred.fautif@email.com',
        reasonComment: "Le chauffeur a conduit de manière extrêmement dangereuse, faisant plusieurs excès de vitesse et ignorant les feux rouges. J'ai eu très peur."
    },
    {
        reportId: 'REP002',
        rideId: 'RIDE789',
        rideDeparture: 'Bordeaux',
        rideArrival: 'Toulouse',
        rideDate: '2025-05-09',
        reportSubmissionDate: '2025-05-10',
        passengerName: 'Georges Témoin',
        passengerEmail: 'georges.temoin@email.com',
        driverName: 'Gisèle Conductrice',
        driverEmail: 'gisele.conductrice@email.com',
        reasonComment: "Le véhicule ne correspondait pas à celui annoncé (beaucoup plus petit et ancien). De plus, le chauffeur a voulu me faire payer un supplément en espèces à la fin du trajet."
    }
];

// --- Fonctions d'Affichage ---

/**
 * Génère et affiche les étoiles de notation.
 * @param {HTMLElement} starsContainer - Le conteneur où afficher les étoiles.
 * @param {number} rating - La note (0-5).
 * @param {number} maxStars - Le nombre maximum d'étoiles (généralement 5).
 */
function renderRatingStars(starsContainer, rating, maxStars = 5) {
    if (!starsContainer) return;
    starsContainer.innerHTML = ''; // Vider les étoiles précédentes
    for (let i = 1; i <= maxStars; i++) {
        const starIcon = document.createElement('i');
        starIcon.classList.add('bi');
        if (i <= rating) {
            starIcon.classList.add('bi-star-fill', 'text-warning');
        } else if (i - 0.5 === rating) {
            starIcon.classList.add('bi-star-half', 'text-warning');
        } else {
            starIcon.classList.add('bi-star', 'text-warning'); // Ou une autre couleur pour les étoiles vides si souhaité
        }
        starsContainer.appendChild(starIcon);
        starsContainer.appendChild(document.createTextNode(' ')); // Espace entre les étoiles
    }
}

/**
 * Affiche la liste des avis en attente de modération.
 * @param {Array} reviews - Tableau des objets avis.
 */
function displayPendingReviews(reviews) {
    const reviewsContainer = document.querySelector('.review-list');
    const noReviewsMessage = document.getElementById('no-pending-reviews');
    const template = document.getElementById('pending-review-card-template');

    if (!reviewsContainer || !template || !noReviewsMessage) {
        console.error("Éléments DOM manquants pour l'affichage des avis en attente.");
        return;
    }

    reviewsContainer.innerHTML = ''; // Vider le contenu précédent

    if (!reviews || reviews.length === 0) {
        noReviewsMessage.classList.remove('d-none');
        return;
    }

    noReviewsMessage.classList.add('d-none');

    reviews.forEach(review => {
        const clone = template.content.cloneNode(true);
        const cardElement = clone.querySelector('.card');

        cardElement.dataset.reviewId = review.reviewId;
        cardElement.querySelector('.review-passenger-name').textContent = review.passengerName;
        cardElement.querySelector('.review-driver-name').textContent = review.driverName;
        cardElement.querySelector('.review-id').textContent = `ID Avis: #${review.reviewId}`;

        const starsContainer = cardElement.querySelector('.review-rating-stars');
        renderRatingStars(starsContainer, review.rating);
        cardElement.querySelector('.review-rating-text').textContent = `(${review.rating} / 5)`;
        
        cardElement.querySelector('.review-comment-content').textContent = review.comment;
        cardElement.querySelector('.review-submitted-date').textContent = review.submittedDate;
        cardElement.querySelector('.review-ride-id').textContent = review.rideId;
        cardElement.querySelector('.review-ride-details').textContent = review.rideDetails;

        reviewsContainer.appendChild(clone);
    });
}

/**
 * Affiche la liste des covoiturages signalés.
 * @param {Array} reports - Tableau des objets signalements.
 */
function displayReportedRides(reports) {
    const reportsContainer = document.querySelector('.reported-rides-list');
    const noReportsMessage = document.getElementById('no-reported-rides');
    const template = document.getElementById('reported-ride-card-template');

    if (!reportsContainer || !template || !noReportsMessage) {
        console.error("Éléments DOM manquants pour l'affichage des signalements.");
        return;
    }

    reportsContainer.innerHTML = ''; // Vider le contenu précédent

    if (!reports || reports.length === 0) {
        noReportsMessage.classList.remove('d-none');
        return;
    }

    noReportsMessage.classList.add('d-none');

    reports.forEach(report => {
        const clone = template.content.cloneNode(true);
        const cardElement = clone.querySelector('.card');

        cardElement.dataset.reportId = report.reportId; // ou report.rideId
        cardElement.querySelector('.report-ride-id').textContent = report.rideId;
        cardElement.querySelector('.report-submission-date').textContent = `Date signalement: ${report.reportSubmissionDate}`;
        cardElement.querySelector('.report-ride-departure').textContent = report.rideDeparture;
        cardElement.querySelector('.report-ride-arrival').textContent = report.rideArrival;
        cardElement.querySelector('.report-ride-date').textContent = report.rideDate;
        cardElement.querySelector('.report-passenger-name').textContent = report.passengerName;
        const passengerEmailLink = cardElement.querySelector('.report-passenger-email');
        passengerEmailLink.textContent = report.passengerEmail;
        passengerEmailLink.href = `mailto:${report.passengerEmail}`;
        cardElement.querySelector('.report-driver-name').textContent = report.driverName;
        const driverEmailLink = cardElement.querySelector('.report-driver-email');
        driverEmailLink.textContent = report.driverEmail;
        driverEmailLink.href = `mailto:${report.driverEmail}`;
        cardElement.querySelector('.report-reason-content').textContent = report.reasonComment;

        reportsContainer.appendChild(clone);
    });
}

// --- Gestion des Actions ---

/**
 * Gère les actions sur les avis (validation, refus).
 * @param {Event} event - L'objet événement du clic.
 */
function handleReviewAction(event) {
    const targetButton = event.target.closest('button');
    if (!targetButton) return; // Clic en dehors d'un bouton

    const card = targetButton.closest('.card[data-review-id]');
    if (!card) return;

    const reviewId = card.dataset.reviewId;
    let actionMessage = '';

    if (targetButton.classList.contains('action-validate-review')) {
        // Simulation: supprimer l'avis de la liste des données et rafraîchir
        pendingReviewsData = pendingReviewsData.filter(review => review.reviewId !== reviewId);
        actionMessage = `Avis ${reviewId} validé (simulation) !`;
    } else if (targetButton.classList.contains('action-reject-review')) {
        // Simulation: supprimer l'avis de la liste des données et rafraîchir
        pendingReviewsData = pendingReviewsData.filter(review => review.reviewId !== reviewId);
        actionMessage = `Avis ${reviewId} refusé (simulation) !`;
    }

    if (actionMessage) {
        alert(actionMessage);
        displayPendingReviews(pendingReviewsData); // Rafraîchir la liste des avis
    }
}

// --- Initialisation de la Page ---

export function initializeEmployeeDashboardPage() {
    console.log("EmployeeDashboardHandler: Initialisation de la page Espace Employé.");

    displayPendingReviews(pendingReviewsData);
    displayReportedRides(reportedRidesData);

    const reviewsContainer = document.querySelector('.review-list');
    if (reviewsContainer) {
        reviewsContainer.addEventListener('click', handleReviewAction);
    } else {
        console.warn("Conteneur .review-list non trouvé pour attacher l'écouteur d'événements.");
    }
}