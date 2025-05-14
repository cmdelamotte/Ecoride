// assets/js/yourRidesPageHandler.js

// Fonction helper pour mettre à jour l'affichage des étoiles de notation
function updateStarDisplay(starsContainer, ratingValue) {
    if (!starsContainer) return;
    const stars = starsContainer.querySelectorAll('i.bi');
    stars.forEach(star => {
        const starValue = parseInt(star.getAttribute('data-value'), 10);
        if (starValue <= ratingValue) {
            star.classList.remove('bi-star');
            star.classList.add('bi-star-fill', 'text-warning');
        } else {
            star.classList.remove('bi-star-fill', 'text-warning');
            star.classList.add('bi-star');
        }
    });
}

// Fonction pour initialiser la logique de la modale d'avis
function initializeReviewModal() {
    const reviewModalElement = document.getElementById('reviewModal');
    if (!reviewModalElement) {
        // console.warn("Modal #reviewModal introuvable.");
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
    const ratingErrorMessageDiv = document.getElementById('rating-error-message'); // La div pour l'erreur des étoiles

    let currentRideId = null; 

    reviewModalElement.addEventListener('show.bs.modal', function (event) {
        const button = event.relatedTarget; 
        if (button) {
            currentRideId = button.getAttribute('data-ride-id');
            const driverName = button.getAttribute('data-driver-name');
            const rideDescription = button.getAttribute('data-ride-description');

            if (rideDetailsSpan) rideDetailsSpan.textContent = rideDescription || "[Description du trajet non disponible]";
            if (driverNameSpan) driverNameSpan.textContent = driverName || "[PseudoChauffeur]";
            
            const ratingLabel = reviewModalElement.querySelector('label[for="review-rating"]'); // Cible le label par son 'for'
            if (ratingLabel && driverName) { 
                ratingLabel.textContent = `Votre note pour ${driverName}:`;
            } else if (ratingLabel) {
                ratingLabel.textContent = `Votre note pour [PseudoChauffeur]:`;
            }
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
        if (ratingErrorMessageDiv) ratingErrorMessageDiv.classList.add('d-none');
    });

    if (ratingStarsContainer && ratingValueHiddenInput) {
        const stars = ratingStarsContainer.querySelectorAll('i.bi'); 

        stars.forEach(star => {
            star.addEventListener('click', function() {
                const rating = parseInt(this.getAttribute('data-value'), 10);
                ratingValueHiddenInput.value = rating; 
                updateStarDisplay(ratingStarsContainer, rating); 
                if (ratingErrorMessageDiv) ratingErrorMessageDiv.classList.add('d-none'); // Cache l'erreur si on clique
            });

            star.addEventListener('mouseover', function() {
                const hoverRating = parseInt(this.getAttribute('data-value'), 10);
                // Pour l'effet de survol simple qui remplit les étoiles temporairement
                stars.forEach(s => {
                    const sValue = parseInt(s.getAttribute('data-value'), 10);
                    if (sValue <= hoverRating) {
                       s.classList.remove('bi-star'); s.classList.add('bi-star-fill', 'text-warning');
                    } else {
                       s.classList.remove('bi-star-fill', 'text-warning'); s.classList.add('bi-star');
                    }
                });
            });

            star.addEventListener('mouseout', function() {
                const currentRating = parseInt(ratingValueHiddenInput.value, 10) || 0;
                updateStarDisplay(ratingStarsContainer, currentRating); // Réaffiche la note sélectionnée
            });
        });
    }
    
    function handleTripExperienceChange() {
        if (reportProblemSection && tripBadRadio && reportCommentTextarea) {
            if (tripBadRadio.checked) { 
                reportProblemSection.classList.remove('d-none');
            } else { 
                reportProblemSection.classList.add('d-none');
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

            // Réinitialisation des messages custom au début de la soumission
            if (ratingValueHiddenInput) ratingValueHiddenInput.setCustomValidity(""); // Bien que non visible
            if (reportCommentTextarea) reportCommentTextarea.setCustomValidity("");
            if (reviewCommentTextarea) reviewCommentTextarea.setCustomValidity("");
            if (ratingErrorMessageDiv) ratingErrorMessageDiv.classList.add('d-none'); // Cacher le message d'erreur des étoiles


            let isFormValidOverall = true;

            // Validation HTML5 de base (si des champs ont 'required' dans le HTML)
            if (!reviewForm.checkValidity()) {
                isFormValidOverall = false;
            }

            const rating = parseInt(ratingValueHiddenInput?.value, 10) || 0;
            const tripExperience = document.querySelector('input[name="tripOverallExperience"]:checked')?.value;
            const reviewComment = reviewCommentTextarea?.value.trim();
            const reportComment = reportCommentTextarea?.value.trim();

            // Validation de la note
            if (rating < 1 || rating > 5) {
                if (ratingErrorMessageDiv) { // Affichage du message d'erreur spécifique
                    ratingErrorMessageDiv.textContent = "Veuillez sélectionner une note entre 1 et 5 étoiles.";
                    ratingErrorMessageDiv.classList.remove('d-none');
                }
                isFormValidOverall = false;
            }

            // Si "Non" est coché, le commentaire de problème devient obligatoire
            if (tripExperience === 'bad' && !reportComment) {
                if (reportCommentTextarea) {
                    reportCommentTextarea.setCustomValidity("Veuillez décrire le problème rencontré.");
                    // reportValidity() plus bas affichera le tooltip pour ce champ
                }
                isFormValidOverall = false;
            }
            
            if (!isFormValidOverall) {
                reviewForm.reportValidity(); // Affiche les tooltips pour les champs avec setCustomValidity (comme reportCommentTextarea)
                console.log("Validation du formulaire d'avis échouée.");
            } else {
                console.log("Formulaire d'avis valide. Données :", {
                    rideId: currentRideId,
                    rating: rating,
                    tripExperience: tripExperience,
                    reviewComment: reviewComment,
                    reportComment: (tripExperience === 'bad' ? reportComment : null) 
                });

                alert("Avis soumis avec succès (simulation) !");
                
                const modalInstance = bootstrap.Modal.getInstance(reviewModalElement);
                if (modalInstance) {
                    modalInstance.hide(); 
                }
            }
        });
    }

    // UX: Réinitialiser les messages custom sur input pour les textarea
    [reviewCommentTextarea, reportCommentTextarea].forEach(textarea => {
        if (textarea) {
            textarea.addEventListener('input', () => {
                textarea.setCustomValidity("");
            });
        }
    });
}


export function initializeYourRidesPage() {
    console.log("YourRidesPageHandler: Initialisation de la page Mes Trajets.");
    
    // TODO (Plus tard): Logique pour afficher l'historique des trajets.

    initializeReviewModal(); 
}