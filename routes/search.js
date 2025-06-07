'use strict';

const express = require('express');
const router = express.Router();
const filmDao = require('../models/film-dao');

// Rotta GET per la ricerca film avanzata
router.get('/', async (req, res, next) => {
    try {
        const query = req.query.q ? req.query.q.trim() : '';
        const allGenres = await filmDao.getAllGenres();

        let results = [];
        if (query.length > 0) {
            console.log(`Ricerca per: ${query}`);
            results = await filmDao.searchMovies(query);
        }

        console.log(`Trovati ${results.length} risultati per la ricerca: ${query} e query.length: ${query.length}`);

        res.render('search', {
            title: 'Risultati ricerca',
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            searched: query.length > 0,
            query,
            results,
            allGenres
        });
        return;
    } catch (err) {
        next(err);
    }
});

module.exports = router;