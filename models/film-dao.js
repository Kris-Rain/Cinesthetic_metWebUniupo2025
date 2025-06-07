"use strict";

// DAO (Data Access Object) module for accessing movies
const db = require("../db.js");

function getDateTime() {
    const now = new Date();
    const yyyy = now.getFullYear();
    // aggiungo 1 al mese perché in JavaScript i mesi partono da 0
    // e uso padStart per garantire che il mese e il giorno siano sempre a 2 cifre
    // anche con le cifre minori di 10
    // (es. 01, 02, ..., 12)
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    const hh = String(now.getHours()).padStart(2, "0");
    const min = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

exports.getAllGenres = function () {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM Genre ORDER BY genre_name";

        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getAllMovies = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT f.*, 
            COALESCE(AVG(r.rating), 0) as rating
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
            GROUP BY f.film_id
            ORDER BY f.film_title
        `;
        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getMovieById = function (id) {
    return new Promise((resolve, reject) => {
        const sql = "SELECT * FROM Film WHERE film_id = ?";

        db.get(sql, [id], function (err, row) {
            if (err) reject(err);
            else if (!row) resolve(null);
            else
                resolve({
                    film_id: row.film_id,
                    poster: row.poster,
                    film_title: row.film_title,
                    original_film_title: row.original_film_title,
                    release_date: row.release_date,
                    plot: row.plot,
                    duration: row.duration,
                    trailer: row.trailer,
                    director: row.director,
                    avg_user_rating: row.avg_user_rating,
                    added_date: row.added_date,
                });
        });
    });
};

exports.getLatestMovies = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT f.*, 
            COALESCE(AVG(r.rating), 0) as rating
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
            GROUP BY f.film_id
            ORDER BY f.added_date DESC
            LIMIT 15
        `;
        db.all(sql, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getTopRatedMovies = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT f.*, 
                   AVG(r.rating) as rating,
                   COUNT(r.rating) as review_count
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
            GROUP BY f.film_id
            HAVING review_count > 0
            ORDER BY rating DESC
            LIMIT 10
        `;
        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getBestReviews = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT r.*, 
                f.film_title, 
                u.username
            FROM Reviews r
            JOIN Film f ON r.film_id = f.film_id
            JOIN User u ON r.user_id = u.email
            ORDER BY r.rating DESC
            LIMIT 10
        `;
        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getTrendingMovies = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT f.*, 
            COALESCE(AVG(r.rating), 0) as avg_user_rating, 
            COUNT(r.review_id) as review_count
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
            WHERE r.upload_date >= DATE('now', '-30 days')
            GROUP BY f.film_id
            ORDER BY review_count DESC, avg_user_rating DESC
            LIMIT 10
        `;
        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getRecommendedMovies = function () {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT f.*, 
            COALESCE(AVG(r.rating), 0) as avg_user_rating, 
            COUNT(r.review_id) as review_count
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
            GROUP BY f.film_id
            HAVING avg_user_rating >= 8 AND review_count >= 5
            ORDER BY avg_user_rating DESC
            LIMIT 10
        `;
        db.all(sql, [], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.filterMovies = function ({ genre, minRating, maxDuration }) {
    return new Promise((resolve, reject) => {
        let sql = `
            SELECT f.*, COALESCE(AVG(r.rating), 0) as rating
            FROM Film f
            LEFT JOIN Reviews r ON f.film_id = r.film_id
        `;
        let params = [];
        let where = [];
        let having = [];

        // Filtro per genere
        if (genre) {
            sql += `
                JOIN Film_Genre fg ON f.film_id = fg.film_id
                JOIN Genre g ON fg.genre_id = g.genre_id
            `;
            where.push("g.genre_name = ?");
            params.push(genre);
        }

        // Filtro per durata massima
        if (maxDuration !== null) {
            where.push("f.duration <= ?");
            params.push(maxDuration);
        }

        if (where.length > 0) {
            sql += " WHERE " + where.join(" AND ");
        }

        sql += " GROUP BY f.film_id";

        // Filtro per rating minimo (HAVING perché è aggregato)
        if (minRating !== null) {
            having.push("rating >= ?");
            params.push(minRating);
        }

        if (having.length > 0) {
            sql += " HAVING " + having.join(" AND ");
        }

        sql += " ORDER BY rating DESC";

        console.log("SQL Query:", sql);

        db.all(sql, params, function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.addMovie = async function (movieData) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO Film (poster, film_title, original_film_title, release_date, plot, duration, trailer, director, added_date)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const trailer_url = `https://www.youtube.com/embed/${movieData.trailer}?autoplay=1&mute=1`;

        db.run(
            sql,
            [
                movieData.poster,
                movieData.film_title,
                movieData.original_film_title,
                movieData.release_date,
                movieData.plot,
                movieData.duration,
                trailer_url,
                movieData.director,
                getDateTime(), // Formato YYYY-MM-DD HH:MM:SS
            ],
            async function (err) {
                if (err) return reject(err);

                const filmId = this.lastID;

                // Gestione generi (Film_Genre)
                if (Array.isArray(movieData.genre)) {
                    for (const genreName of movieData.genre) {
                        // Recupera genre_id dalla tabella Genre
                        db.get(
                            "SELECT genre_id FROM Genre WHERE genre_name = ?",
                            [genreName],
                            function (err, row) {
                                if (row) {
                                    db.run(
                                        "INSERT INTO Film_Genre (film_id, genre_id) VALUES (?, ?)",
                                        [filmId, row.genre_id]
                                    );
                                }
                            }
                        );
                    }
                }

                // Gestione sceneggiatori (Screenwriter + Film_Screenwriter)
                if (Array.isArray(movieData.screenwriter)) {
                    for (const name of movieData.screenwriter) {
                        // Controlla se esiste già
                        db.get(
                            "SELECT screenwriter_id FROM Screenwriter WHERE screenwriter_name = ?",
                            [name],
                            function (err, row) {
                                if (row) {
                                    // Esiste già, crea relazione
                                    db.run(
                                        "INSERT INTO Film_Screenwriter (film_id, screenwriter_id) VALUES (?, ?)",
                                        [filmId, row.screenwriter_id]
                                    );
                                } else {
                                    // Non esiste, inserisci e poi crea relazione
                                    db.run(
                                        "INSERT INTO Screenwriter (screenwriter_name) VALUES (?)",
                                        [name],
                                        function (err) {
                                            if (!err) {
                                                db.run(
                                                    "INSERT INTO Film_Screenwriter (film_id, screenwriter_id) VALUES (?, ?)",
                                                    [filmId, this.lastID]
                                                );
                                            }
                                        }
                                    );
                                }
                            }
                        );
                    }
                }
                resolve(filmId);
            }
        );
    });
};

exports.updateMovie = async function (id, movieData) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE Film
            SET film_title = ?,
                original_film_title = ?,
                poster = ?,
                release_date = ?,
                plot = ?,
                duration = ?,
                trailer = ?,
                director = ?
            WHERE film_id = ?
        `;
        const trailer_url = `https://www.youtube.com/embed/${movieData.trailer}?autoplay=1&mute=1`;

        db.run(
            sql,
            [
                movieData.film_title,
                movieData.original_film_title,
                movieData.poster,
                movieData.release_date,
                movieData.plot,
                movieData.duration,
                trailer_url,
                movieData.director,
                id,
            ],
            function (err) {
                if (err) return reject(err);

                // Aggiorna generi
                db.run(
                    "DELETE FROM Film_Genre WHERE film_id = ?",
                    [id],
                    function (err) {
                        if (err) return reject(err);

                        if (Array.isArray(movieData.genre)) {
                            movieData.genre.forEach((genreName) => {
                                db.get(
                                    "SELECT genre_id FROM Genre WHERE genre_name = ?",
                                    [genreName],
                                    function (err, row) {
                                        if (row) {
                                            db.run(
                                                "INSERT INTO Film_Genre (film_id, genre_id) VALUES (?, ?)",
                                                [id, row.genre_id]
                                            );
                                        }
                                    }
                                );
                            });
                        }
                    }
                );

                // Aggiorna sceneggiatori
                db.run(
                    "DELETE FROM Film_Screenwriter WHERE film_id = ?",
                    [id],
                    function (err) {
                        if (err) return reject(err);

                        if (Array.isArray(movieData.screenwriter)) {
                            movieData.screenwriter.forEach((name) => {
                                db.get(
                                    "SELECT screenwriter_id FROM Screenwriter WHERE screenwriter_name = ?",
                                    [name],
                                    function (err, row) {
                                        if (row) {
                                            db.run(
                                                "INSERT INTO Film_Screenwriter (film_id, screenwriter_id) VALUES (?, ?)",
                                                [id, row.screenwriter_id]
                                            );
                                        } else {
                                            db.run(
                                                "INSERT INTO Screenwriter (screenwriter_name) VALUES (?)",
                                                [name],
                                                function (err) {
                                                    if (!err) {
                                                        db.run(
                                                            "INSERT INTO Film_Screenwriter (film_id, screenwriter_id) VALUES (?, ?)",
                                                            [id, this.lastID]
                                                        );
                                                    }
                                                }
                                            );
                                        }
                                    }
                                );
                            });
                        }
                    }
                );

                resolve({ id, ...movieData });
            }
        );
    });
};

exports.deleteFilm = function (filmId) {
    return new Promise((resolve, reject) => {
        db.run("DELETE FROM Film WHERE film_id = ?", [filmId], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

exports.searchMovies = function (query) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT DISTINCT f.*
            FROM Film f
            LEFT JOIN Film_Genre fg ON f.film_id = fg.film_id
            LEFT JOIN Genre g ON fg.genre_id = g.genre_id
            LEFT JOIN Film_Screenwriter fs ON f.film_id = fs.film_id
            LEFT JOIN Screenwriter s ON fs.screenwriter_id = s.screenwriter_id
            WHERE f.film_title LIKE ? 
                OR f.director LIKE ?
                OR g.genre_name LIKE ?
                OR s.screenwriter_name LIKE ?
        `;
        const searchTerm = `%${query}%`;
        db.all(
            sql,
            [searchTerm, searchTerm, searchTerm, searchTerm],
            function (err, rows) {
                if (err) reject(err);
                else resolve(rows);
            }
        );
    });
};

exports.getAllGenresById = function (filmId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT fg.genre_id, g.genre_name
            FROM Film_Genre fg
            JOIN Genre g ON fg.genre_id = g.genre_id
            WHERE fg.film_id = ?
        `;
        db.all(sql, [filmId], function (err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

exports.getScreenwritersById = function (filmId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT s.screenwriter_id, s.screenwriter_name
            FROM Film_Screenwriter fs
            JOIN Screenwriter s ON fs.screenwriter_id = s.screenwriter_id
            WHERE fs.film_id = ?
        `;
        db.all(sql, [filmId], function (err, rows) {
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

exports.updateFilmAvgRating = function (filmId) {
    return new Promise((resolve, reject) => {
        const sql = `
            UPDATE Film
            SET avg_user_rating = (
                SELECT ROUND(AVG(rating), 1)
                FROM Reviews
                WHERE film_id = ?
            )
            WHERE film_id = ?
        `;
        db.run(sql, [filmId, filmId], function (err) {
            if (err) reject(err);
            else resolve();
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
                getDateTime(),
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

// Controlla se l'utente ha già votato questa recensione
exports.getUserLikeForReview = function(reviewId, userId) {
    return new Promise((resolve, reject) => {
        const sql = `SELECT type FROM Review_Like WHERE review_id = ? AND user_id = ?`;
        db.get(sql, [reviewId, userId], function(err, row) {
            if (err) reject(err);
            else resolve(row); // row sarà undefined se non ha ancora votato
        });
    });
};

// Inserisce o aggiorna il like/dislike
exports.setReviewLike = async function(reviewId, userId, type) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO Review_Like (review_id, user_id, type)
            VALUES (?, ?, ?)
            ON CONFLICT(review_id, user_id) DO UPDATE SET type=excluded.type
        `;
        db.run(sql, [reviewId, userId, type], function(err) {
            if (err) reject(err);
            else resolve();
        });
    });
};

exports.deleteReview = function (reviewId, userId) {
    return new Promise((resolve, reject) => {
        const sql = "DELETE FROM Reviews WHERE id = ? AND user_id = ?";
        db.run(sql, [reviewId, userId], function (err) {
            if (err) reject(err);
            else resolve();
        });
    });
};
