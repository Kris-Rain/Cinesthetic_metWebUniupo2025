'use strict';

var express = require('express');
var router = express.Router();
const filmDao = require('../models/film-dao');
const { check, validationResult } = require('express-validator');

const validationChecks = [
    check('film_title')
        .notEmpty().withMessage('Titolo film richiesto')
        .isLength({ min: 2, max: 100 }).withMessage('Il titolo deve essere tra 2 e 100 caratteri'),
    check('original_film_title')
        .isLength({ min: 0, max: 100 }).withMessage('Il titolo originale deve essere tra 2 e 100 caratteri'),
    check('poster')
        .notEmpty().withMessage('Poster richiesto')
        .matches(/^[a-z0-9\-]+$/i).withMessage('Il nome del poster deve contenere solo lettere, numeri e trattini'),
    check('release_date')
        .notEmpty().withMessage('Anno di rilascio richiesto')
        .isInt({ min: 1888, max: new Date().getFullYear() + 1 }).withMessage('Anno non valido'),
    check('duration')
        .notEmpty().withMessage('Durata richiesta')
        .isInt({ min: 1, max: 600 }).withMessage('Durata non valida'),
    check('director')
        .notEmpty().withMessage('Regista richiesto')
        .isLength({ min: 2, max: 100 }).withMessage('Il nome del regista deve essere tra 2 e 100 caratteri'),
    check('genre')
        .notEmpty().withMessage('Genere richiesto')
        .custom((value) => {
            if (Array.isArray(value) && value.length > 0) return true;
            if (typeof value === 'string' && value.length > 0) return true;
            throw new Error('Seleziona almeno un genere');
    }),
    check('screenwriter')
        .notEmpty().withMessage('Sceneggiatore/i richiesto/i')
        .matches(/^([a-zA-ZÀ-ÿ' ]+,?\s*)+$/).withMessage('Inserisci uno o più nomi separati da virgola'),
    check('trailer')
        .notEmpty().withMessage('ID trailer richiesto')
        .matches(/^[a-zA-Z0-9_-]{11}$/).withMessage('L\'ID del trailer deve essere di 11 caratteri e valido (es: 5YnGhW4UEhc)'),
    check('plot')
        .notEmpty().withMessage('Trama richiesta')
        .isLength({ min: 10, max: 1000 }).withMessage('La trama deve essere tra 10 e 1000 caratteri'),
];

router.get("/", async function (req, res, next) {
    try {
        const allGenres = await filmDao.getAllGenres();
        const allFilms = await filmDao.getAllMovies();
        const showCarousel = req.query.carousel === "1";

        res.render("admin-panel", {
            title: "Inserisci film", 
            success: null,
            message: null, 
            isLogged: req.isAuthenticated(), 
            user: req.user || null,
            editMode: false,
            allGenres,
            allFilms,
            showCarousel
        });
    } catch (error) {
        console.error("Error fetching movies for homepage:", error);
        next(error);
    }
});

router.post('/', validationChecks, async function (req, res, next) {
    const errors = validationResult(req);
    const genres = req.body.genre;
    if (!Array.isArray(genres)) {
        genres = [genres]; // anche se è solo uno, lo trasformo in array
    }

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => error.msg);
        try {
            const allGenres = await filmDao.getAllGenres();

            res.render('admin-panel', { 
                title: 'Inserisci film',
                isLogged: req.isAuthenticated(),
                success: null,
                message: errorMessages.join(", "),
                user: req.user || null,
                editMode: false,
                allGenres,
                film_title: req.body.film_title,
                original_film_title: req.body.original_film_title,
                poster: req.body.poster,
                release_date: req.body.release_date,
                duration: req.body.duration,
                director: req.body.director,
                screenwriter: req.body.screenwriter,
                plot: req.body.plot,
                trailer: req.body.trailer
            });
        } catch (err) {
            next(err);
        }
    } else {
        try {
            const screenwritersRaw = req.body.screenwriter;
            const screenwriters = Array.isArray(screenwritersRaw) ? screenwritersRaw : screenwritersRaw
                    .split(",")
                    .map((s) => s.trim())
                    .filter((s) => s.length > 0);
            
            const film = {
                film_title: req.body.film_title,
                original_film_title: req.body.original_film_title || null,
                poster: req.body.poster,
                release_date: req.body.release_date,
                duration: req.body.duration,
                director: req.body.director,
                genre: genres,
                screenwriter: screenwriters,
                plot: req.body.plot,
                trailer: req.body.trailer
            }
            filmDao.addMovie(film).then((id) => { 
                res.redirect('/homepage?insertSuccess=1&id=' + id); 
            });
            
        } catch (error) {
            try {
                const allGenres = await filmDao.getAllGenres();

                res.render('admin-panel', { 
                    title: 'Inserisci film',
                    isLogged: req.isAuthenticated(),
                    success: null,
                    message: `Errore durante l'aggiunta del film: ${error.message}`,
                    user: req.user || null,
                    editMode: false,
                    allGenres,
                    film_title: req.body.film_title,
                    original_film_title: req.body.original_film_title,
                    poster: req.body.poster,
                    year: req.body.year,
                    duration: req.body.duration,
                    director: req.body.director,
                    screenwriter: req.body.screenwriter,
                    plot: req.body.plot,
                    trailer: req.body.trailer
            });
            } catch (err) {
                next(err);
            }
        }
    }
});

module.exports = router;