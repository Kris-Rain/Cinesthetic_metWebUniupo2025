"use strict";

var express = require("express");
var router = express.Router();
const userDao = require("../models/user-dao");
const filmDao = require("../models/film-dao.js");
const { check, validationResult } = require("express-validator");

router.get("/", async function (req, res, next) {
    try {
        const allGenres = await filmDao.getAllGenres();
        res.render("registrati", {
            title: "Registrazione",
            isLogged: req.isAuthenticated(),
            success: null,
            message: null,
            date: null,
            allGenres,
        });
    } catch (err) {
        next(err);
    }
});

router.post("/",
    [
        check(
            ["username", "email", "password", "confirmPassword"],
            "Parametri mancanti o dal formato errato."
        ).isString(),
        check(
            "username",
            "L'username deve essere lungo dai 4 ai 20 caratteri e può contenere solo lettere, numeri o underscore"
        )
            .trim()
            .isLength({ max: 20, min: 4 })
            .matches(/[a-zA-Z0-9_]+/),
        check(
            "password",
            "La password deve essere lunga dai 8 ai 16 caratteri e deve contenere almeno un numero, una lettera maiuscola, una lettera minuscola e un carattere speciale."
        )
            .isLength({ max: 16, min: 8 })
            .isStrongPassword(),
        check("email", "Inserire un indirizzo mail valido").trim().isEmail(),
        check("confirmPassword").custom((value, { req }) => {
            return value === req.body.password
                ? Promise.resolve("Ok.")
                : Promise.reject(
                      "La password originale e quella di conferma devono essere identiche."
                  );
        }),
    ],
    async function (req, res, next) {
        const errors = validationResult(req);

        console.log("Errori di validazione:", errors.array());

        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map((error) => error.msg);
            try {
                const allGenres = await filmDao.getAllGenres();

                res.render("registrati", {
                    title: "Registrazione",
                    isLogged: false,
                    success: null,
                    message: errorMessages.join(", "),
                    allGenres,
                    username: req.body.username,
                    email: req.body.email,
                    password: "",
                    confirmPassword: "",
                });
            } catch (err) {
                next(err);
            }
        } else {
            try {
                await userDao.registerUser(
                    req.body.username,
                    req.body.email,
                    req.body.password,
                    1
                );

                console.log("Registrazione avvenuta con successo");

                res.redirect("/homepage?success=1");
            } catch (error) {
                const errorMessages = [];

                console.error("Errore durante la registrazione:", error);

                if (error && error.message) errorMessages.push(error.message);
                else errorMessages.push("Errore sconosciuto durante la registrazione.");
                try {
                    const allGenres = await filmDao.getAllGenres();
                    res.render("registrati", {
                        title: "Registrazione",
                        isLogged: false,
                        success: null,
                        message: errorMessages.join(", "),
                        allGenres,
                        username: req.body.username,
                        email: req.body.email,
                        password: "",
                        confirmPassword: "",
                    });
                } catch (err) {
                    next(err);
                }
            }
        }
    }
);

module.exports = router;
