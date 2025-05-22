export function initializeContactForm() {
    const contactForm = document.getElementById('contact-form');
    if (!contactForm) return;
    
    const nameInput = document.getElementById('contact-name');
    const emailInput = document.getElementById('contact-email');
    const subjectInput = document.getElementById('contact-subject');
    const messageTextarea = document.getElementById('contact-message');
    const messageDiv = document.getElementById('message-contact');

    // Listeners pour reset la validité custom
    [nameInput, emailInput, subjectInput, messageTextarea].forEach(input => {
        if (input) {
            input.addEventListener('input', () => {
                input.setCustomValidity("");
                if (messageDiv && messageDiv.classList.contains('alert-danger')) { // Ne cache que si c'est une erreur
                    messageDiv.classList.add('d-none');
                    messageDiv.textContent = '';
                }
            });
        }
    });

    contactForm.addEventListener('submit', async function(event) {
        event.preventDefault(); 

        [nameInput, emailInput, subjectInput, messageTextarea].forEach(input => {
            if (input) input.setCustomValidity("");
        });
        if (messageDiv) {
            messageDiv.classList.add('d-none');
            messageDiv.classList.remove('alert-success', 'alert-danger', 'alert-info');
            messageDiv.textContent = '';
        }

        let isFormValidOverall = true;
        if (!contactForm.checkValidity()) {
            isFormValidOverall = false;
        }

        const name = nameInput?.value.trim();
        const email = emailInput?.value.trim();
        const subject = subjectInput?.value.trim();
        const messageValue = messageTextarea?.value.trim();

        if (messageTextarea && messageValue && messageValue.length < 10) {
            messageTextarea.setCustomValidity("Votre message doit contenir au moins 10 caractères.");
            isFormValidOverall = false;
        }
        
        if (!isFormValidOverall) {
            contactForm.reportValidity();
            if (messageDiv && !messageDiv.textContent) {
                messageDiv.textContent = "Veuillez corriger les erreurs indiquées.";
                messageDiv.classList.remove('d-none');
                messageDiv.classList.add('alert-danger');
            }
            return;
        }
        
        const formData = { name, email, subject, message: messageValue };
        console.log("Formulaire de contact valide. Envoi à l'API :", formData);
        
        if (messageDiv) {
            messageDiv.textContent = "Envoi de votre message en cours...";
            messageDiv.classList.remove('d-none', 'alert-danger', 'alert-success');
            messageDiv.classList.add('alert-info');
        }
        const submitButton = contactForm.querySelector('button[type="submit"]');
        if(submitButton) submitButton.disabled = true;

        try {
            const response = await fetch('/api/submit_contact_form.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });
            const result = await response.json();

            if (messageDiv) {
                messageDiv.textContent = result.message;
                messageDiv.classList.remove('d-none', 'alert-info'); // Enlève le 'alert-info'
                messageDiv.classList.toggle('alert-success', result.success);
                messageDiv.classList.toggle('alert-danger', !result.success);
            }

            if (result.success) {
                contactForm.reset(); 
            }
        } catch (error) {
            console.error("Erreur Fetch (submit_contact_form):", error);
            if (messageDiv) {
                messageDiv.textContent = "Erreur de communication avec le serveur. Veuillez réessayer.";
                messageDiv.classList.remove('d-none', 'alert-info', 'alert-success');
                messageDiv.classList.add('alert-danger');
            }
        } finally {
            if(submitButton) submitButton.disabled = false;
        }
    });
}