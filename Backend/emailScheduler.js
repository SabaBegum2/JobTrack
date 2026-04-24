const cron = require('node-cron');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
        user: 'sababegum4432@gmail.com',
        pass: 'kqdh zsey rhmj oqcy'
    }
});

module.exports = (db) => {

    console.log('Email scheduler loaded ✓');

    // ============================================================
    // CALENDAR EVENT REMINDERS — runs every minute (change to '0 * * * *' for every hour in production)
    // ============================================================
    cron.schedule('* * * * *', async () => {
        console.log('Running calendar reminder job...');
        try {
            const [users] = await db.query(
                'SELECT id, email, full_name, email_timing FROM users WHERE email_reminders = true'
            );

            for (const user of users) {
                const hours = user.email_timing || 24;

                // Only fetch events where reminder hasn't been sent yet
                const [events] = await db.query(`
                    SELECT * FROM calendar_events
                    WHERE user_id = ?
                    AND reminder_sent = false
                    AND TIMESTAMPDIFF(HOUR, NOW(), CONCAT(date, ' ', IFNULL(time, '00:00:00'))) BETWEEN 0 AND ?
                `, [user.id, hours]);

                for (const event of events) {
                    const time = event.time ? formatTime(event.time) : 'All day';

                    await transporter.sendMail({
                        from: 'sababegum4432@gmail.com',
                        to: user.email,
                        subject: `JobTrack Reminder: ${event.title}`,
                        html: `
                            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                                <div style="background: linear-gradient(135deg, #0c3e54, #174e69); padding: 28px 32px; border-radius: 12px 12px 0 0;">
                                    <h1 style="color: white; margin: 0; font-size: 20px;">Upcoming Event Reminder</h1>
                                </div>
                                <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
                                    <p>Hi ${user.full_name},</p>
                                    <p>You have an upcoming <strong>${event.type}</strong> event:</p>
                                    <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px; margin: 16px 0;">
                                        <h3 style="margin: 0 0 8px; color: #174e69;">${event.title}</h3>
                                        <p style="margin: 0; color: #64748b;">📅 ${event.date} &nbsp;|&nbsp; 🕐 ${time}</p>
                                        <p style="margin: 4px 0 0; color: #64748b;">📌 Type: ${event.type}</p>
                                    </div>
                                    <p>Good luck! Make sure you're prepared.</p>
                                    <a href="http://localhost:5500/Frontend/Calendar.html"
                                        style="display: inline-block; padding: 12px 24px; background: #174e69; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                        View Calendar
                                    </a>
                                    <p style="margin-top: 24px; color: #64748b; font-size: 13px;">
                                        You're receiving this because you have email reminders enabled in JobTrack.
                                    </p>
                                </div>
                            </div>
                        `
                    });

                    // Mark reminder as sent so it doesn't send again
                    await db.query(
                        'UPDATE calendar_events SET reminder_sent = true WHERE id = ?',
                        [event.id]
                    );

                    console.log(`Reminder sent to ${user.email} for: ${event.title}`);
                }
            }
        } catch (err) {
            console.error('Calendar reminder error:', err);
        }
    });

    // ============================================================
    // WEEKLY SUMMARY — runs every Friday at 3:00 PM
    // ============================================================
    cron.schedule('0 15 * * 5', async () => {
        console.log('Running weekly summary job...');
        try {
            const [users] = await db.query('SELECT * FROM users WHERE weekly_summary = true');

            for (const user of users) {
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                const weekAgoStr = weekAgo.toISOString().split('T')[0];

                const [weekApps] = await db.query(`
                    SELECT * FROM jobs
                    WHERE user_id = ? AND date >= ?
                    ORDER BY date DESC
                `, [user.id, weekAgoStr]);

                const today = new Date().toISOString().split('T')[0];
                const [interviews] = await db.query(`
                    SELECT * FROM calendar_events
                    WHERE user_id = ? AND type = 'interview' AND date >= ?
                    ORDER BY date ASC
                    LIMIT 5
                `, [user.id, today]);

                const [statsRows] = await db.query(`
                    SELECT status, COUNT(*) as count
                    FROM jobs WHERE user_id = ?
                    GROUP BY status
                `, [user.id]);

                const stats = { total: 0, applied: 0, interviewing: 0, offers: 0, rejected: 0 };
                statsRows.forEach(row => {
                    const s = row.status.toLowerCase();
                    stats.total += Number(row.count);
                    if (s === 'applied')      stats.applied      += Number(row.count);
                    if (s === 'interviewing') stats.interviewing += Number(row.count);
                    if (s === 'offer')        stats.offers       += Number(row.count);
                    if (s === 'rejected')     stats.rejected     += Number(row.count);
                });

                if (stats.total === 0) continue;

                const interviewsHtml = interviews.length > 0
                    ? interviews.map(ev => `
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${ev.title}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${ev.date}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${ev.time || 'All day'}</td>
                        </tr>`).join('')
                    : `<tr><td colspan="3" style="padding: 8px 12px; color: #94a3b8;">No upcoming interviews</td></tr>`;

                const appsHtml = weekApps.length > 0
                    ? weekApps.map(app => `
                        <tr>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${app.company}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${app.title}</td>
                            <td style="padding: 8px 12px; border-bottom: 1px solid #e2e8f0;">${app.status}</td>
                        </tr>`).join('')
                    : `<tr><td colspan="3" style="padding: 8px 12px; color: #94a3b8;">No applications this week</td></tr>`;

                const tips = [
                    'Tailor your resume keywords to match each job description.',
                    'Follow up 5–7 days after applying to show initiative.',
                    'Prepare STAR stories for behavioral interview questions.',
                    'Research the company before every interview.',
                    'Connect with employees on LinkedIn before your interview.',
                ];
                const randomTip = tips[Math.floor(Math.random() * tips.length)];

                await transporter.sendMail({
                    from: 'sababegum4432@gmail.com',
                    to: user.email,
                    subject: 'JobTrack — Your Weekly Summary 📊',
                    html: `
                        <div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; color: #1e293b;">
                            <div style="background: linear-gradient(135deg, #0c3e54, #174e69); padding: 28px 32px; border-radius: 12px 12px 0 0;">
                                <h1 style="color: white; margin: 0; font-size: 22px;">Your Weekly Summary</h1>
                                <p style="color: rgba(255,255,255,0.75); margin: 6px 0 0; font-size: 14px;">
                                    Week ending ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                                </p>
                            </div>
                            <div style="background: #f8fafc; padding: 24px 32px; border: 1px solid #e2e8f0;">
                                <h2 style="color: #0c3e54; font-size: 16px; margin: 0 0 16px;">📈 All-Time Stats</h2>
                                <div style="display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 24px;">
                                    ${[
                                        ['Total', stats.total, '#2d5be3'],
                                        ['Applied', stats.applied, '#2d5be3'],
                                        ['Interviewing', stats.interviewing, '#f59e0b'],
                                        ['Offers', stats.offers, '#18794e'],
                                        ['Rejected', stats.rejected, '#c53030'],
                                    ].map(([label, val, color]) => `
                                        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; min-width: 80px; text-align: center;">
                                            <div style="font-size: 22px; font-weight: 700; color: ${color};">${val}</div>
                                            <div style="font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em;">${label}</div>
                                        </div>`).join('')}
                                </div>

                                <h2 style="color: #0c3e54; font-size: 16px; margin: 0 0 12px;">📋 Applications This Week (${weekApps.length})</h2>
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <thead>
                                        <tr style="background: #f1f5f9;">
                                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Company</th>
                                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Role</th>
                                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>${appsHtml}</tbody>
                                </table>

                                <h2 style="color: #0c3e54; font-size: 16px; margin: 0 0 12px;">🗓 Upcoming Interviews</h2>
                                <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; background: white; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0;">
                                    <thead>
                                        <tr style="background: #f1f5f9;">
                                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Event</th>
                                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Date</th>
                                            <th style="padding: 8px 12px; text-align: left; font-size: 11px; color: #64748b; text-transform: uppercase;">Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>${interviewsHtml}</tbody>
                                </table>

                                <div style="background: #eff6ff; border-left: 3px solid #2d5be3; border-radius: 0 8px 8px 0; padding: 14px 16px; margin-bottom: 24px;">
                                    <h4 style="margin: 0 0 6px; color: #1e3a8a; font-size: 13px;">💡 Tip of the Week</h4>
                                    <p style="margin: 0; font-size: 13px; color: #1e40af;">${randomTip}</p>
                                </div>

                                <a href="http://localhost:5500/Frontend/Dashboard.html"
                                    style="display: inline-block; padding: 12px 24px; background: #174e69; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">
                                    View Dashboard
                                </a>

                                <p style="margin-top: 24px; color: #94a3b8; font-size: 12px;">
                                    You're receiving this because you have weekly summaries enabled in JobTrack.
                                </p>
                            </div>
                        </div>
                    `
                });
                console.log(`Weekly summary sent to ${user.email}`);
            }
        } catch (err) {
            console.error('Weekly summary error:', err);
        }
    });

};

function formatTime(timeStr) {
    const [h, m] = timeStr.split(':');
    const d = new Date();
    d.setHours(+h, +m);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}