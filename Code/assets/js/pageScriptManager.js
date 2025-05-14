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
    
    // On essaie d'appeler des fonctions d'initialisation par convention de nom.
    if (pageModule.initializeSearchForm && typeof pageModule.initializeSearchForm === 'function') {
        pageModule.initializeSearchForm();
        console.log(`PageScriptManager: initializeSearchForm() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeRegisterForm && typeof pageModule.initializeRegisterForm === 'function') {
        pageModule.initializeRegisterForm();
        console.log(`PageScriptManager: initializeRegisterForm() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeLoginForm && typeof pageModule.initializeLoginForm === 'function') {
        pageModule.initializeLoginForm();
        console.log(`PageScriptManager: initializeLoginForm() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeForgotPasswordForm && typeof pageModule.initializeForgotPasswordForm === 'function') {
    pageModule.initializeForgotPasswordForm();
    console.log(`PageScriptManager: initializeForgotPasswordForm() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeEditPasswordForm && typeof pageModule.initializeEditPasswordForm === 'function') { 
        pageModule.initializeEditPasswordForm();
        console.log(`PageScriptManager: initializeEditPasswordForm() appelée depuis ${pathJS}`);
    }  else if (pageModule.initializeContactForm && typeof pageModule.initializeContactForm === 'function') { 
        pageModule.initializeContactForm();
        console.log(`PageScriptManager: initializeContactForm() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeFilters && typeof pageModule.initializeFilters === 'function') { 
        pageModule.initializeFilters();
        console.log(`PageScriptManager: initializeFilters() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeRidesSearchPage && typeof pageModule.initializeRidesSearchPage === 'function') { 
        pageModule.initializeRidesSearchPage();
        console.log(`PageScriptManager: initializeRidesSearchPage() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeAccountPage && typeof pageModule.initializeAccountPage === 'function') { 
        pageModule.initializeAccountPage();
        console.log(`PageScriptManager: initializeAccountPage() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeEditPersonalInfoForm && typeof pageModule.initializeEditPersonalInfoForm === 'function') {
        pageModule.initializeEditPersonalInfoForm();
        console.log(`PageScriptManager: initializeEditPersonalInfoForm() appelée depuis ${pathJS}`);
    } else if (pageModule.initializePublishRidePage && typeof pageModule.initializePublishRidePage === 'function') { // Nom de la fonction mis à jour
    pageModule.initializePublishRidePage();
    console.log(`PageScriptManager: initializePublishRidePage() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeAdminDashboardPage && typeof pageModule.initializeAdminDashboardPage === 'function') {
    pageModule.initializeAdminDashboardPage();
    console.log(`PageScriptManager: initializeAdminDashboardPage() appelée depuis ${pathJS}`);
    } else if (pageModule.initializeYourRidesPage && typeof pageModule.initializeYourRidesPage === 'function') {
        pageModule.initializeYourRidesPage();
        console.log(`PageScriptManager: initializeYourRidesPage() appelée depuis ${pathJS}`);
    } 
    } catch (e) {
        console.error(`PageScriptManager: Erreur lors du chargement ou de l'initialisation du module JS ${pathJS}:`, e);
    }
}
