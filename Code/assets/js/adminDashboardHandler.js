// La variable currentEmployees est au niveau du module pour être accessible par toutes les fonctions.
let currentEmployees = [
    { id: 'EMP001', nom: 'Dupont', prenom: 'Jean', email: 'jean.dupont@ecoride.pro', statut: 'Actif' },
    { id: 'EMP002', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@ecoride.pro', statut: 'Suspendu' },
    { id: 'EMP003', nom: 'Petit', prenom: 'Lucas', email: 'lucas.petit@ecoride.pro', statut: 'Actif' },
    { id: 'EMP004', nom: 'Durand', prenom: 'Alice', email: 'alice.durand@ecoride.pro', statut: 'Actif' },
];

// Données factices pour les Utilisateurs (Clients)
let currentUsers = [
    { id: 'USR101', pseudo: 'ClientTest', email: 'client.test@email.com', credits: 15, statut: 'Actif' },
    { id: 'USR102', pseudo: 'PassagerX', email: 'passager.x@email.com', credits: 0, statut: 'Suspendu' },
    { id: 'USR103', pseudo: 'EcoVoyageur', email: 'eco.voyageur@mail.net', credits: 55, statut: 'Actif' },
];


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

function displayUsersTable(usersData) {
    const tableBody = document.getElementById('users-table-body'); 
    const template = document.getElementById('user-row-template');    
    const noUsersMessage = document.getElementById('no-users-message'); 

    if (!tableBody || !template || !noUsersMessage) {
        console.error("Éléments de la table des utilisateurs, template, ou message pour table vide introuvables.");
        return;
    }

    tableBody.innerHTML = ''; 

    if (!usersData || usersData.length === 0) {
        noUsersMessage.classList.remove('d-none');
        return;
    }
    
    noUsersMessage.classList.add('d-none');

    usersData.forEach(user => {
        const clone = template.content.cloneNode(true);
        
        const idCell = clone.querySelector('th[data-label="ID_Utilisateur"]');
        const pseudoCell = clone.querySelector('td[data-label="Pseudo"]');
        const emailCell = clone.querySelector('td[data-label="Email"]');
        const creditsCell = clone.querySelector('td[data-label="Crédits"]');
        const statusBadge = clone.querySelector('td[data-label="Statut"] .badge');
        const actionCell = clone.querySelector('td[data-label="Actions"]');
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
            suspendButton.setAttribute('data-user-id', user.id);
            reactivateButton.setAttribute('data-user-id', user.id);
        }
        
        tableBody.appendChild(clone);
    });
}

// === DÉBUT AJOUT GRAPHIQUES ET STATS ===
// Fonction pour mettre à jour le total des crédits
function updateTotalCreditsDisplay(totalCredits) {
    const totalCreditsElement = document.getElementById('admin-total-credits');
    if (totalCreditsElement) {
        // Formate le nombre avec des séparateurs de milliers pour la lisibilité et ajoute "crédits"
        totalCreditsElement.textContent = totalCredits.toLocaleString('fr-FR') + ' crédits'; 
    } else {
        console.warn("Élément #admin-total-credits introuvable.");
    }
}

// Fonction pour créer le graphique "Covoiturages / Jour"
function createRidesPerDayChart() {
    const canvasElement = document.getElementById('ridesPerDayChart');
    if (!canvasElement) {
        console.error("Canvas #ridesPerDayChart introuvable !");
        return;
    }
    const ctx = canvasElement.getContext('2d');

    // Données factices pour "Covoiturages / Jour"
    const rideLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const rideDataValues = [12, 19, 3, 5, 22, 30, 15]; 

    new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: rideLabels,
            datasets: [{
                label: 'Nombre de Covoiturages',
                data: rideDataValues,
                backgroundColor: 'rgba(54, 162, 235, 0.6)', 
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Nb. Covoiturages' } },
                x: { title: { display: true, text: 'Jour' } }
            },
            plugins: {
                legend: { display: false }, // Cachée car un seul dataset
                title: { display: true, text: 'Covoiturages de la Semaine' }
            }
        }
    });
}

