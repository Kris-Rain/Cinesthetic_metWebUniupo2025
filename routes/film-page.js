"use strict";

const express = require("express");
const router = express.Router();
const filmDao = require("../models/film-dao");
const userDao = require("../models/user-dao");
const reviewDao = require("../models/review-dao");
const { isAdmin, isAuthenticated } = require("../public/js/middlewares");
const { check, validationResult } = require("express-validator");

const validationChecks = [
    check("film_title")
        .notEmpty()
        .withMessage("Titolo film richiesto")
        .isLength({ min: 2, max: 100 })
        .withMessage("Il titolo deve essere tra 2 e 100 caratteri"),
    check("original_film_title")
        .isLength({ min: 0, max: 100 })
        .withMessage("Il titolo originale deve essere tra 2 e 100 caratteri"),
    check("poster")
        .notEmpty()
        .withMessage("Poster richiesto")
        .matches(/^[a-z0-9\-]+$/i)
        .withMessage(
            "Il nome del poster deve contenere solo lettere, numeri e trattini"
        ),
    check("release_date")
        .notEmpty()
        .withMessage("Anno di rilascio richiesto")
        .isInt({ min: 1888, max: new Date().getFullYear() + 1 })
        .withMessage("Anno non valido"),
    check("duration")
        .notEmpty()
        .withMessage("Durata richiesta")
        .isInt({ min: 1, max: 600 })
        .withMessage("Durata non valida"),
    check("director")
        .notEmpty()
        .withMessage("Regista richiesto")
        .isLength({ min: 2, max: 100 })
        .withMessage("Il nome del regista deve essere tra 2 e 100 caratteri"),
    check("genre")
        .notEmpty()
        .withMessage("Genere richiesto")
        .custom((value) => {
            if (Array.isArray(value) && value.length > 0) return true;
            if (typeof value === "string" && value.length > 0) return true;
            throw new Error("Seleziona almeno un genere");
        }),
    check("screenwriter")
        .notEmpty()
        .withMessage("Sceneggiatore/i richiesto/i")
        .matches(/^([a-zA-ZÀ-ÿ' ]+,?\s*)+$/)
        .withMessage("Inserisci uno o più nomi separati da virgola"),
    check("trailer")
        .notEmpty()
        .withMessage("ID trailer richiesto")
        .matches(/^[a-zA-Z0-9_-]{11}$/)
        .withMessage(
            "L'ID del trailer deve essere di 11 caratteri e valido (es: 5YnGhW4UEhc)"
        ),
    check("plot")
        .notEmpty()
        .withMessage("Trama richiesta")
        .isLength({ min: 10, max: 1000 })
        .withMessage("La trama deve essere tra 10 e 1000 caratteri"),
];

router.get("/:id", async function (req, res, next) {
    try {
        const filmId = req.params.id;
        const filmById = await filmDao.getMovieById(filmId);
        const genresByFilmId = await filmDao.getAllGenresById(filmId);
        const screenWritersByFilmId = await filmDao.getScreenwritersById(
            filmId
        );
        const allGenres = await filmDao.getAllGenres();
        const reviews = await reviewDao.getMovieReviews(filmId);

        const isAdmin = req.isAuthenticated() && req.user.type === 0;

        let success = null;
        if (req.query.updateSuccess === "1")
            success = `Film aggiornato con successo!`;

        console.log(filmId);

        res.render("film", {
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            success,
            message: req.query.message || null,
            filmById,
            genresByFilmId,
            screenWritersByFilmId,
            allGenres,
            isAdmin,
            reviews,
        });
    } catch (err) {
        console.log(err);
        next(err);
    }
});

router.post("/:id/delete", isAdmin, async (req, res, next) => {
    try {
        await filmDao.deleteMovie(req.params.id);
        res.redirect("/homepage?deleteSuccess=1&id=" + req.params.id);
    } catch (err) {
        next(err);
    }
});

router.post('/:filmId/review/:reviewId/delete', isAdmin, async (req, res) => {
    const { filmId, reviewId } = req.params;
    try {
        await reviewDao.deleteReview(reviewId, filmId);
        res.redirect(`/film/${filmId}?deleteReviewSuccess=1&id=${reviewId}`);
    } catch (err) {
        next(err);
    }
});

router.get("/:id/edit", isAdmin, async (req, res, next) => {
    try {
        const filmId = req.params.id;
        const filmById = await filmDao.getMovieById(filmId);
        const allGenres = await filmDao.getAllGenres();
        const screenWritersByFilmId = await filmDao.getScreenwritersById(
            filmId
        );
        let trailerId = filmById.trailer;
        const match = trailerId.match(/embed\/([a-zA-Z0-9_-]{11})/);
        if (match) {
            trailerId = match[1];
        }

        // Prepara i valori per il form
        res.render("admin-panel", {
            title: "Modifica film",
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            success: null,
            message: null,
            allGenres,
            film_title: filmById.film_title,
            original_film_title: filmById.original_film_title,
            poster: filmById.poster,
            release_date: filmById.release_date,
            duration: filmById.duration,
            director: filmById.director,
            screenwriter: screenWritersByFilmId.map((s) => s.screenwriter_name),
            plot: filmById.plot,
            trailer: trailerId,
            editMode: true,
            film_id: filmById.film_id,
        });
    } catch (error) {
        next(error);
    }
});

router.post("/:id/edit", isAdmin, validationChecks, async (req, res, next) => {
    const errors = validationResult(req);
    const genres = req.body.genre;
    if (!Array.isArray(genres)) {
        genres = [genres]; // anche se è solo uno, lo trasformo in array
    }

    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map((error) => error.msg);
        try {
            const allGenres = await filmDao.getAllGenres();

            res.render("insert-film", {
                title: "Modifica film",
                isLogged: req.isAuthenticated(),
                user: req.user || null,
                success: null,
                message: errorMessages.join(", "),
                allGenres,
                film_title: req.body.film_title,
                original_film_title: req.body.original_film_title,
                poster: req.body.poster,
                release_date: req.body.release_date,
                duration: req.body.duration,
                director: req.body.director,
                screenwriter: req.body.screenwriter,
                plot: req.body.plot,
                trailer: req.body.trailer,
                editMode: true,
                film_id: req.params.id,
            });
        } catch (err) {
            next(err);
        }
    } else {
        try {
            const filmId = req.params.id;

            // Prepara i dati dal form
            const screenwritersRaw = req.body.screenwriter;
            const screenwriters = Array.isArray(screenwritersRaw)
                ? screenwritersRaw
                : screenwritersRaw
                      .split(",")
                      .map((s) => s.trim())
                      .filter((s) => s.length > 0);

            const updatedFilm = {
                film_title: req.body.film_title,
                original_film_title: req.body.original_film_title || null,
                poster: req.body.poster,
                release_date: req.body.release_date,
                duration: req.body.duration,
                director: req.body.director,
                genre: genres,
                screenwriter: screenwriters,
                plot: req.body.plot,
                trailer: req.body.trailer,
            };

            await filmDao.updateMovie(filmId, updatedFilm);

            res.redirect("/film/" + filmId + "?updateSuccess=1");
        } catch (error) {
            try {
                // In caso di errore, ricarica la pagina di modifica con i dati inseriti e il messaggio di errore
                const allGenres = await filmDao.getAllGenres();
                res.render("insert-film", {
                    title: "Modifica film",
                    isLogged: req.isAuthenticated(),
                    user: req.user || null,
                    allGenres,
                    film_title: req.body.film_title,
                    original_film_title: req.body.original_film_title,
                    poster: req.body.poster,
                    release_date: req.body.release_date,
                    duration: req.body.duration,
                    director: req.body.director,
                    genre: genres,
                    screenwriter: req.body.screenwriter,
                    plot: req.body.plot,
                    trailer: req.body.trailer,
                    editMode: true,
                    film_id: filmId,
                    message: `Errore durante la modifica del film: ${error.message}`,
                });
            } catch (err) {
                next(err);
            }
        }
    }
});

router.post("/:id/review", isAuthenticated,
    [
        check("rating")
            .notEmpty()
            .withMessage("Il voto è obbligatorio")
            .isInt({ min: 1, max: 10 })
            .withMessage("Il voto deve essere un numero intero tra 1 e 10"),
        check("title")
            .notEmpty()
            .withMessage("Il titolo è obbligatorio")
            .isLength({ min: 2, max: 100 })
            .withMessage("Il titolo deve essere tra 2 e 100 caratteri"),
        check("comment")
            .notEmpty()
            .withMessage("Il commento è obbligatorio")
            .isLength({ min: 5, max: 1000 })
            .withMessage("Il commento deve essere tra 5 e 1000 caratteri"),
    ],
    async (req, res, next) => {
        const errors = validationResult(req);
        const filmId = req.params.id;

        if (!errors.isEmpty()) {
            const errorMessages = errors.array().map((error) => error.msg);

            try {
                const filmById = await filmDao.getMovieById(filmId);
                const genresByFilmId = await filmDao.getAllGenresById(filmId);
                const screenWritersByFilmId =
                    await filmDao.getScreenwritersById(filmId);
                const allGenres = await filmDao.getAllGenres();
                const reviews = await reviewDao.getMovieReviews(filmId);
                const isAdmin = req.isAuthenticated() && req.user.type === 0;

                return res.render("film", {
                    isLogged: req.isAuthenticated(),
                    user: req.user || null,
                    message: errorMessages.join(", "),
                    success: null,
                    filmById,
                    genresByFilmId,
                    screenWritersByFilmId,
                    allGenres,
                    isAdmin,
                    reviews,
                });
            } catch (err) {
                return next(err);
            }
        }

        try {
            const userId = req.user.id;
            const { rating, title, comment } = req.body;

            // Previeni la creazione di recensioni duplicate
            const existing = await reviewDao.getUserReviewForFilm(userId, filmId);

            if (existing) {
                // Recupera i dati necessari per la view
                const filmById = await filmDao.getMovieById(filmId);
                const genresByFilmId = await filmDao.getAllGenresById(filmId);
                const screenWritersByFilmId =
                    await filmDao.getScreenwritersById(filmId);
                const allGenres = await filmDao.getAllGenres();
                const reviews = await reviewDao.getMovieReviews(filmId);
                const isAdmin = req.isAuthenticated() && req.user.type === 0;

                return res.render("film", {
                    isLogged: req.isAuthenticated(),
                    user: req.user || null,
                    message: "Hai già inserito una recensione per questo film.",
                    success: null,
                    filmById,
                    genresByFilmId,
                    screenWritersByFilmId,
                    allGenres,
                    isAdmin,
                    reviews,
                });
            }

            await reviewDao.addReview({
                film_id: filmId,
                user_id: userId,
                rating,
                title,
                comment,
                thumbs_up: 0,
                thumbs_down: 0,
            });

            await filmDao.updateFilmAvgRating(filmId);

            res.redirect(`/film/${filmId}`);
        } catch (error) {
            next(error);
        }
    }
);

router.post("/:filmId/review/:reviewId/thumbs-up", isAuthenticated, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const reviewId = req.params.reviewId;
            const existing = await userDao.getUserLikeForReview(
                reviewId,
                userId
            );

            if (!existing || existing.type !== "like") {
                // Se non ha mai votato o aveva messo dislike, aggiorna
                await reviewDao.setReviewLike(reviewId, userId, "like");
                // Aggiorna i contatori nella tabella Reviews
                if (!existing) {
                    await reviewDao.setThumbsUp(reviewId);
                } else if (existing.type === "dislike") {
                    await reviewDao.setThumbsUp(reviewId);
                    await reviewDao.setThumbsDown(reviewId, -1); // serve una funzione per decrementare
                }
            }
            res.redirect(`/film/${req.params.filmId}`);
        } catch (error) {
            next(error);
        }
    }
);

router.post("/:filmId/review/:reviewId/thumbs-down", isAuthenticated, async (req, res, next) => {
        try {
            const userId = req.user.id;
            const reviewId = req.params.reviewId;
            const existing = await userDao.getUserLikeForReview(
                reviewId,
                userId
            );

            if (!existing || existing.type !== "dislike") {
                await reviewDao.setReviewLike(reviewId, userId, "dislike");
                if (!existing) {
                    await reviewDao.setThumbsDown(reviewId);
                } else if (existing.type === "like") {
                    await reviewDao.setThumbsDown(reviewId);
                    await reviewDao.setThumbsUp(reviewId, -1); // serve una funzione per decrementare
                }
            }
            res.redirect(`/film/${req.params.filmId}`);
        } catch (error) {
            next(error);
        }
    }
);

module.exports = router;