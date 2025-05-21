// Références aux instances des graphiques pour pouvoir les détruire et les recréer si besoin
let ridesChartInstance = null;
let creditsChartInstance = null;

// --- Fonctions d'Affichage 
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
            statusBadge.textContent = employee.statut; // Doit être "Active" ou "Suspended"
        if (employee.statut && employee.statut.toLowerCase() === 'active') {
            statusBadge.className = 'badge bg-success';
        } else if (employee.statut && employee.statut.toLowerCase() === 'suspended') {
            statusBadge.className = 'badge bg-danger';
        } else {
            statusBadge.className = 'badge bg-secondary'; // Cas par défaut
        }
        }
        if (suspendButton && reactivateButton) {
            const isActive = employee.statut && employee.statut.toLowerCase() === 'active';
            console.log(`Employé ${employee.id}, Statut: '${employee.statut}', isActive: ${isActive}`); // Log pour débogage
            suspendButton.classList.toggle('d-none', !isActive);
            reactivateButton.classList.toggle('d-none', isActive);
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
            statusBadge.textContent = user.statut; // Doit être "Active" ou "Suspended"
            if (user.statut && user.statut.toLowerCase() === 'active') {
                statusBadge.className = 'badge bg-success';
            } else if (user.statut && user.statut.toLowerCase() === 'suspended') {
                statusBadge.className = 'badge bg-danger';
            } else {
                statusBadge.className = 'badge bg-secondary';
            }
        }
        if (suspendButton && reactivateButton) {
            const isActive = user.statut && user.statut.toLowerCase() === 'active';
            console.log(`Utilisateur ${user.id}, Statut: '${user.statut}', isActive: ${isActive}`); // Log pour débogage
            suspendButton.classList.toggle('d-none', !isActive);
            reactivateButton.classList.toggle('d-none', isActive);
            suspendButton.setAttribute('data-user-id', user.id);
            reactivateButton.setAttribute('data-user-id', user.id);
        }
        tableBody.appendChild(clone);
    });
}

async function fetchAndDisplayAdminData() {
    // Récupérer et afficher les statistiques
    // TODO: regrouper tous les fetch ici pour avoir un seul point d'entrée

    // Récupérer et afficher les employés
    try {
        const empResponse = await fetch('http://ecoride.local/api/admin_get_employees.php');
        const empData = await empResponse.json();
        if (empData.success) {
            displayEmployeesTable(empData.employees || []);
        } else {
            console.error("Erreur API admin_get_employees:", empData.message);
            document.getElementById('no-employees-message').classList.remove('d-none');
        }
    } catch (error) {
        console.error("Erreur Fetch globale (admin_get_employees):", error);
        document.getElementById('no-employees-message').textContent = "Erreur chargement employés.";
        document.getElementById('no-employees-message').classList.remove('d-none');
    }

    // Récupérer et afficher les utilisateurs
    try {
        const userResponse = await fetch('http://ecoride.local/api/admin_get_users.php');
        const userData = await userResponse.json();
        if (userData.success) {
            displayUsersTable(userData.users || []);
        } else {
            console.error("Erreur API admin_get_users:", userData.message);
            document.getElementById('no-users-message').classList.remove('d-none');
        }
    } catch (error) {
        console.error("Erreur Fetch globale (admin_get_users):", error);
        document.getElementById('no-users-message').textContent = "Erreur chargement utilisateurs.";
        document.getElementById('no-users-message').classList.remove('d-none');
    }
}

// --- Fonctions pour les STATISTIQUES et GRAPHIQUES ---

function updateTotalCreditsDisplay(totalCredits) {
    const totalCreditsElement = document.getElementById('admin-total-credits');
    if (totalCreditsElement) {
        totalCreditsElement.textContent = (totalCredits !== null ? parseFloat(totalCredits).toFixed(2) : 'N/A') + ' crédits';
    } else {
        console.warn("Élément #admin-total-credits introuvable.");
    }
}

function createOrUpdateRidesPerDayChart(ridesData) {
    const canvasElement = document.getElementById('ridesPerDayChart');
    if (!canvasElement) {
        console.error("Canvas #ridesPerDayChart introuvable !");
        return;
    }
    const ctx = canvasElement.getContext('2d');

    // Préparer les données pour Chart.js
    const labels = ridesData.map(item => new Date(item.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })); // Format '15 Mai'
    const dataValues = ridesData.map(item => item.count);

    if (ridesChartInstance) {
        ridesChartInstance.destroy(); // Détruire l'ancienne instance avant d'en créer une nouvelle
    }

    ridesChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Nombre de Covoiturages Terminés',
                data: dataValues,
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
                borderColor: 'rgba(54, 162, 235, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: 'Nb. Covoiturages' }, ticks: { stepSize: 1 } },
                x: { title: { display: true, text: 'Jour' } }
            },
            plugins: {
                legend: { display: false },
                title: { display: true, text: 'Covoiturages Terminés par Jour (30 derniers jours)' }
            }
        }
    });
}

