const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const port = 3000;

app.use(express.json());

// Database setup
const db = new sqlite3.Database('./ledgerlux.db', (err) => {
    if (err) {
        console.error(err.message);
    }
    console.log('Connected to the ledgerlux database.');
});

// Create tables if they don't exist
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS sheets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        name TEXT,
        data TEXT,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )`);
});

// Routes
app.get('/', (req, res) => {
    res.send('LedgerLux backend is running.');
});

// User registration
app.post('/register', (req, res) => {
    const { username, password } = req.body;
    const sql = `INSERT INTO users (username, password) VALUES (?, ?)`;
    db.run(sql, [username, password], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});

// User login
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const sql = `SELECT * FROM users WHERE username = ? AND password = ?`;
    db.get(sql, [username, password], (err, row) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        if (row) {
            res.json({
                "message": "success",
                "data": row
            });
        } else {
            res.status(401).json({ "error": "Invalid credentials" });
        }
    });
});

// Get all sheets for a user
app.get('/api/sheets/:userId', (req, res) => {
    const { userId } = req.params;
    const sql = `SELECT * FROM sheets WHERE user_id = ?`;
    db.all(sql, [userId], (err, rows) => {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": rows
        });
    });
});

// Create a new sheet
app.post('/api/sheets', (req, res) => {
    const { user_id, name, data } = req.body;
    const sql = `INSERT INTO sheets (user_id, name, data) VALUES (?, ?, ?)`;
    db.run(sql, [user_id, name, JSON.stringify(data)], function(err) {
        if (err) {
            res.status(400).json({ "error": err.message });
            return;
        }
        res.json({
            "message": "success",
            "data": { id: this.lastID }
        });
    });
});


app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
