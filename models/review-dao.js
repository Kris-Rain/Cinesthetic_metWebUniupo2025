"use strict";

const db = require("../db.js");
const filmDao = require("./film-dao.js");

exports.getBestReviews = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT f.*, 
                   COALESCE(MAX(r.thumbs_up), 0) AS max_thumbs_up
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
            GROUP BY f.film_id
            HAVING max_thumbs_up > 3
            ORDER BY max_thumbs_up DESC
            LIMIT 15
        `;
        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getMovieReviews = function (movieId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT r.review_id, r.rating, r.title, r.comment, r.thumbs_up, r.thumbs_down, u.username
            FROM Reviews r
            JOIN User u ON r.user_id = u.user_id
            WHERE r.film_id = ?
            ORDER BY r.upload_date DESC
        `;
        db.all(sql, [movieId], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.addReview = function (reviewData) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO Reviews (film_id, user_id, rating, title, comment, thumbs_up, thumbs_down, upload_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.run(
            sql,
            [
                reviewData.film_id,
                reviewData.user_id,
                reviewData.rating,
                reviewData.title,
                reviewData.comment,
                reviewData.thumbs_up || 0,
                reviewData.thumbs_down || 0,
                new Date().toISOString().slice(0, 19).replace("T", " "), // Formato YYYY-MM-DD HH:MM:SS
            ],
            function (err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, ...reviewData });
            }
        );
    });
};

// Funzione per ottenere la recensione di un utente per un film specifico
// Funzionalmente mi serve per evitare che un utente possa inserire più recensioni per lo stesso film
exports.getUserReviewForFilm = function (userId, filmId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT * FROM Reviews
            WHERE user_id = ? AND film_id = ?
            LIMIT 1
        `;
        db.get(sql, [userId, filmId], function (err, row) {
            if (err) reject(err);
            else resolve(row);
        });
    });
};

exports.setThumbsUp = function (reviewId, inc = 1) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE Reviews SET thumbs_up = thumbs_up + ? WHERE review_id = ?`;
        db.run(sql, [inc, reviewId], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

exports.setThumbsDown = function (reviewId, inc = 1) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE Reviews SET thumbs_down = thumbs_down + ? WHERE review_id = ?`;
        db.run(sql, [inc, reviewId], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

// Inserisce o aggiorna il like/dislike
exports.setReviewLike = async function (reviewId, userId, type) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO Review_Like (review_id, user_id, type)
            VALUES (?, ?, ?)
            ON CONFLICT(review_id, user_id) DO UPDATE SET type=excluded.type
        `;
        db.run(sql, [reviewId, userId, type], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

exports.deleteReview = function (reviewId, filmId) {
    return new Promise((resolve, reject) => {
        const sql = "DELETE FROM Reviews WHERE review_id = ?";
        db.run(sql, [reviewId], function (err) {
            if (err) return reject(err);

            // Dopo aver eliminato la recensione, aggiorna la media del film
            filmDao
                .updateFilmAvgRating(filmId)
                .then(() => resolve())
                .catch(reject);
        });
    });
};
