// Sidebar toggle
function toggleSidebar(){
  const sidebar = document.getElementById("mySidebar");
  sidebar.style.width = (sidebar.style.width === "260px") ? "0" : "260px";
}

// Initialize map
var map = L.map('map').setView([20.5937,78.9629],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom:19 }).addTo(map);

// India bounds
var indiaBounds = { north:37.1, south:6.7, west:68.1, east:97.4 };
var userMarker = null, alertShown = false;

// Check if user crosses border
function checkBorder(lat,lng){
  if(lat<indiaBounds.south || lat>indiaBounds.north || lng<indiaBounds.west || lng>indiaBounds.east){
    if(!alertShown){ alert("⚠️ You are crossing our national border!"); alertShown=true; }
  } else { alertShown=false; }
}

// Geolocation success
function geoSuccess(pos){
  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  checkBorder(lat,lng);

  if(!userMarker){
    userMarker = L.circle([lat,lng],{ radius:50,color:'red',fillColor:'red',fillOpacity:0.5 }).addTo(map);
    map.setView([lat,lng],10);
  } else {
    userMarker.setLatLng([lat,lng]);
    map.panTo([lat,lng]);
  }
}

// Geolocation error
function geoError(err){
  alert("Error fetching location. Please enable GPS/location services.");
}

// Watch user location
if(navigator.geolocation){
  navigator.geolocation.watchPosition(geoSuccess,geoError,{ enableHighAccuracy:true, maximumAge:0, timeout:20000 });
} else {
  alert("Geolocation not supported.");
}
