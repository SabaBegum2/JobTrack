# JobTrack
JobTrack is a cloud-hosted web application that helps users organize, track, 
and manage job and internship applications in one place. Users can securely 
create an account, add job applications, update application statuses, and 
view a dashboard with application analytics, a calendar for scheduling, 
and email reminders.

## Live Site
http://jobtrack-frontend.s3-website.us-east-2.amazonaws.com

---

## Features
- User authentication (register, login, logout, reset password)
- Create a job application entry (role, company, date applied, notes, link)
- View all applications in a list/table
- View application details
- Edit an application
- Delete an application
- Update application status (Interested → Applied → Interviewing → Offer/Rejected)
- Search and filter applications

---

## High-Level System Design
JobTrack uses a **three-tier architecture**:
1. **Frontend (Client):** Runs in the browser and shows pages like Login, Register, Dashboard, and Application Forms.
2. **Backend (Server):** Node.js + Express REST API that handles business logic and validation.
3. **Database (Data Layer):** MySQL database that stores users and job application data.

---

## Tech Stack
- Frontend: HTML, CSS, JavaScript (hosted on AWS S3)
- Backend: Node.js (Express.js REST API) (hosted on AWS EC2)
- Database: MySQL (hosted on Amazon RDS 
- Deployment and Hosting: AWS EC2  
- Version Control: Git / GitHub  

---

## Deployment and Hosting
JobTrack is deployed on Amazon Web Services (AWS).
- **Application Server:** AWS EC2  
- **Database:** AWS RDS (MySQL)  
- **Storage (optional):** AWS S3  

The frontend is served to users through the EC2 instance, which communicates with the backend REST API. The backend securely connects to the MySQL database hosted on AWS RDS.

---

## Installing Dependencies

### Option 1: Install Dependencies Using `npm install`
Use this option if the backend folder already contains a `package.json` file.
```bash
cd backend
npm install
npm start
```

---

## Database Setup

### Tables

Run the following SQL statements to create the required tables in your database:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL
);
USE JobTracker;
ALTER TABLE users 
ADD COLUMN reset_token VARCHAR(255) NULL,
ADD COLUMN reset_expiry DATETIME NULL;

CREATE TABLE password_resets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL
);

CREATE TABLE jobs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  company VARCHAR(255),
  title VARCHAR(255),
  status ENUM('Interested', 'Applied', 'Interviewing', 'Offer', 'Rejected'),
  date DATE,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE calendar_events (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  title       VARCHAR(255) NOT NULL,
  date        DATE NOT NULL,
  time        TIME DEFAULT NULL,
  type        ENUM('interview', 'deadline', 'followup', 'offer', 'other') NOT NULL DEFAULT 'other',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_date (user_id, date)
);

CREATE TABLE user_settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL UNIQUE,
  theme ENUM('light', 'dark') DEFAULT 'light',
  email_reminders BOOLEAN DEFAULT FALSE,
  weekly_summary BOOLEAN DEFAULT FALSE,
  job_search_goal INT DEFAULT NULL,
  preferred_job_type ENUM('full-time', 'part-time', 'contract', 'internship', 'remote') DEFAULT NULL,
  preferred_location VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

## Connecting to the Database (AWS RDS + MySQL Workbench)

The database is already set up and hosted on AWS RDS. You do not need to create your own — just connect to the existing one.

Contact the project owner to get the credentials before following the steps below.

### Prerequisites
- [MySQL Workbench](https://dev.mysql.com/downloads/workbench/) installed
- Database credentials from the project owner (host, username, password)

### Step 1 - Connect in MySQL Workbench
1. Open MySQL Workbench
2. Click the **+** icon next to "MySQL Connections"
3. Fill in the following:
   - **Connection Name:** JobTracker (or any name you like)
   - **Hostname:** provided by project owner
   - **Port:** `3306`
   - **Username:** provided by project owner
   - **Password:** click **Store in Vault** and enter the password provided
4. Click **Test Connection** — you should see a success message
5. Click **OK** to save, then double-click the connection to open it

### Step 2 - Configure Your `.env` File
Create a `.env` file in the `backend` folder with the credentials provided:
```env
DB_HOST= provided by the project owner
DB_USER=admin
DB_PASSWORD= provided by the project owner
DB_NAME=JobTracker
DB_PORT=3306
```

> ⚠️ Never commit your `.env` file to GitHub. Make sure `.env` is listed in your `.gitignore`.
