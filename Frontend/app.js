// runs in the browser ( fetched data from backend, updates the page)

const API = 'http://localhost:3000/api';

// Fetch all jobs and display them
async function loadJobs() {
  const response = await fetch(`${API}/jobs`);
  const jobs = await response.json();
  
  const list = document.getElementById('job-list');
  list.innerHTML = jobs.map(job => `
    <div class="job-card">
      <h3>${job.company}</h3>
      <p>${job.position}</p>
      <p>Status: ${job.status}</p>
    </div>
  `).join('');
}

// Add a new job
async function addJob(company, position, status) {
  await fetch(`${API}/jobs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ company, position, status })
  });
  loadJobs(); // refresh the list
}

loadJobs(); // load jobs when page opens