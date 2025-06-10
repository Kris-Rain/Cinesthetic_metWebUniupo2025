const express = require("express");
const router = express.Router();
const filmDao = require("../models/film-dao.js");
const reviewDao = require("../models/review-dao.js");
const { query } = require("express-validator");

// Homepage route
router.get("/", renderHomepage);
router.get("/homepage", renderHomepage);

async function renderHomepage(req, res, next) {
    try {
        // Get latest movies and top-rated movies for homepage
        const latestMovies = await filmDao.getLatestMovies();
        const topRatedMovies = await filmDao.getTopRatedMovies();
        const allMovies = await filmDao.getAllMovies();
        const allGenres = await filmDao.getAllGenres();
        const bestReviews = await reviewDao.getBestReviews();
        const trendingMovies = await filmDao.getTrendingMovies();
        const recommemdedMovies = await filmDao.getRecommendedMovies();

        let success = null;
        if (req.query.success === '1') success = 'Registrazione avvenuta con successo!';
        if (req.query.logout === '1') success = 'Logout effettuato con successo!';
        if (req.query.loginSuccess === '1') success = 'Login effettuato con successo!';
        if (req.query.insertSuccess === '1') success = `Film con id: ${req.query.id} inserito con successo!`;
        if (req.query.deleteSuccess === '1') success = `Film con id: ${req.query.id} eliminato con successo!`;
        if (req.query.deleteReviewSuccess === '1') success = `Recensione con id: ${req.query.id} eliminata con successo!`;

        console.log(req.user);
        // Render homepage.ejs with movies and reviews
        res.render('homepage', {
            title: "Homepage",
            isLogged: req.isAuthenticated(),
            user: req.user || null,
            message: req.query.message || null,
            allMovies,
            latestMovies,
            trendingMovies,
            recommemdedMovies,
            bestReviews,
            topRatedMovies,
            allGenres,
            success,
        });
    } catch (err) {
        console.error("Error fetching movies for homepage:", err);
        next(err);
    }
}

module.exports = router;