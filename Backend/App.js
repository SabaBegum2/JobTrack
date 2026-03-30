// SETS UP Express, imports routes
const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const crypto = require('crypto');

const app = express();
//app.use(cors());
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));
app.use(express.json());
 

// Register route
app.post("/api/register", async (req, res) => {
  const { fullName, email, password } = req.body;

  if (!fullName || !email || !password) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    const [existing] = await db.query("SELECT * FROM users WHERE email = ?", [email]);

    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered." });
    }

    await db.query(
      "INSERT INTO users (full_name, email, password) VALUES (?, ?, ?)",
      [fullName, email, password]
    );

    res.status(201).json({ message: "User registered successfully." });
  } catch (err) {
    res.status(500).json({ error: "Failed to register user." });
  }
});

// LOGIN
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  try {
    const [results] = await db.query(
      'SELECT * FROM users WHERE email = ? AND password = ?',
      [email, password]
    );
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
app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  try {
    const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

    if (results.length === 0) {
      return res.status(404).json({ message: 'Email not found' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires_at = new Date(Date.now() + 1 * 60 * 60 * 1000);

    await db.query(
      'INSERT INTO password_resets (email, token, expires_at) VALUES (?, ?, ?)',
      [email, token, expires_at]
    );

    res.json({ message: 'Reset token generated', token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
  const { token, new_password } = req.body;

  if (!token || !new_password) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  try {
    const [results] = await db.query(
      'SELECT * FROM password_resets WHERE token = ? AND expires_at > NOW()',
      [token]
    );

    if (results.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token' });
    }

    const email = results[0].email;

    await db.query('UPDATE users SET password = ? WHERE email = ?', [new_password, email]);
    await db.query('DELETE FROM password_resets WHERE token = ?', [token]);

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET JOBS FOR USER
app.get('/api/jobs/:userId', async (req, res) => {
  try {
    const [jobs] = await db.query(
      'SELECT * FROM jobs WHERE user_id = ? ORDER BY date DESC',
      [req.params.userId]
    );
    res.json(jobs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// ADD A JOB
app.post('/api/jobs', async (req, res) => {
  const { userId, company, title, date, status, notes } = req.body;
  if (!userId || !company || !title || !date) {
    return res.status(400).json({ message: 'All fields are required.' });
  }
  try {
    await db.query(
      'INSERT INTO jobs (user_id, company, title, date, status, notes) VALUES (?, ?, ?, ?, ?, ?)',
      [userId, company, title, date, status, notes]
    );
    res.status(201).json({ message: 'Job added successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

//DELETE A JOB
app.delete('/api/jobs/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM jobs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// UPDATE A JOB
app.put('/api/jobs/:id', async (req, res) => {
  const { company, title, date, status, notes } = req.body;
  try {
    await db.query(
      'UPDATE jobs SET company = ?, title = ?, date = ?, status = ?, notes = ? WHERE id = ?',
      [company, title, date, status, notes, req.params.id]
    );
    res.json({ message: 'Job updated successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/calendar/events
app.get('/api/calendar/events', async (req, res) => {
  const { user_id } = req.query;
  try {
    const [rows] = await db.query(
      `SELECT id, title, DATE_FORMAT(date, '%Y-%m-%d') AS date, 
              TIME_FORMAT(time, '%H:%i') AS time, type
       FROM calendar_events
       WHERE user_id = ?
       ORDER BY date ASC`,
      [user_id]
    );
    res.json(rows);
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/calendar/events
app.post('/api/calendar/events', async (req, res) => {
  const { user_id, title, date, time, type } = req.body;
  console.log('Received body:', req.body); // ← keep this for now to debug
  try {
    const [result] = await db.query(
      `INSERT INTO calendar_events (user_id, title, date, time, type) 
       VALUES (?, ?, ?, ?, ?)`,
      [user_id, title, date, time || null, type]
    );
    res.json({ id: result.insertId, title, date, time, type });
  } catch (err) {
    console.error('DB error:', err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE a calendar event
app.put('/api/calendar/events/:id', async (req, res) => {
  const { title, date, time, type } = req.body;
  try {
    await db.query(
      `UPDATE calendar_events SET title = ?, date = ?, time = ?, type = ? WHERE id = ?`,
      [title, date, time || null, type, req.params.id]
    );
    res.json({ message: 'Event updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE a calendar event
app.delete('/api/calendar/events/:id', async (req, res) => {
  try {
    await db.query(`DELETE FROM calendar_events WHERE id = ?`, [req.params.id]);
    res.json({ message: 'Event deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DASHBOARD
app.get('/api/dashboard', async (req, res) => {
  try {
    const userId = req.query.userId; // gets userId from URL: /api/dashboard?userId=1

    // Get counts grouped by status
    const [rows] = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM jobs 
       WHERE user_id = ? 
       GROUP BY status`,
      [userId]
    );

    // Build stats object
    const stats = { total: 0, applied: 0, interviewing: 0, offers: 0 };
    rows.forEach(row => {
      const s = row.status.toLowerCase();
      stats.total += Number(row.count);
      if (s === 'applied')      stats.applied      += Number(row.count);
      if (s === 'interviewing') stats.interviewing += Number(row.count);
      if (s === 'offer')        stats.offers       += Number(row.count);
    });

    // Calculate percentages for progress bars
    const progress = {
      applied:      stats.total ? Math.round((stats.applied      / stats.total) * 100) : 0,
      interviewing: stats.total ? Math.round((stats.interviewing / stats.total) * 100) : 0,
      offers:       stats.total ? Math.round((stats.offers       / stats.total) * 100) : 0,
    };

    // Get 5 most recent jobs
    const [recent] = await db.query(
      `SELECT company, title, date, status 
       FROM jobs 
       WHERE user_id = ? 
       ORDER BY date DESC 
       LIMIT 5`,
      [userId]
    );

    res.json({ stats, progress, recent });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load dashboard data' });
  }
});

// UPDATE user profile
app.put('/api/users/:id', async (req, res) => {
  const { full_name, email } = req.body;
  try {
    await db.query('UPDATE users SET full_name = ?, email = ? WHERE id = ?', [full_name, email, req.params.id]);
    res.json({ message: 'Profile updated' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});

// UPDATE password
app.put('/api/users/:id/password', async (req, res) => {
  const { current_password, new_password } = req.body;
  try {
    const [rows] = await db.query('SELECT * FROM users WHERE id = ? AND password = ?', [req.params.id, current_password]);
    if (rows.length === 0) return res.status(401).json({ message: 'Current password is incorrect' });
    await db.query('UPDATE users SET password = ? WHERE id = ?', [new_password, req.params.id]);
    res.json({ message: 'Password updated' });
  } catch (err) { res.status(500).json({ message: 'Server error' }); }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
