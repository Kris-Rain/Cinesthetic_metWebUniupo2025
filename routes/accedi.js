'use strict';

const express = require("express");
const router = express.Router();
const passport = require("passport");
const filmDao = require("../models/film-dao.js"); // <-- aggiungi questa riga
const { check, validationResult } = require("express-validator");

// Pagina di accesso
router.get("/", async function (req, res, next) {
    try {
        const allGenres = await filmDao.getAllGenres();
        
        res.render("accedi", {
            title: "Accedi",
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            success: null,
            message: null,
            allGenres,
        });
    } catch (err) {
        next(err);
    }
});

router.post("/", check(["username", "password"]).notEmpty(), async function (req, res, next) {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map((error) => error.msg);

            console.log("Errori di validazione:", errorMessages);

            try {
                const allGenres = await filmDao.getAllGenres();
                return res.render("accedi", {
                    title: "Accedi",
                    isLogged: req.isAuthenticated(),
                    user: req.user || null,
                    success: null,
                    message: errorMessages.join(", "),
                    username: req.body.username || "",
                    password: req.body.password || "",
                    allGenres,
                });
            } catch (err) {
                next(err);
            }
        }
        passport.authenticate("user", async function (err, user, info) {
            if (err) {
                console.error("Errore autenticazione:", err);
                return next(err);
            }
            if (!user) {
                try {
                    const allGenres = await filmDao.getAllGenres();
                    
                    console.log("Utente non trovato o credenziali non valide");

                    return res.render("accedi", {
                        title: "Accedi",
                        isLogged: req.isAuthenticated(),
                        user: req.user || null,
                        success: null,
                        message:
                            info && info.message
                                ? info.message
                                : "Credenziali non valide",
                        username: req.body.username || "",
                        password: "",
                        allGenres, // <-- aggiungi qui
                    });
                } catch (err) {
                    next(err);
                }
            }
            req.login(user, function (err) {
                if (err) return next(err);
                req.session.save(() => {

                    console.log("Login avvenuto con successo");

                    return res.redirect("/homepage?loginSuccess=1");
                });
            });
        })(req, res, next);
    }
);

router.post("/logout", function (req, res, next) {
    req.logout(function (err) {
        if (err) {
            return next(err);
        }
        
        console.log("Logout avvenuto con successo");
        
        res.redirect("/homepage?logout=1");
    });
});

// Middleware per gestire gli errori
router.use(async function (err, req, res, next) {
    console.error("Errore nel middleware:", err);
    const message =
        req.app.get("env") === "development"
            ? err.message
            : "Si è verificato un errore. Riprova.";
    try {
        const allGenres = await filmDao.getAllGenres();
        res.render("accedi", {
            title: "Accedi",
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            success: null,
            message,
            username: req.body ? req.body.username : "",
            password: "",
            allGenres, // <-- aggiungi qui
        });
    } catch (e) {
        next(e);
    }
});

module.exports = router;