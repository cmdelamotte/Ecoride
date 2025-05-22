/**
 * Charge dynamiquement un module JavaScript et tente d'appeler une de ses
 * fonctions d'initialisation conventionnelles.
 * @param {string} pathJS - Le chemin vers le module JavaScript à charger.
 */
export async function loadAndInitializePageScript(pathJS) {
  // Si aucun chemin de script n'est fourni, on ne fait rien.
    if (!pathJS || pathJS.trim() === "") {
    return;
    }

    try {
    // Importe dynamiquement le module JS.
    // 'pageModule' sera un objet contenant toutes les fonctions exportées par le fichier pathJS.
    const pageModule = await import(pathJS);
    
    // On appelle des fonctions d'initialisation par convention de nom.
    if (pageModule.initializeSearchForm && typeof pageModule.initializeSearchForm === 'function') {
        pageModule.initializeSearchForm();
    } else if (pageModule.initializeRegisterForm && typeof pageModule.initializeRegisterForm === 'function') {
        pageModule.initializeRegisterForm();
    } else if (pageModule.initializeLoginForm && typeof pageModule.initializeLoginForm === 'function') {
        pageModule.initializeLoginForm();
    } else if (pageModule.initializeForgotPasswordForm && typeof pageModule.initializeForgotPasswordForm === 'function') {
    pageModule.initializeForgotPasswordForm();
    } else if (pageModule.initializeEditPasswordForm && typeof pageModule.initializeEditPasswordForm === 'function') { 
        pageModule.initializeEditPasswordForm();
    } else if (pageModule.initializeResetPasswordForm && typeof pageModule.initializeResetPasswordForm === 'function') { 
        pageModule.initializeResetPasswordForm();
    }  else if (pageModule.initializeContactForm && typeof pageModule.initializeContactForm === 'function') { 
        pageModule.initializeContactForm();
    } else if (pageModule.initializeFilters && typeof pageModule.initializeFilters === 'function') { 
        pageModule.initializeFilters();
    } else if (pageModule.initializeRidesSearchPage && typeof pageModule.initializeRidesSearchPage === 'function') { 
        pageModule.initializeRidesSearchPage();
    } else if (pageModule.initializeAccountPage && typeof pageModule.initializeAccountPage === 'function') { 
        pageModule.initializeAccountPage();
    } else if (pageModule.initializeEditPersonalInfoForm && typeof pageModule.initializeEditPersonalInfoForm === 'function') {
        pageModule.initializeEditPersonalInfoForm();
    } else if (pageModule.initializePublishRidePage && typeof pageModule.initializePublishRidePage === 'function') {
        pageModule.initializePublishRidePage();
    } else if (pageModule.initializeAdminDashboardPage && typeof pageModule.initializeAdminDashboardPage === 'function') {
        pageModule.initializeAdminDashboardPage();
    } else if (pageModule.initializeYourRidesPage && typeof pageModule.initializeYourRidesPage === 'function') {
        pageModule.initializeYourRidesPage();
    } else if (pageModule.initializeEmployeeDashboardPage && typeof pageModule.initializeEmployeeDashboardPage === 'function') {
        pageModule.initializeEmployeeDashboardPage();
    } 
    } catch (e) {
        console.error(`PageScriptManager: Erreur lors du chargement ou de l'initialisation du module JS ${pathJS}:`, e);
    }
}
