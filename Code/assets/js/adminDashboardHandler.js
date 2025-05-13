// assets/js/adminDashboardHandler.js

// La variable currentEmployees est au niveau du module pour être accessible par toutes les fonctions.
let currentEmployees = [
    { id: 'EMP001', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@ecoride.pro', statut: 'Actif' },
    { id: 'EMP002', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@ecoride.pro', statut: 'Suspendu' },
    { id: 'EMP003', nom: 'Petit', prenom: 'Lucas', email: 'lucas.petit@ecoride.pro', statut: 'Actif' },
    { id: 'EMP004', nom: 'Durand', prenom: 'Alice', email: 'alice.durand@ecoride.pro', statut: 'Actif' },
];

// === DÉBUT NOUVEAU : Données factices pour les Utilisateurs (Clients) ===
let currentUsers = [
    { id: 'USR101', pseudo: 'ClientTest', email: 'client.test@email.com', credits: 15, statut: 'Actif' },
    { id: 'USR102', pseudo: 'PassagerX', email: 'passager.x@email.com', credits: 0, statut: 'Suspendu' },
    { id: 'USR103', pseudo: 'EcoVoyageur', email: 'eco.voyageur@mail.net', credits: 55, statut: 'Actif' },
];
// === FIN NOUVEAU ===


function displayEmployeesTable(employeesData) {
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

        if (idCell) idCell.textContent = employee.id;
        if (nomCell) nomCell.textContent = employee.nom;
        if (prenomCell) prenomCell.textContent = employee.prenom;
        if (emailCell) emailCell.textContent = employee.email;
        
        if (statusBadge) {
            statusBadge.textContent = employee.statut;
            if (employee.statut === 'Actif') statusBadge.className = 'badge bg-success'; 
            else if (employee.statut === 'Suspendu') statusBadge.className = 'badge bg-danger';
            else statusBadge.className = 'badge bg-secondary'; 
        }

        if (suspendButton && reactivateButton) {
            if (employee.statut === 'Actif') {
                suspendButton.classList.remove('d-none');
                reactivateButton.classList.add('d-none');
            } else if (employee.statut === 'Suspendu') {
                suspendButton.classList.add('d-none');
                reactivateButton.classList.remove('d-none');
            }
            suspendButton.setAttribute('data-employee-id', employee.id);
            reactivateButton.setAttribute('data-employee-id', employee.id);
        }
        
        tableBody.appendChild(clone); 
    });
}

// === DÉBUT NOUVEAU : Fonction pour afficher la table des Utilisateurs (Clients) ===
function displayUsersTable(usersData) {
    const tableBody = document.getElementById('users-table-body'); // ID du tbody pour les utilisateurs
    const template = document.getElementById('user-row-template');    // ID du template pour une ligne utilisateur
    const noUsersMessage = document.getElementById('no-users-message'); // ID du message si table vide

    if (!tableBody || !template || !noUsersMessage) {
        console.error("Éléments de la table des utilisateurs, template, ou message pour table vide introuvables.");
        return;
    }

    tableBody.innerHTML = ''; // Vider le contenu actuel

    if (!usersData || usersData.length === 0) {
        noUsersMessage.classList.remove('d-none');
        return;
    }
    
    noUsersMessage.classList.add('d-none');

    usersData.forEach(user => {
        const clone = template.content.cloneNode(true);
        
        // Cibler les éléments à l'intérieur du clone pour les utilisateurs
        const idCell = clone.querySelector('th[data-label="ID_Utilisateur"]');
        const pseudoCell = clone.querySelector('td[data-label="Pseudo"]');
        const emailCell = clone.querySelector('td[data-label="Email"]');
        const creditsCell = clone.querySelector('td[data-label="Crédits"]');
        const statusBadge = clone.querySelector('td[data-label="Statut"] .badge');
        const actionCell = clone.querySelector('td[data-label="Actions"]');
        // Important: utiliser les classes spécifiques pour les boutons utilisateurs
        const suspendButton = actionCell.querySelector('.user-action-suspend'); 
        const reactivateButton = actionCell.querySelector('.user-action-reactivate');

        if (idCell) idCell.textContent = user.id;
        if (pseudoCell) pseudoCell.textContent = user.pseudo;
        if (emailCell) emailCell.textContent = user.email;
        if (creditsCell) creditsCell.textContent = user.credits;
        
        if (statusBadge) {
            statusBadge.textContent = user.statut;
            if (user.statut === 'Actif') statusBadge.className = 'badge bg-success';
            else if (user.statut === 'Suspendu') statusBadge.className = 'badge bg-danger';
            else statusBadge.className = 'badge bg-secondary';
        }

        if (suspendButton && reactivateButton) {
            if (user.statut === 'Actif') {
                suspendButton.classList.remove('d-none');
                reactivateButton.classList.add('d-none');
            } else if (user.statut === 'Suspendu') {
                suspendButton.classList.add('d-none');
                reactivateButton.classList.remove('d-none');
            }
            // Utiliser un data-attribute spécifique, ex: 'data-user-id'
            suspendButton.setAttribute('data-user-id', user.id);
            reactivateButton.setAttribute('data-user-id', user.id);
        }
        
        tableBody.appendChild(clone);
    });
}
// === FIN NOUVEAU ===


