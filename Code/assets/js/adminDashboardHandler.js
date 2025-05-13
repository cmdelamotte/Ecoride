export function initializeAdminDashboardPage() { // Nom de la fonction principale pour la page
    const createEmployeeModalForm = document.getElementById('create-employee-form');
    
    // Sélection des champs du formulaire DANS LA MODALE
    const empNomInput = document.getElementById('emp-nom');
    const empPrenomInput = document.getElementById('emp-prenom');
    const empEmailInput = document.getElementById('emp-email');
    const empPasswordInput = document.getElementById('emp-password');
    

    // Regex pour la validation du mot de passe
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    if (createEmployeeModalForm) {
        createEmployeeModalForm.addEventListener('submit', function(event) {
            event.preventDefault(); 

            // Réinitialisation des messages custom précédents
            [empNomInput, empPrenomInput, empEmailInput, empPasswordInput].forEach(input => {
                if (input) input.setCustomValidity("");
            });

            let isFormValidOverall = true;

            // 1. Validation HTML5 native
            if (!createEmployeeModalForm.checkValidity()) {
                isFormValidOverall = false;
            }

            // 2. Récupération des valeurs
            const nom = empNomInput?.value.trim();
            const prenom = empPrenomInput?.value.trim();
            const email = empEmailInput?.value.trim();
            const password = empPasswordInput?.value;

            // 3. Validations JS personnalisées
            if (empNomInput && nom.length < 2) {
                empNomInput.setCustomValidity("Le nom de l'employé doit contenir au moins 2 caractères.");
                isFormValidOverall = false;
            }
            if (empPrenomInput && prenom.length < 2) {
                empPrenomInput.setCustomValidity("Le prénom de l'employé doit contenir au moins 2 caractères.");
                isFormValidOverall = false;
            }
            // L'email est déjà validé par type="email" et required via checkValidity()

            // Validation du mot de passe initial
            if (empPasswordInput && password) { // Valide seulement si le champ est rempli (required est déjà géré)
                if (!passwordRegex.test(password)) {
                    empPasswordInput.setCustomValidity(passwordRequirementsMessage);
                    isFormValidOverall = false;
                }
            } // Si vide et 'required', checkValidity() s'en charge

            // 4. Affichage des erreurs ou traitement si valide
            if (!isFormValidOverall) {
                createEmployeeModalForm.reportValidity(); // Affiche les tooltips DANS la modale
                console.log("Validation du formulaire de création d'employé échouée.");
                // Afficher un message dans modalErrorMessageDiv si besoin
            } else {
                console.log("Formulaire de création d'employé valide. Données :", { nom, prenom, email, password });
                
                // TODO: Appel fetch vers l'API backend pour créer le compte employé.
                // fetch('/api/admin/employees', { method: 'POST', body: JSON.stringify({ nom, prenom, email, password }), ...})

                alert("Compte employé créé avec succès (simulation) !");
                createEmployeeModalForm.reset(); // Vider le formulaire

                // Fermer la modale Bootstrap
                const modalElement = document.getElementById('createEmployeeModal');
                const modalInstance = bootstrap.Modal.getInstance(modalElement);
                if (modalInstance) {
                    modalInstance.hide();
                }
            }
        }); // Fin du listener 'submit'

        // UX: Réinitialiser les messages custom sur input
        [empNomInput, empPrenomInput, empEmailInput, empPasswordInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    input.setCustomValidity("");
                });
            }
        });
    }

    // TODO (Plus tard): Ajouter ici d'autres initialisations pour la page admin-dashboard
    // Par exemple, charger les statistiques, les listes d'utilisateurs/employés, etc.

} 