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


/**
 * Récupère et affiche les avis en attente.
 */
async function fetchPendingReviews() {
    const reviewsContainer = document.querySelector('.review-list');
    const noReviewsMessage = document.getElementById('no-pending-reviews');
    if (!reviewsContainer || !noReviewsMessage) return;

    reviewsContainer.innerHTML = '<p class="text-center text-muted">Chargement des avis...</p>'; // Indicateur de chargement
    noReviewsMessage.classList.add('d-none');

    try {
        const response = await fetch('http://ecoride.local/api/employee_get_pending_reviews.php');
        const data = await response.json();

        if (data.success) {
            displayPendingReviews(data.reviews || []); // Appelle la fonction d'affichage
        } else {
            console.error("Erreur API employee_get_pending_reviews:", data.message);
            reviewsContainer.innerHTML = ''; // Vide l'indicateur de chargement
            noReviewsMessage.textContent = data.message || "Erreur lors du chargement des avis.";
            noReviewsMessage.classList.remove('d-none');
        }
    } catch (error) {
        console.error("Erreur Fetch globale (employee_get_pending_reviews):", error);
        reviewsContainer.innerHTML = '';
        noReviewsMessage.textContent = "Erreur de communication pour charger les avis.";
        noReviewsMessage.classList.remove('d-none');
    }
}

/**
 * Récupère et affiche les signalements.
 */
async function fetchReportedRides() {
    const reportsContainer = document.querySelector('.reported-rides-list');
    const noReportsMessage = document.getElementById('no-reported-rides');
    if (!reportsContainer || !noReportsMessage) return;

    reportsContainer.innerHTML = '<p class="text-center text-muted">Chargement des signalements...</p>';
    noReportsMessage.classList.add('d-none');

    try {
        const response = await fetch('http://ecoride.local/api/employee_get_reports.php');
        const data = await response.json();

        if (data.success) {
            displayReportedRides(data.reports || []);
        } else {
            console.error("Erreur API employee_get_reports:", data.message);
            reportsContainer.innerHTML = '';
            noReportsMessage.textContent = data.message || "Erreur lors du chargement des signalements.";
            noReportsMessage.classList.remove('d-none');
        }
    } catch (error) {
        console.error("Erreur Fetch globale (employee_get_reports):", error);
        reportsContainer.innerHTML = '';
        noReportsMessage.textContent = "Erreur de communication pour charger les signalements.";
        noReportsMessage.classList.remove('d-none');
    }
}

// --- Gestion des Actions ---

/**
 * Gère les actions sur les avis (validation, refus) via API.
 * @param {Event} event - L'objet événement du clic.
 */
async function handleReviewAction(event) {
    const targetButton = event.target.closest('button');
    if (!targetButton) return;

    const card = targetButton.closest('.card[data-review-id]');
    if (!card) return;

    const reviewId = card.dataset.reviewId; // Ex: "REV001"
    let newStatus = '';
    let confirmMessage = '';

    if (targetButton.classList.contains('action-validate-review')) {
        newStatus = 'approved';
        confirmMessage = `Valider l'avis ${reviewId} ? Le chauffeur sera crédité si applicable.`;
    } else if (targetButton.classList.contains('action-reject-review')) {
        newStatus = 'rejected';
        confirmMessage = `Refuser l'avis ${reviewId} ?`;
    } else {
        return; // Pas un bouton d'action d'avis
    }

    if (!reviewId || !newStatus) {
        console.error("ID d'avis ou nouveau statut manquant pour l'action.");
        return;
    }

    if (!confirm(confirmMessage)) {
        return;
    }

    targetButton.disabled = true; // Désactiver pendant l'appel

    try {
        const response = await fetch('http://ecoride.local/api/employee_update_review_status.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ review_id: reviewId, new_status: newStatus })
        });
        const result = await response.json();

        if (result.success) {
            alert(result.message || `Avis ${reviewId} mis à jour !`);
            fetchPendingReviews(); // Recharger la liste des avis en attente
        } else {
            alert(result.message || "Erreur lors de la mise à jour de l'avis.");
            console.error("Erreur API employee_update_review_status:", result);
        }
    } catch (error) {
        console.error("Erreur Fetch globale (employee_update_review_status):", error);
        alert("Erreur de communication pour mettre à jour l'avis. " + error.message);
    } finally {
        targetButton.disabled = false; // Réactiver le bouton
    }
}

// --- Initialisation de la Page ---

export function initializeEmployeeDashboardPage() {
    console.log("EmployeeDashboardHandler: Initialisation de la page Espace Employé.");

    fetchPendingReviews();
    fetchReportedRides();

    const reviewsContainer = document.querySelector('.review-list');
    if (reviewsContainer) {
        reviewsContainer.addEventListener('click', handleReviewAction);
    } else {
        console.warn("Conteneur .review-list non trouvé pour attacher l'écouteur d'événements.");
    }
}