// SETS UP Express, imports routes
const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
const jobsRouter = require('./routes/jobs');
app.use('/api', jobsRouter);

// REGISTER - updated for promise pool
app.post('/api/register', async (req, res) => {
  const { full_name, email, password } = req.body;
  if (!full_name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const sql = 'INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)';
    await db.query(sql, [full_name, email, password]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';
    const [results] = await db.query(sql, [email, password]);
    if (results.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }
    const user = results[0];
    res.json({ message: 'Login successful', user: { id: user.id, full_name: user.full_name, email: user.email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// FORGOT PASSWORD
app.post('/api/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  const sql = 'SELECT * FROM users WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });

    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour

    const insertSql = 'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)';
    db.query(insertSql, [email, token, expires_at], (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });
      res.json({ message: 'Reset token generated', token });
    });
  });
});

// RESET PASSWORD
app.post('/api/reset-password', (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  const sql = 'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()';
  db.query(sql, [token], (err, results) => {
    if (err) return res.status(500).json({ message: 'Server error' });

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const email = results[0].email;

    const updateSql = 'UPDATE users SET password = ? WHERE email = ?';
    db.query(updateSql, [new_password, email], (err) => {
      if (err) return res.status(500).json({ message: 'Server error' });

      const deleteSql = 'DELETE FROM password_resets WHERE token = ?';
      db.query(deleteSql, [token], () => {});

      res.json({ message: 'Password reset successfully' });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));