'use strict';

// Gestione connessione al database SQLite
const sqlite = require('sqlite3').verbose();

const DBSOURCE = './movie-db.db';

const db = new sqlite.Database(DBSOURCE, (err) => {
    if (err) {
        // cannot open database
        console.error(err.message);
        throw err;
    } else console.log('Database opened correctly');
});

module.exports = db;