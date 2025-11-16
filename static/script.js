// place in static/script.js and include in templates
document.addEventListener("DOMContentLoaded", function() {
  // Theme toggle
  const toggle = document.getElementById("theme-toggle");
  const body = document.body;
  const saved = localStorage.getItem("theme");
  if (saved === "light") body.classList.add("light");

  if (toggle) {
    toggle.addEventListener("click", () => {
      body.classList.toggle("light");
      const mode = body.classList.contains("light") ? "light" : "dark";
      localStorage.setItem("theme", mode);
    });
  }

  // simple alert fade
  document.querySelectorAll(".flash").forEach(el => {
    setTimeout(()=> {
      el.style.transition = "opacity 500ms, transform 500ms";
      el.style.opacity = "0";
      el.style.transform = "translateY(-8px)";
      setTimeout(()=> el.remove(), 600);
    }, 3500);
  });

  // confirmation for admin delete buttons
  document.querySelectorAll(".confirm-delete").forEach(btn=>{
    btn.addEventListener("click", function(e){
      if(!confirm("Are you sure you want to delete this user?")) e.preventDefault();
    });
  });
});
