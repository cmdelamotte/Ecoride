// assets/js/adminDashboardHandler.js

// La variable currentEmployees est au niveau du module pour être accessible par toutes les fonctions.
let currentEmployees = [
    { id: 'EMP001', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@ecoride.pro', statut: 'Actif' },
    { id: 'EMP002', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@ecoride.pro', statut: 'Suspendu' },
    { id: 'EMP003', nom: 'Petit', prenom: 'Lucas', email: 'lucas.petit@ecoride.pro', statut: 'Actif' },
    { id: 'EMP004', nom: 'Durand', prenom: 'Alice', email: 'alice.durand@ecoride.pro', statut: 'Actif' },
];


function displayEmployeesTable(employeesData) { // Cette fonction reste identique à celle que je t'ai fournie précédemment
    const tableBody = document.getElementById('employees-table-body');
    const template = document.getElementById('employee-row-template'); 
    const noEmployeesMessage = document.getElementById('no-employees-message'); 

    if (!tableBody || !template || !noEmployeesMessage) {
        console.error("Éléments de la table des employés, template, ou message pour table vide introuvables.");
        return;
    }

    tableBody.innerHTML = ''; 

    if (!employeesData || employeesData.length === 0) {
        noEmployeesMessage.classList.remove('d-none'); 
        return;
    }
    
    noEmployeesMessage.classList.add('d-none'); 

    employeesData.forEach(employee => {
        const clone = template.content.cloneNode(true); 
        
        const idCell = clone.querySelector('th[data-label="ID_Employé"]');
        const nomCell = clone.querySelector('td[data-label="Nom"]');
        const prenomCell = clone.querySelector('td[data-label="Prénom"]');
        const emailCell = clone.querySelector('td[data-label="Email"]');
        const statusBadge = clone.querySelector('td[data-label="Statut"] .badge');
        const actionCell = clone.querySelector('td[data-label="Actions"]');
        const suspendButton = actionCell.querySelector('.action-suspend');
        const reactivateButton = actionCell.querySelector('.action-reactivate');

        if (idCell) {
            idCell.textContent = employee.id;
        }
        if (nomCell) nomCell.textContent = employee.nom;
        if (prenomCell) prenomCell.textContent = employee.prenom;
        if (emailCell) emailCell.textContent = employee.email;
        
        if (statusBadge) {
            statusBadge.textContent = employee.statut;
            if (employee.statut === 'Actif') {
                statusBadge.className = 'badge bg-success'; 
            } else if (employee.statut === 'Suspendu') {
                statusBadge.className = 'badge bg-danger';
            } else {
                statusBadge.className = 'badge bg-secondary'; 
            }
        }

        if (suspendButton && reactivateButton) {
            if (employee.statut === 'Actif') {
                suspendButton.classList.remove('d-none');
                reactivateButton.classList.add('d-none');
            } else if (employee.statut === 'Suspendu') {
                suspendButton.classList.add('d-none');
                reactivateButton.classList.remove('d-none');
            }
            // On s'assure que les data-attributes sont bien là pour la délégation d'événements
            suspendButton.setAttribute('data-employee-id', employee.id);
            reactivateButton.setAttribute('data-employee-id', employee.id);
        }
        
        tableBody.appendChild(clone); 
    });
}


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

            if (empPasswordInput && password) { 
                if (!passwordRegex.test(password)) {
                    empPasswordInput.setCustomValidity(passwordRequirementsMessage);
                    isFormValidOverall = false;
                }
            } 

            // 4. Affichage des erreurs ou traitement si valide
            if (!isFormValidOverall) {
                createEmployeeModalForm.reportValidity(); 
                console.log("Validation du formulaire de création d'employé échouée.");
            } else {
                const newEmployee = {
                    id: "EMP" + Date.now().toString().slice(-4), 
                    nom: nom,
                    prenom: prenom,
                    email: email,
                    statut: 'Actif' 
                };
                currentEmployees.push(newEmployee); 
                displayEmployeesTable(currentEmployees); 
                
                console.log("Formulaire de création d'employé valide. Données :", { nom, prenom, email });
                
                alert("Compte employé créé et ajouté à la liste (simulation) !"); 
                createEmployeeModalForm.reset(); 

                const modalElement = document.getElementById('createEmployeeModal');
                if (modalElement) { 
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) {
                        modalInstance.hide();
                    }
                }
            }
        }); 

        // UX: Réinitialiser les messages custom sur input
        [empNomInput, empPrenomInput, empEmailInput, empPasswordInput].forEach(input => {
            if (input) {
                input.addEventListener('input', () => {
                    input.setCustomValidity("");
                });
            }
        });
    }

    // GESTION DU FOCUS POUR LA MODALE (Bloc existant, non modifié)
    const createEmployeeModalElement = document.getElementById('createEmployeeModal');
    let createEmployeeModalTrigger = null; 

    if (createEmployeeModalElement) {
        createEmployeeModalElement.addEventListener('show.bs.modal', function (event) {
            if (event.relatedTarget) {
                createEmployeeModalTrigger = event.relatedTarget;
            }
        });
        createEmployeeModalElement.addEventListener('hidden.bs.modal', function () {
            if (createEmployeeModalTrigger) {
                createEmployeeModalTrigger.focus();
                createEmployeeModalTrigger = null; 
            }
        });
    }

    // Appel pour afficher la liste initiale des employés
    displayEmployeesTable(currentEmployees); 
    
    // === DÉBUT NOUVELLE LOGIQUE ACTIONS ===
    // Gestion des actions "Suspendre" / "Réactiver" sur la table des employés
    const employeesTableBody = document.getElementById('employees-table-body');
    if (employeesTableBody) {
        employeesTableBody.addEventListener('click', function(event) {
            const target = event.target;
            let actionButton = null;
            let actionToPerform = null;

            // Vérifier si le clic vient d'un bouton "Suspendre" ou de son icône
            if (target.classList.contains('action-suspend') || target.closest('.action-suspend')) {
                actionButton = target.classList.contains('action-suspend') ? target : target.closest('.action-suspend');
                actionToPerform = 'suspend';
            } 
            // Sinon, vérifier si le clic vient d'un bouton "Réactiver" ou de son icône
            else if (target.classList.contains('action-reactivate') || target.closest('.action-reactivate')) {
                actionButton = target.classList.contains('action-reactivate') ? target : target.closest('.action-reactivate');
                actionToPerform = 'reactivate';
            }

            if (actionButton && actionToPerform) {
                const employeeId = actionButton.getAttribute('data-employee-id');
                if (!employeeId) {
                    console.error("ID de l'employé non trouvé sur le bouton d'action.");
                    return;
                }

                // Trouver l'employé dans notre liste `currentEmployees`
                const employeeIndex = currentEmployees.findIndex(emp => emp.id === employeeId);
                if (employeeIndex === -1) {
                    console.error(`Employé avec ID ${employeeId} non trouvé dans currentEmployees.`);
                    return;
                }

                // Mettre à jour le statut (simulation)
                if (actionToPerform === 'suspend') {
                    currentEmployees[employeeIndex].statut = 'Suspendu';
                    console.log(`Employé ${employeeId} suspendu (simulation).`);
                    // TODO (Backend): Appel API pour suspendre
                } else if (actionToPerform === 'reactivate') {
                    currentEmployees[employeeIndex].statut = 'Actif';
                    console.log(`Employé ${employeeId} réactivé (simulation).`);
                    // TODO (Backend): Appel API pour réactiver
                }

                // Rafraîchir la table pour refléter le changement
                displayEmployeesTable(currentEmployees);
                alert(`Employé ${employeeId} ${currentEmployees[employeeIndex].statut.toLowerCase()} (simulation) !`);
            }
        });
    }
    // === FIN NOUVELLE LOGIQUE ACTIONS ===
    
    // TODO (Plus tard): Ajouter ici d'autres initialisations pour la page admin-dashboard
    console.log("AdminDashboardHandler: Initialisation de la page admin terminée.");
}