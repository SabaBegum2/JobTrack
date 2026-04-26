// SETS UP Express, imports routes
const express = require('express');
const cors = require('cors');
const db = require('./db');
require('dotenv').config();
const crypto = require('crypto');
//const emailRoutes = require('./emailRoutes'); 
const emailScheduler = require('./emailScheduler');
emailScheduler(db);

const app = express();
//app.use(cors());
app.use(cors({
  origin: '*'
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

app.delete('/api/jobs/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM jobs WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE all jobs for a user
app.delete('/api/jobs/all/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    await db.query('DELETE FROM jobs WHERE user_id = ?', [userId]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

// DELETE account
app.delete('/api/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DASHBOARD
app.get('/api/dashboard', async (req, res) => {
  try {
    const userId = req.query.userId;

    const [rows] = await db.query(
      `SELECT status, COUNT(*) as count 
       FROM jobs 
       WHERE user_id = ? 
       GROUP BY status`,
      [userId]
    );

    // ← add rejected and interested
    const stats = { total: 0, applied: 0, interviewing: 0, offers: 0, rejected: 0, interested: 0 };
    rows.forEach(row => {
      const s = row.status.toLowerCase();
      stats.total += Number(row.count);
      if (s === 'applied')      stats.applied      += Number(row.count);
      if (s === 'interviewing') stats.interviewing  += Number(row.count);
      if (s === 'offer')        stats.offers        += Number(row.count);
      if (s === 'rejected')     stats.rejected      += Number(row.count); // ← add
      if (s === 'interested')   stats.interested    += Number(row.count); // ← add
    });

    const [recent] = await db.query(
      `SELECT company, title, date, status 
       FROM jobs 
       WHERE user_id = ? 
       ORDER BY date DESC 
       LIMIT 5`,
      [userId]
    );

    res.json({ stats, recent });

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

// FORGOT PASSWORD
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  requireTLS: true,
  auth: {
    user: 'sababegum4432@gmail.com',
    pass: 'kqdh zsey rhmj oqcy'  // paste your app password here (no spaces)
  }
});

transporter.verify(function (error, success) {
  if (error) {
    console.log('Transporter error:', error);
  } else {
    console.log('Server is ready to send emails');
  }
});

app.post('/api/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
    const result = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    console.log('User found:', result[0]);

    if (result[0].length === 0) {
      return res.status(404).json({ message: 'Email not found.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString().slice(0, 19).replace('T', ' ');
    await db.query(
      'UPDATE users SET reset_token = ?, reset_expiry = ? WHERE email = ?',
      [token, expiry, email]
    );

    console.log('Sending email to:', email);

    await transporter.sendMail({
      from: 'sababegum4432@gmail.com',
      to: email,
      subject: 'JobTrack - Password Reset',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
          <h2 style="color: #0c3e54;">Reset Your Password</h2>
          <p>You requested a password reset for your JobTrack account.</p>
          <a href="http://localhost:5500/Frontend/resetPassword.html?token=${token}"
            style="display: inline-block; padding: 12px 24px; background: #174e69; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
            Reset Password
          </a>
          <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
            This link expires in 1 hour. If you didn't request this, ignore this email.
          </p>
        </div>
      `
    });

    console.log('Email sent successfully');

    res.json({ message: 'Reset email sent.' });

  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});

//RESET PASSWORD
app.post('/api/reset-password', async (req, res) => {
  const { token, new_password } = req.body;
  console.log('Reset password attempt with token:', token);

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE reset_token = ? AND reset_expiry > NOW()',
      [token]
    );
    console.log('Token lookup result:', rows);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'Invalid or expired token.' });
    }

    await db.query(
      'UPDATE users SET password = ?, reset_token = NULL, reset_expiry = NULL WHERE reset_token = ?',
      [new_password, token]
    );

    res.json({ message: 'Password reset successful.' });

  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
});


// SETTING GOALS
app.get('/api/goals', async (req, res) => {
  const { userId } = req.query;
  try {
    const [rows] = await db.query(
      'SELECT goal_weekly, goal_title, goal_industry, goal_status FROM user_goals WHERE user_id = ?',
      [userId]
    );
    res.json(rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/users/:id/email-prefs', async (req, res) => {
  const { email_reminders, email_timing, weekly_summary } = req.body;
  try {
    const fields = [];
    const values = [];

    if (email_reminders !== undefined) { fields.push('email_reminders = ?'); values.push(email_reminders); }
    if (email_timing !== undefined)    { fields.push('email_timing = ?');    values.push(email_timing); }
    if (weekly_summary !== undefined)  { fields.push('weekly_summary = ?');  values.push(weekly_summary); }

    if (fields.length === 0) return res.status(400).json({ message: 'No fields to update' });

    values.push(req.params.id);
    await db.query(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// SAVE goals (upsert — creates row if it doesn't exist, updates if it does)
app.post('/api/goals', async (req, res) => {
  const { userId, weekly, title, industry, status } = req.body;
  try {
    await db.query(`
      INSERT INTO user_goals (user_id, goal_weekly, goal_title, goal_industry, goal_status)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        goal_weekly   = VALUES(goal_weekly),
        goal_title    = VALUES(goal_title),
        goal_industry = VALUES(goal_industry),
        goal_status   = VALUES(goal_status)
    `, [userId, weekly, title, industry, status]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
