'use strict';

const express = require('express');
const router = express.Router();
const filmDao = require('../models/film-dao');
const userDao = require('../models/user-dao');

router.get('/', async (req, res, next) => {
    if (!req.isAuthenticated()) return res.redirect('/accedi');
    try {
        const userId = req.user.id;
        const reviews = await userDao.getUserReviews(userId);
        const allGenres = await filmDao.getAllGenres();
        res.render('profile', {
            user: req.user,
            isLogged: req.isAuthenticated(),
            reviews,
            allGenres
        });
    } catch (err) {
        next(err);
    }
});

module.exports = router;