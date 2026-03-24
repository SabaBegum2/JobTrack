// SETS UP Express, imports routes
const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();

const app = express();
//app.use(cors());
app.use(cors({
  origin: 'http://127.0.0.1:5500'
}));
app.use(express.json());

// Routes
//const jobsRouter = require('./routes/jobs');
//app.use('/api', jobsRouter);

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



const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));