// Fonction pour créer le graphique "Crédits Gagnés / Jour"
function createCreditsGainedPerDayChart() {
    const canvasElement = document.getElementById('creditsGainedPerDayChart');
    if (!canvasElement) {
        console.error("Canvas #creditsGainedPerDayChart introuvable !");
        return;
    }
    const ctx = canvasElement.getContext('2d');

    const creditLabels = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
    const creditDataValues = [50, 75, 20, 40, 110, 150, 90];

    new Chart(ctx, {
        type: 'line', 
        data: {
            labels: creditLabels,
            datasets: [{
                label: 'Crédits Gagnés',
                data: creditDataValues,
                backgroundColor: 'rgba(75, 192, 192, 0.5)', 
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 2,
                fill: true,
                tension: 0.1 
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Crédits Gagnés' } },
                x: { title: { display: true, text: 'Jour' } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Gain de Crédits Journalier' }
            }
        }
    });
}
// === FIN AJOUT GRAPHIQUES ET STATS ===


export function initializeAdminDashboardPage() { 
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

            if (empNomInput && nom.length < 2) { empNomInput.setCustomValidity("Le nom de l'employé doit contenir au moins 2 caractères."); isFormValidOverall = false; }
            if (empPrenomInput && prenom.length < 2) { empPrenomInput.setCustomValidity("Le prénom de l'employé doit contenir au moins 2 caractères."); isFormValidOverall = false; }
            if (empPasswordInput && password) { 
                if (!passwordRegex.test(password)) { empPasswordInput.setCustomValidity(passwordRequirementsMessage); isFormValidOverall = false; }
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
    
    displayUsersTable(currentUsers); 

    const usersTableBody = document.getElementById('users-table-body');
    if (usersTableBody) {
        usersTableBody.addEventListener('click', function(event) {
            const target = event.target;
            let actionButton = null;
            let actionToPerform = null;

            if (target.classList.contains('user-action-suspend') || target.closest('.user-action-suspend')) {
                actionButton = target.classList.contains('user-action-suspend') ? target : target.closest('.user-action-suspend');
                actionToPerform = 'suspend';
            } 
            else if (target.classList.contains('user-action-reactivate') || target.closest('.user-action-reactivate')) {
                actionButton = target.classList.contains('user-action-reactivate') ? target : target.closest('.user-action-reactivate');
                actionToPerform = 'reactivate';
            }

            if (actionButton && actionToPerform) {
                const userId = actionButton.getAttribute('data-user-id'); 
                if (!userId) return;
                const userIndex = currentUsers.findIndex(user => user.id === userId);
                if (userIndex === -1) return;

                if (actionToPerform === 'suspend') currentUsers[userIndex].statut = 'Suspendu';
                else if (actionToPerform === 'reactivate') currentUsers[userIndex].statut = 'Actif';

                displayUsersTable(currentUsers); 
                alert(`Utilisateur ${userId} ${currentUsers[userIndex].statut.toLowerCase()} (simulation) !`);
            }
        });
    }
    
    // === DÉBUT AJOUT GRAPHIQUES ET STATS (Appels aux nouvelles fonctions) ===
    // Donnée factice pour le total des crédits
    const mockTotalCredits = 12345; 
    updateTotalCreditsDisplay(mockTotalCredits);

    // Création des graphiques (s'assurer que Chart.js est bien chargé via le CDN dans index.html)
    if (typeof Chart !== 'undefined') { // Vérification simple que Chart.js est disponible
        createRidesPerDayChart();
        createCreditsGainedPerDayChart();
    } else {
        console.error("Chart.js n'est pas chargé. Vérifiez l'inclusion du CDN dans index.html.");
        const ridesChartCanvas = document.getElementById('ridesPerDayChart');
        const creditsChartCanvas = document.getElementById('creditsGainedPerDayChart');
        if (ridesChartCanvas?.parentElement) ridesChartCanvas.parentElement.innerHTML = '<p class="text-danger text-center m-auto">Erreur: Chart.js non chargé.</p>';
        if (creditsChartCanvas?.parentElement) creditsChartCanvas.parentElement.innerHTML = '<p class="text-danger text-center m-auto">Erreur: Chart.js non chargé.</p>';
    }
    // === FIN AJOUT GRAPHIQUES ET STATS ===
    
    console.log("AdminDashboardHandler: Initialisation de la page admin terminée.");
}