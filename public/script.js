// script.js

async function signup() {
  const username = document.getElementById('signup-username').value;
  const password = document.getElementById('signup-password').value;

  const response = await fetch('http://localhost:3000/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  alert(data.message);
  if (response.ok) {
      window.location.href = "login.html"; // Redirect to login page
  }
}

async function login() {
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;

  const response = await fetch('http://localhost:3000/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
  });

  const data = await response.json();
  alert(data.message);
  if (response.ok) {
      window.location.href = "dashboard.html"; // Redirect to dashboard
  }
}
