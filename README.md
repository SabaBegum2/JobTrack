# JobTrack

JobTrack is a cloud-hosted web application that helps users organize, track, and manage job and internship applications in one place. Users can securely create an account, add job applications, update application statuses, and view/edit/delete their saved records from any device.

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

- **Frontend:** HTML, CSS, JavaScript  
- **Backend:** Node.js (Express.js REST API)  
- **Database:** MySQL  
- **Deployment/Hosting:** AWS EC2, AWS RDS (MySQL), AWS S3 (optional for static files/uploads)  
- **Version Control:** Git / GitHub  

---

## Project Structure (Example)

