// ===== Splash & Main =====
setTimeout(() => {
  document.getElementById("splash").style.display = "none";
  const main = document.getElementById("main");
  main.style.display = "flex";

  // tiny delay ensures map container is visible
  setTimeout(initMap, 50);
}, 1500);

// ===== Sidebar =====
function toggleSidebar(){
  const sidebar = document.getElementById("mySidebar");
  sidebar.style.width = (sidebar.style.width === "250px") ? "0" : "250px";
}

// ===== Map & Routing =====
function initMap() {
  const map = L.map('map').setView([22.0,78.0],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

  let routingControl = null;
  let routeInstructions = [];
  let currentStepIndex = 0;

  // Search Route
  document.getElementById('searchBtn').onclick = function(){
    const src = document.getElementById('source').value.trim();
    const dest = document.getElementById('destination').value.trim();
    if(!src || !dest){ alert("Enter both source and destination"); return; }

    const nominatimURL = place => `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;

    Promise.all([fetch(nominatimURL(src)).then(r=>r.json()), fetch(nominatimURL(dest)).then(r=>r.json())])
      .then(([srcData,destData])=>{
        if(!srcData.length || !destData.length){ alert("Location not found"); return; }

        const srcLatLng = L.latLng(srcData[0].lat, srcData[0].lon);
        const destLatLng = L.latLng(destData[0].lat, destData[0].lon);

        if(routingControl) map.removeControl(routingControl);

        routingControl = L.Routing.control({
          waypoints:[srcLatLng,destLatLng],
          lineOptions:{styles:[{color:'red',opacity:0.8,weight:5}]},
          router:L.Routing.osrmv1({serviceUrl:'https://router.project-osrm.org/route/v1'}),
          show:true
        }).addTo(map);

        routingControl.on('routesfound', e=>{
          const route = e.routes[0];
          document.getElementById('distanceBox').innerText =
            `Distance: ${(route.summary.totalDistance/1000).toFixed(2)} km | ETA: ${Math.round(route.summary.totalTime/60)} min`;
          routeInstructions = route.instructions || [];
          currentStepIndex = 0;
        });
      });
  };

  // Reverse locations
  window.reverseLocations = function(){
    const s = document.getElementById('source');
    const d = document.getElementById('destination');
    [s.value,d.value] = [d.value,s.value];
  };

  // Mic navigation
  document.getElementById('micButton').onclick = function(){
    if(!routeInstructions.length){ alert("No route loaded."); return; }
    currentStepIndex = 0;
    speak("Starting navigation. Follow the instructions.");
    let interval = setInterval(()=>{
      if(currentStepIndex<routeInstructions.length){
        speak(routeInstructions[currentStepIndex].text);
        currentStepIndex++;
      } else {
        speak("You have arrived at your destination.");
        clearInterval(interval);
      }
    },8000);
  };

  function speak(text){
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    window.speechSynthesis.speak(utter);
  }
}

// ===== Feedback =====
function highlightStars(num){
  document.querySelectorAll('#stars .star').forEach((s,i)=>s.classList.toggle('yellow',i<num));
}
function showFeedbackPopup(){
  document.getElementById('feedbackPopup').style.display='block';
  document.getElementById('source').disabled=true;
  document.getElementById('destination').disabled=true;
  document.getElementById('searchBtn').disabled=true;
}
function closeFeedback(){
  document.getElementById('feedbackPopup').style.display='none';
  document.getElementById('source').disabled=false;
  document.getElementById('destination').disabled=false;
  document.getElementById('searchBtn').disabled=false;
}
function submitFeedback(){ closeFeedback(); alert("Thanks for your feedback!"); }

// ===== Visit count logic =====
let visits = localStorage.getItem('visits')||0;
visits++;
localStorage.setItem('visits',visits);
if(visits%5===0 && visits!=0) setTimeout(showFeedbackPopup,1000);

// ===== Profile Dropdown =====
function toggleProfileMenu(){
  const menu = document.getElementById('profileMenu');
  menu.style.display = (menu.style.display==='none'||menu.style.display==='')?'block':'none';
}
document.addEventListener('click', function(event){
  const userInfo = document.getElementById('userProfileDropdown');
  const profileMenu = document.getElementById('profileMenu');
  if(userInfo && profileMenu && !userInfo.contains(event.target) && !profileMenu.contains(event.target)){
    profileMenu.style.display='none';
  }
});