function createOrUpdateCreditsGainedPerDayChart(revenueData) {
    const canvasElement = document.getElementById('creditsGainedPerDayChart');
    if (!canvasElement) {
        console.error("Canvas #creditsGainedPerDayChart introuvable !");
        return;
    }
    const ctx = canvasElement.getContext('2d');

    const labels = revenueData.map(item => new Date(item.date + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
    const dataValues = revenueData.map(item => parseFloat(item.totalRevenue).toFixed(2));

    if (creditsChartInstance) {
        creditsChartInstance.destroy();
    }

    creditsChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Crédits Gagnés par la Plateforme',
                data: dataValues,
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
                title: { display: true, text: 'Gain de Crédits Journalier (30 derniers jours)' }
            }
        }
    });
}

async function fetchAdminStats() {
    console.log("AdminDashboardHandler: Appel de fetchAdminStats pour récupérer les données du tableau de bord.");
    try {
        const response = await fetch('http://ecoride.local/api/get_admin_stats.php');
        if (!response.ok) {
            // Si le statut est 403 (Forbidden), cela peut signifier que l'utilisateur n'est pas admin
            if (response.status === 403) {
                console.warn("Accès non autorisé aux statistiques admin. Redirection envisagée si nécessaire.");
                // Tu pourrais vouloir rediriger l'utilisateur ou afficher un message spécifique
                // Pour l'instant, on logue juste.
                document.getElementById('admin-total-credits').textContent = "Accès refusé";
                // On pourrait vider les graphiques ou afficher un message d'erreur
                return; 
            }
            const errorText = await response.text().catch(() => "Impossible de lire le corps de l'erreur.");
            throw new Error(`Erreur API (statut ${response.status}) lors de la récupération des stats admin: ${errorText.substring(0, 200)}`);
        }
        const data = await response.json();
        console.log("AdminDashboardHandler: Données de statistiques reçues:", data);

        if (data.success) {
            updateTotalCreditsDisplay(data.totalPlatformRevenueOverall);
            createOrUpdateRidesPerDayChart(data.ridesPerDay || []);
            createOrUpdateCreditsGainedPerDayChart(data.revenuePerDay || []);
        } else {
            console.error("Erreur lors de la récupération des statistiques admin:", data.message);
            updateTotalCreditsDisplay(null); // Afficher N/A ou un message d'erreur
            // Potentiellement afficher un message d'erreur pour les graphiques aussi
        }
    } catch (error) {
        console.error("Erreur Fetch globale (get_admin_stats):", error);
        updateTotalCreditsDisplay(null); // Afficher N/A ou un message d'erreur
        // Afficher des messages d'erreur pour les graphiques
        const ridesChartCanvas = document.getElementById('ridesPerDayChart');
        const creditsChartCanvas = document.getElementById('creditsGainedPerDayChart');
        if (ridesChartCanvas?.parentElement) ridesChartCanvas.parentElement.innerHTML = '<p class="text-danger text-center m-auto">Erreur chargement données graphiques.</p>';
        if (creditsChartCanvas?.parentElement) creditsChartCanvas.parentElement.innerHTML = '<p class="text-danger text-center m-auto">Erreur chargement données graphiques.</p>';
    }
}