export function initializeAdminDashboardPage() { // Nom de la fonction principale pour la page
    const createEmployeeModalForm = document.getElementById('create-employee-form');
    
    const empNomInput = document.getElementById('emp-nom');
    const empPrenomInput = document.getElementById('emp-prenom');
    const empEmailInput = document.getElementById('emp-email');
    const empPasswordInput = document.getElementById('emp-password');
    
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    if (createEmployeeModalForm) {
        createEmployeeModalForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            [empNomInput, empPrenomInput, empEmailInput, empPasswordInput].forEach(input => {
                if (input) input.setCustomValidity("");
            });
            let isFormValidOverall = true;
            if (!createEmployeeModalForm.checkValidity()) isFormValidOverall = false;

            const nom = empNomInput?.value.trim();
            const prenom = empPrenomInput?.value.trim();
            const email = empEmailInput?.value.trim();
            const password = empPasswordInput?.value;

            if (empNomInput && nom.length < 2) { /* ... */ isFormValidOverall = false; }
            if (empPrenomInput && prenom.length < 2) { /* ... */ isFormValidOverall = false; }
            if (empPasswordInput && password) { 
                if (!passwordRegex.test(password)) { /* ... */ isFormValidOverall = false; }
            } 

            if (!isFormValidOverall) {
                createEmployeeModalForm.reportValidity(); 
                console.log("Validation du formulaire de création d'employé échouée.");
            } else {
                const newEmployee = {
                    id: "EMP" + Date.now().toString().slice(-4), nom, prenom, email, statut: 'Actif' 
                };
                currentEmployees.push(newEmployee); 
                displayEmployeesTable(currentEmployees); 
                console.log("Formulaire de création d'employé valide. Données :", { nom, prenom, email });
                alert("Compte employé créé et ajouté à la liste (simulation) !"); 
                createEmployeeModalForm.reset(); 
                const modalElement = document.getElementById('createEmployeeModal');
                if (modalElement) { 
                    const modalInstance = bootstrap.Modal.getInstance(modalElement);
                    if (modalInstance) modalInstance.hide();
                }
            }
        }); 
        [empNomInput, empPrenomInput, empEmailInput, empPasswordInput].forEach(input => {
            if (input) input.addEventListener('input', () => input.setCustomValidity(""));
        });
    }

    const createEmployeeModalElement = document.getElementById('createEmployeeModal');
    let createEmployeeModalTrigger = null; 
    if (createEmployeeModalElement) {
        createEmployeeModalElement.addEventListener('show.bs.modal', function (event) {
            if (event.relatedTarget) createEmployeeModalTrigger = event.relatedTarget;
        });
        createEmployeeModalElement.addEventListener('hidden.bs.modal', function () {
            if (createEmployeeModalTrigger) {
                createEmployeeModalTrigger.focus();
                createEmployeeModalTrigger = null; 
            }
        });
    }

    displayEmployeesTable(currentEmployees); 
    
    const employeesTableBody = document.getElementById('employees-table-body');
    if (employeesTableBody) {
        employeesTableBody.addEventListener('click', function(event) {
            const target = event.target;
            let actionButton = null;
            let actionToPerform = null;

            if (target.classList.contains('action-suspend') || target.closest('.action-suspend')) {
                actionButton = target.classList.contains('action-suspend') ? target : target.closest('.action-suspend');
                actionToPerform = 'suspend';
            } 
            else if (target.classList.contains('action-reactivate') || target.closest('.action-reactivate')) {
                actionButton = target.classList.contains('action-reactivate') ? target : target.closest('.action-reactivate');
                actionToPerform = 'reactivate';
            }

            if (actionButton && actionToPerform) {
                const employeeId = actionButton.getAttribute('data-employee-id');
                if (!employeeId) return;
                const employeeIndex = currentEmployees.findIndex(emp => emp.id === employeeId);
                if (employeeIndex === -1) return;

                if (actionToPerform === 'suspend') currentEmployees[employeeIndex].statut = 'Suspendu';
                else if (actionToPerform === 'reactivate') currentEmployees[employeeIndex].statut = 'Actif';
                
                displayEmployeesTable(currentEmployees);
                alert(`Employé ${employeeId} ${currentEmployees[employeeIndex].statut.toLowerCase()} (simulation) !`);
            }
        });
    }
    
    // === DÉBUT NOUVEAU : Logique pour la table des Utilisateurs (Clients) ===
    displayUsersTable(currentUsers); // Affichage initial de la table des utilisateurs

    const usersTableBody = document.getElementById('users-table-body');
    if (usersTableBody) {
        usersTableBody.addEventListener('click', function(event) {
            const target = event.target;
            let actionButton = null;
            let actionToPerform = null;

            // Utiliser les classes spécifiques pour les boutons utilisateurs
            if (target.classList.contains('user-action-suspend') || target.closest('.user-action-suspend')) {
                actionButton = target.classList.contains('user-action-suspend') ? target : target.closest('.user-action-suspend');
                actionToPerform = 'suspend';
            } 
            else if (target.classList.contains('user-action-reactivate') || target.closest('.user-action-reactivate')) {
                actionButton = target.classList.contains('user-action-reactivate') ? target : target.closest('.user-action-reactivate');
                actionToPerform = 'reactivate';
            }

            if (actionButton && actionToPerform) {
                const userId = actionButton.getAttribute('data-user-id'); // Utiliser 'data-user-id'
                if (!userId) {
                    console.error("ID de l'utilisateur non trouvé sur le bouton d'action.");
                    return;
                }

                const userIndex = currentUsers.findIndex(user => user.id === userId);
                if (userIndex === -1) {
                    console.error(`Utilisateur avec ID ${userId} non trouvé dans currentUsers.`);
                    return;
                }

                if (actionToPerform === 'suspend') {
                    currentUsers[userIndex].statut = 'Suspendu';
                    console.log(`Utilisateur ${userId} suspendu (simulation).`);
                } else if (actionToPerform === 'reactivate') {
                    currentUsers[userIndex].statut = 'Actif';
                    console.log(`Utilisateur ${userId} réactivé (simulation).`);
                }

                displayUsersTable(currentUsers); // Rafraîchir la table des utilisateurs
                alert(`Utilisateur ${userId} ${currentUsers[userIndex].statut.toLowerCase()} (simulation) !`);
            }
        });
    }
    // === FIN NOUVEAU ===
    
    console.log("AdminDashboardHandler: Initialisation de la page admin terminée.");
}