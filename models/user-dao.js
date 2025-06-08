'use strict';

// DAO (Data Access Object) module for accessing users
const db = require("../db.js");
const bcrypt = require("bcrypt");

exports.registerUser = function(username, email, password, user_type) {
    return new Promise((resolve, reject) => {
        const sql = `
            INSERT INTO User (username, email, hash_password, user_type)
            VALUES (?, ?, ?, ?)
        `;
        bcrypt.hash(password, 10).then(hash => {
            db.run(sql,
                [
                    username,
                    email,
                    hash,
                    user_type
                ], function(err) {
                    if(err) {
                        // Gestione errore di vincolo unico (username/email già esistente)
                        if (err.code === 'SQLITE_CONSTRAINT') {
                            reject(new Error('Username o email già in uso.'));
                        } else {
                            reject(err);
                        }
                    } else {
                        console.log(`User ${username} registered successfully.`);
                        resolve(this.lastID);
                    }
                }
            )
        }).catch(err => reject(err));
    })
}

exports.loginUser = function(username, password) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT user_id, username, hash_password, user_type FROM User WHERE username = ?';
        db.get(sql, [username], function(err, row) {
            if(err) {
                console.error(`Error fetching user ${username}:`, err);
                reject(err);
            }
            else if(!row) {
                console.log(`User ${username} not found.`);
                resolve({user: false, pass: undefined});
            }
            else {
                console.log(`User ${username} found, checking password...`);
                resolve(
                    { 
                        user: {id: row.user_id},
                        pass: bcrypt.compareSync(password, row.hash_password),
                        type: row.user_type,
                        username: row.username
                    },
                );
            }
        })
    })
}

exports.getUserInfoById = function(id) {
    return new Promise((resolve, reject) => {
        const sql = 'SELECT username, user_type, email FROM User WHERE user_id = ?';  
        db.get(sql, [id], function(err, row) {
            if(err) reject(err);
            else if(!row) resolve();
            else resolve({id: id, username: row.username, type: row.user_type, email: row.email});
        })
    });
}

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

exports.getUserReviews = function(userId) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT r.review_id, r.rating, r.title, r.comment, r.thumbs_up, r.thumbs_down,
                   f.film_id, f.film_title, f.poster
            FROM Reviews r
            JOIN Film f ON r.film_id = f.film_id
            WHERE r.user_id = ?
            ORDER BY r.upload_date DESC
        `;
        db.all(sql, [userId], function(err, rows) {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};