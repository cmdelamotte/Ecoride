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
    } else if (pageModule.initializeRegisterForm && typeof pageModule.initializeRegisterForm === 'function') { // AJOUT
        pageModule.initializeRegisterForm();
        console.log(`PageScriptManager: initializeRegisterForm() appelée depuis ${pathJS}`);
    }
    } catch (e) {
        console.error(`PageScriptManager: Erreur lors du chargement ou de l'initialisation du module JS ${pathJS}:`, e);
    }
}
