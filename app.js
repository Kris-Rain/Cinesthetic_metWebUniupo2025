"use strict";
const express = require("express");
const createError = require('http-errors');
const passport = require("passport");
const session = require("express-session");
const path = require("path");
const LocalStrategy = require("passport-local").Strategy;
const logger = require("morgan");
const cookieParser = require("cookie-parser");
const { isAdmin, isAuthenticated } = require('./public/js/middlewares');

const userDao = require("./models/user-dao");
const homepageRouter = require("./routes/homepage");
const filmPageRouter = require("./routes/film-page");
const loginRouter = require("./routes/accedi");
const registerRouter = require("./routes/registrati");
const insertFilmRouter = require("./routes/admin-panel");
const searchRouter = require("./routes/search");
const filterRouter = require("./routes/filter");

// Create Express app
const app = express();

// Set up view engine
app.set("views", path.join(__dirname, "views", "pages"));
app.set("view engine", "ejs");

// Middleware
app.use(logger("dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

// Passport local strategy
passport.use('user', new LocalStrategy(
    {
        usernameField: 'username',
        passwordField: 'password',
    },
    function(username, password, done) {
        userDao.loginUser(username, password).then(({user, pass}) => {
            console.log(`Login attempt for user: ${username}`);
            if(!user) {
                console.log(`User ${username} not found.`);
                done(null, false, {message: 'Username non trovato.'});
            }
            else if(!pass) {
                console.log(`Password mismatch for user: ${username}`);
                done(null, false, {message: 'Password errata.'});
            }
            else {
                console.log(`User ${username} authenticated successfully.`);
                done(null, user);
            }
        }).catch(err => done(err));
    }
));

passport.serializeUser(function (user, done) {
    done(null, user.id);
});
passport.deserializeUser(function(id, done) {
    userDao.getUserInfoById(id).then(user => {
        done(null, user);
    }).catch(err => done(err));
});

app.use(session({
    secret: 'The secret sentence of this session. Must not share with anyone.',
    saveUninitialized: false,
    resave: false,
    cookie: {
        sameSite: 'lax',
        httpOnly: true,
        secure: false,
        maxAge: 3600000 // 1 hour
    }
}));
app.use(passport.initialize());
app.use(passport.session());

// Routers
app.use('/homepage', homepageRouter);
app.use('/', homepageRouter);
app.use('/film', filmPageRouter);
app.use('/accedi', loginRouter);
app.use('/registrati', registerRouter);
app.use('/admin-panel', isAdmin, insertFilmRouter);
app.use('/search', searchRouter);
app.use('/filter', filterRouter);

// 404 handler
app.use(function (req, res, next) {
    console.log('404 su:', req.originalUrl);
    const err = createError(404, "Pagina non trovata");
    next(err);
});
app.use(async function (err, req, res, next) {
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
    res.locals.title = err.status === 404 ? '404 - Pagina non trovata' : 'Errore';
    res.locals.isLogged = req.isAuthenticated ? req.isAuthenticated() : false;
    res.locals.user = req.user || null;
    try {
        res.locals.allGenres = await filmDao.getAllGenres();
    } catch (e) {
        res.locals.allGenres = [];
    }
    res.status(err.status || 500);
    
    console.error(`Error status: ${err.status || 500}`);
    console.error(`Error occurred: ${err.message}`);
    console.error(err.stack);

    res.render('error', {
        title: res.locals.title,
        message: res.locals.message,
        error: res.locals.error,
        isLogged: res.locals.isLogged,
        user: res.locals.user,
        allGenres: res.locals.allGenres
    });

    return;
});

module.exports = app;