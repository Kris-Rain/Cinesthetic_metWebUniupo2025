const createError = require('http-errors');

function isAdmin(req, res, next) {
    if (req.isAuthenticated() && req.user.type === 0) return next();
    else {
        console.warn(`Tentativo di accesso negato da utente ${req.user ? req.user.username : 'ospite'}`);
        next(new createError(403, "Accesso negato: non hai i permessi per accedere a questa pagina."));
    }
}

function isAuthenticated(req, res, next) {
    if(req.isAuthenticated()) return next();
    console.log("User not authenticated, redirecting to login page.");
    res.redirect('/accedi');
}

module.exports = { isAdmin, isAuthenticated };