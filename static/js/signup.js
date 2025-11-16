const signupSection = document.getElementById("signupSection");
const loginSection = document.getElementById("loginSection");

document.getElementById("showLogin").addEventListener("click", e => {
  e.preventDefault();
  signupSection.classList.add("hidden");
  loginSection.classList.remove("hidden");
});

document.getElementById("showSignup").addEventListener("click", e => {
  e.preventDefault();
  loginSection.classList.add("hidden");
  signupSection.classList.remove("hidden");
});
