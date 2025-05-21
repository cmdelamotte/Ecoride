export function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const subjectInput = document.getElementById('contact-subject');
    const messageTextarea = document.getElementById('contact-message');
    const messageDiv = document.getElementById('message-contact'); // Pour les messages de succès/erreur serveur

    if (contactForm) {
        contactForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation des messages custom et de la div de message
            [nameInput, emailInput, subjectInput, messageTextarea].forEach(input => {
                if (input) input.setCustomValidity("");
            });
            if (messageDiv) {
                messageDiv.classList.add('d-none');
                messageDiv.classList.remove('alert-success', 'alert-danger');
                messageDiv.textContent = '';
            }

            let isFormValidOverall = true;

            // Validation HTML5 native (pour required, type="email")
            if (!contactForm.checkValidity()) {
                isFormValidOverall = false;
            }

            // Validations JS personnalisées (optionnelles ici, car 'required' et type="email" gèrent beaucoup)
            // Exemple: vérifier si le message n'est pas trop court
            const messageValue = messageTextarea?.value.trim();
            if (messageTextarea && messageValue && messageValue.length < 10) { // Exemple: message d'au moins 10 caractères
                messageTextarea.setCustomValidity("Votre message doit contenir au moins 10 caractères.");
                isFormValidOverall = false;
            } else if (messageTextarea) {
                messageTextarea.setCustomValidity("");
            }
            
            if (!isFormValidOverall) {
                contactForm.reportValidity(); // Affiche les messages d'erreur natifs et custom
            } else {
                const name = nameInput?.value.trim();
                const email = emailInput?.value.trim();
                const subject = subjectInput?.value.trim();
                // messageValue est déjà défini

                // TODO: Appel fetch vers l'API backend pour envoyer le message.
                // Pour l'instant, simulation d'un succès :
                if (messageDiv) {
                    messageDiv.textContent = "Votre message a bien été envoyé ! Nous vous répondrons dès que possible.";
                    messageDiv.classList.remove('d-none', 'alert-danger');
                    messageDiv.classList.add('alert-success');
                } else {
                    alert("Message envoyé avec succès (simulation) !");
                }
                contactForm.reset(); // Vider le formulaire après succès
            }
        });

        // UX: Réinitialiser les messages custom sur input
        [nameInput, emailInput, subjectInput, messageTextarea].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    input.setCustomValidity("");
                    if (messageDiv) { // Cacher aussi le message global
                        messageDiv.classList.add('d-none');
                        messageDiv.textContent = '';
                    }
                });
            }
        });
    }
}
