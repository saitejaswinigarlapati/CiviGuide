// Sidebar toggle
function toggleSidebar() {
  const sidebar = document.getElementById("mySidebar");
  sidebar.style.width = (sidebar.style.width === "260px") ? "0" : "260px";
}

// Initialize map
var map = L.map('map').setView([22.57, 88.36], 6);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Get coordinates from URL params
const params = new URLSearchParams(window.location.search);
const srcLat = parseFloat(params.get("srcLat"));
const srcLng = parseFloat(params.get("srcLng"));
const destLat = parseFloat(params.get("destLat"));
const destLng = parseFloat(params.get("destLng"));

if (!srcLat || !srcLng || !destLat || !destLng) {
  alert("Coordinates missing! Go back and try again.");
}

// Predefined alternate routes
const routes = [
  [ [srcLat, srcLng], [destLat, destLng] ],
  [ [srcLat, srcLng], [21.5, 87.0], [destLat, destLng] ],
  [ [srcLat, srcLng], [21.0, 85.0], [destLat, destLng] ]
];

// Render routes
routes.forEach(route => {
  L.Routing.control({
    waypoints: route.map(r => L.latLng(r[0], r[1])),
    lineOptions: { styles: [{color: "#ff9800", opacity: 0.6, weight: 6}] },
    createMarker: function() { return null; },
    addWaypoints: false,
    routeWhileDragging: false,
    collapsible: true
  }).addTo(map);
});
