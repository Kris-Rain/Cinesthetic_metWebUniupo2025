const express = require('express');
const router = express.Router();
const filmDao = require('../models/film-dao');
const reviewDao = require('../models/review-dao');

// Rotta GET per la ricerca film avanzata
router.get('/', async (req, res, next) => {
    try {
        const filter = req.query.filter;
        const genre = req.query.genre || null;
        const minRating = req.query.minRating ? parseFloat(req.query.minRating) : null;
        const maxDuration = req.query.maxDuration ? parseInt(req.query.maxDuration) : null;
        const allGenres = await filmDao.getAllGenres();

        let results = [];

        // Se ci sono filtri avanzati, usali insieme al filtro principale
        const hasAdvancedFilters = genre || minRating !== null || maxDuration !== null;

        if (filter === 'best' && !hasAdvancedFilters) {
            results = await reviewDao.getBestReviews();
        } else if (filter === 'top' && !hasAdvancedFilters) {
            results = await filmDao.getTopRatedMovies();
        } else {
            // Filtro avanzato personalizzato, eventualmente combinato con filter
            results = await filmDao.filterMovies({
                filter, // puoi usare questo parametro per influenzare la query nel DAO
                genre,
                minRating,
                maxDuration
            });
        }

        res.render('filter', {
            title: filter === 'best' ? 'Migliori recensioni' :
                   filter === 'top' ? 'Più votati' : 'Risultati filtrati',
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            filter,
            results,
            allGenres
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;