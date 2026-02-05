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

- Frontend: HTML, CSS, JavaScript  
- Backend: Node.js (Express.js REST API)  
- Database: AWS RDS (MySQL)  
- Deployment and Hosting: AWS EC2  
- Version Control: Git / GitHub  

---

## Deployment and Hosting

JobTrack is deployed on Amazon Web Services (AWS).

- **Application Server:** AWS EC2  
- **Database:** AWS RDS (MySQL)  
- **Storage (optional):** AWS S3  

The frontend is served to users through the EC2 instance, which communicates with the backend REST API. 
The backend securely connects to the MySQL database hosted on AWS RDS.

---

## Installing Dependencies

### Option 1: Install Dependencies Using `npm install`
Use this option if the backend folder already contains a `package.json` file.

```bash
cd backend
npm install
npm start