// --- Initialisation de la Page ---
export function initializeAdminDashboardPage() {
    console.log("AdminDashboardHandler: Initialisation de la page admin.");

    fetchAdminStats(); // Pour les graphiques et le total des crédits

    fetchAndDisplayAdminData(); // Pour les listes d'employés et d'utilisateurs

    // Logique pour la création d'employés
    const createEmployeeModalForm = document.getElementById('create-employee-form');
    const empNomInput = document.getElementById('emp-nom');
    const empPrenomInput = document.getElementById('emp-prenom');
    const empEmailInput = document.getElementById('emp-email');
    const empPasswordInput = document.getElementById('emp-password');
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{8,}$/;
    const passwordRequirementsMessage = "Le mot de passe doit contenir au moins 8 caractères, incluant majuscule, minuscule, chiffre et caractère spécial.";

    if (createEmployeeModalForm) {
        createEmployeeModalForm.addEventListener('submit', async function(event) { // Assure-toi que c'est async
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

            if (empNomInput && nom.length < 2) { empNomInput.setCustomValidity("Nom requis (2 caractères min)."); isFormValidOverall = false; }
            if (empPrenomInput && prenom.length < 2) { empPrenomInput.setCustomValidity("Prénom requis (2 caractères min)."); isFormValidOverall = false; }
            if (empPasswordInput && password && !passwordRegex.test(password)) { 
                empPasswordInput.setCustomValidity(passwordRequirementsMessage); isFormValidOverall = false; 
            } else if (empPasswordInput && !password && empPasswordInput.hasAttribute('required')) {
                empPasswordInput.setCustomValidity("Mot de passe initial requis."); isFormValidOverall = false;
            }
            if (!isFormValidOverall) {
                createEmployeeModalForm.reportValidity();
                return;
            }

            const employeeData = {
                first_name: prenom,
                last_name: nom,
                username: `${prenom.toLowerCase()}.${nom.toLowerCase()}`.replace(/\s+/g, ''),
                email: email,
                password: password,
            };

            try {
                const response = await fetch('http://ecoride.local/api/admin_create_employee.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(employeeData)
                });
                const result = await response.json();
                if (result.success) {
                    alert(result.message || "Employé créé avec succès !");
                    fetchAndDisplayAdminData(); 
                    createEmployeeModalForm.reset();
                    bootstrap.Modal.getInstance(document.getElementById('createEmployeeModal'))?.hide();
                } else {
                    alert(result.message || "Erreur lors de la création de l'employé.");
                }
            } catch (error) {
                console.error("Erreur création employé:", error);
                alert("Erreur de communication pour créer l'employé.");
            }
        });
         [empNomInput, empPrenomInput, empEmailInput, empPasswordInput].forEach(input => { // Listeners pour reset custom validity
            if (input) {
                input.addEventListener('input', () => input.setCustomValidity(""));
            }
        });
    }

    // Logique pour suspendre/réactiver employés
    const employeesTableBody = document.getElementById('employees-table-body');
    if (employeesTableBody) {
        employeesTableBody.addEventListener('click', async function(event) { // async ici aussi
            const target = event.target.closest('button[data-employee-id]');
            if (!target) return;
            
            const employeeIdRaw = target.getAttribute('data-employee-id');
            const userId = parseInt(employeeIdRaw.replace('EMP', ''), 10); // L'API attend l'ID numérique
            let newStatus = '';

            if (target.classList.contains('action-suspend')) {
                newStatus = 'suspended';
            } else if (target.classList.contains('action-reactivate')) {
                newStatus = 'active';
            } else {
                return;
            }

            if (!userId || !newStatus) return;

            try {
                const response = await fetch('http://ecoride.local/api/admin_update_user_status.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, new_status: newStatus })
                });
                const result = await response.json();
                if (result.success) {
                    alert(result.message || `Statut de l'employé ${employeeIdRaw} mis à jour !`);
                    fetchAndDisplayAdminData();
                } else {
                    alert(result.message || "Erreur lors de la mise à jour du statut.");
                }
            } catch (error) {
                console.error("Erreur MàJ statut employé:", error);
                alert("Erreur de communication pour mettre à jour le statut.");
            }
        });
    }
    
    // Logique pour suspendre/réactiver utilisateurs (clients)
    const usersTableBody = document.getElementById('users-table-body');
    if (usersTableBody) {
        usersTableBody.addEventListener('click', async function(event) { // async ici
            const target = event.target.closest('button[data-user-id]');
            if (!target) return;

            const userIdRaw = target.getAttribute('data-user-id');
            const userId = parseInt(userIdRaw.replace('USR', ''), 10); // L'API attend l'ID numérique
            let newStatus = '';

            if (target.classList.contains('user-action-suspend')) {
                newStatus = 'suspended';
            } else if (target.classList.contains('user-action-reactivate')) {
                newStatus = 'active';
            } else {
                return;
            }
            
            if (!userId || !newStatus) return;

            try {
                const response = await fetch('http://ecoride.local/api/admin_update_user_status.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, new_status: newStatus })
                });
                const result = await response.json();
                if (result.success) {
                    alert(result.message || `Statut de l'utilisateur ${userIdRaw} mis à jour !`);
                    fetchAndDisplayAdminData(); // Recharger les listes
                } else {
                    alert(result.message || "Erreur lors de la mise à jour du statut de l'utilisateur.");
                }
            } catch (error) {
                console.error("Erreur MàJ statut utilisateur:", error);
                alert("Erreur de communication pour mettre à jour le statut de l'utilisateur.");
            }
        });
    }
    console.log("AdminDashboardHandler: Initialisation de la page admin terminée.");
}