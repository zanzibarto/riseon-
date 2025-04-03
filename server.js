const express = require('express');
//const mysql = require('mysql2');
const bcrypt = require('bcrypt');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const app = express();
const axios = require('axios'); // For CAPTCHA verification
const port = process.env.PORT || 3000;
require('dotenv').config();
const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Trust first proxy (for production or if hosting behind proxy)
app.set('trust proxy', 1);

// Use CORS with credentials
app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));

// Session config (move above all routes and only once)
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: false, // Set to true in production with HTTPS
        sameSite: 'lax'
    }
}));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  ssl: {
    rejectUnauthorized: true
  }
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    } else {
        console.log('Connected to MySQL');
    }
});

// Get users
app.get('/users', (req, res) => {
    db.query('SELECT id, username FROM users', (err, results) => {
        if (err) return res.status(500).json({ error: 'Failed to fetch users' });
        res.json(results);
    });
});

// Referral count
app.get('/referrals/:code', (req, res) => {
    const code = req.params.code;
    db.query(
        'SELECT COUNT(*) AS count FROM users WHERE referred_by = ?',
        [code],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch referral count' });
            res.json({ code, count: results[0].count });
        }
    );
});

// Signup route
app.post('/signup', async (req, res) => {
    const {
        username, password, first_name, last_name,
        phone, sex, age, referral_code, captcha
    } = req.body;

    const user_referral_code = referral_code || '';
    const referred_by = referral_code || '';

    if (!captcha) {
        return res.status(400).json({ error: 'Please complete CAPTCHA' });
    }

    const secretKey = '6Lf_nQQrAAAAACIdiZXMO6QKScJspvkdV0Id9ILM';
    const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}`;

    try {
        const captchaVerify = await axios.post(verifyURL);
        if (!captchaVerify.data.success) {
            return res.status(400).json({ error: 'CAPTCHA verification failed' });
        }
    } catch (error) {
        return res.status(500).json({ error: 'CAPTCHA verification error' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    db.query(
        'INSERT INTO users (username, password, first_name, last_name, phone_number, sex, age, referral_code, referred_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [username, hashedPassword, first_name, last_name, phone, sex, age, user_referral_code, referred_by],
        (err) => {
            if (err) return res.status(500).json({ error: 'Signup failed' });
            res.json({ message: 'User registered successfully' });
        }
    );
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) return res.status(500).json({ error: 'Logout failed' });
        res.json({ message: 'Logged out successfully' });
    });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    db.query('SELECT password FROM users WHERE username = ?', [username], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
        const isMatch = await bcrypt.compare(password, results[0].password);
        if (isMatch) {
            req.session.user = username;
            res.json({ message: 'Login successful' });
        } else {
            res.status(401).json({ error: 'Invalid credentials' });
        }
    });
});

// Authentication check
app.get('/checkAuth', (req, res) => {
    if (req.session.user) {
        res.json({ authenticated: true, user: req.session.user });
    } else {
        res.json({ authenticated: false });
    }
});
app.get('/getUserData', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'Not authenticated' });

    const username = req.session.user;

    db.query(
        'SELECT referral_code, phone_number, sex, age FROM users WHERE username = ?',
        [username],
        (err, results) => {
            if (err || results.length === 0) return res.status(500).json({ error: 'User not found' });
            res.json(results[0]);
        }
    );
});


// Test session endpoints
app.get('/test-session', (req, res) => {
    req.session.test = 'works!';
    res.send('Session set');
});

app.get('/check-session', (req, res) => {
    res.send(req.session.test || 'No session');
});

// Start server
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
