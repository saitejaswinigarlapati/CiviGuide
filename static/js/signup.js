// Toggle between signup and login
const signupSection = document.getElementById("signupSection");
const loginSection = document.getElementById("loginSection");

document.getElementById("showLogin").addEventListener("click", function(e){
  e.preventDefault();
  signupSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
});

document.getElementById("showSignup").addEventListener("click", function(e){
  e.preventDefault();
  loginSection.classList.add("hidden");
  signupSection.classList.remove("hidden");
});

// Signup validation
const signupForm = document.getElementById("signupForm");
signupForm.addEventListener("submit", function(e){
  const password = document.getElementById("password").value;
  const confirmPassword = document.getElementById("confirm_password").value;

  if(password !== confirmPassword){
    e.preventDefault();
    alert("Passwords do not match!");
    return;
  }
  if(password.length < 8){
    e.preventDefault();
    alert("Password must be at least 8 characters long!");
    return;
  }
  alert("Signup successful!");
  e.preventDefault(); // remove if backend exists
  signupForm.reset();
});

// Login form
const loginForm = document.getElementById("loginForm");
loginForm.addEventListener("submit", function(e){
  e.preventDefault();
  const username = document.getElementById("username").value;
  const password = document.getElementById("loginPassword").value;

  if(username && password){
    alert("Login successful for user: " + username);
    loginForm.reset();
  } else {
    alert("Please fill in all fields.");
  }
});
