// --- Sidebar toggle ---
function toggleSidebar() {
    const sidebar = document.getElementById("mySidebar");
    sidebar.style.width = (sidebar.style.width === "260px") ? "0" : "260px";
}

// --- Initialize Map ---
var map = L.map('map').setView([20.5937, 78.9629], 5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

// --- Variables ---
var userMarker = null;
var indiaLayer = null;
var alertShown = false;

// --- Load India GeoJSON ---
fetch("/static/geojson/india.geojson")
  .then(res => res.json())
  .then(data => {
    // Add India polygon layer
    indiaLayer = L.geoJSON(data, {
        style: { color: "red", weight: 2, fillOpacity: 0.1 }
    }).addTo(map);
    map.fitBounds(indiaLayer.getBounds());

    // --- Create hover-only border layer ---
    let borderLines = [];

    data.features.forEach(feature => {
        if (feature.geometry.type === "Polygon") {
            borderLines.push(turf.polygonToLine(feature));
        } else if (feature.geometry.type === "MultiPolygon") {
            feature.geometry.coordinates.forEach(coords => {
                borderLines.push(turf.polygonToLine({ type: "Polygon", coordinates: coords }));
            });
        }
    });

    // Add border lines as transparent Leaflet layers for hover
    // --- Create border lines layer with click alert ---
borderLines.forEach(line => {
    L.geoJSON(line, {
        style: { color: "red", weight: 5, opacity: 0 },
        onEachFeature: function(feature, layer) {
            layer.on('click', function() {
                alert("⚠️ ALERT: You clicked near India's national border!");
            });
        }
    }).addTo(map);
});


  })
  .catch(err => console.error("Error loading India GeoJSON:", err));

// --- Check if user is inside India ---
function isInsideIndia(lat, lng) {
    if (!indiaLayer) return true;
    let point = turf.point([lng, lat]);
    return turf.booleanPointInPolygon(point, indiaLayer.toGeoJSON().features[0]);
}

// --- Geolocation-based border alert ---
function checkBorder(lat, lng) {
    const inside = isInsideIndia(lat, lng);
    if (!inside && !alertShown) {
        alert("⚠️ ALERT: You are crossing India's national border!");
        alertShown = true;
    }
    if (inside) alertShown = false;
}

// --- Geolocation success ---
function geoSuccess(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;

    checkBorder(lat, lng);

    if (!userMarker) {
        userMarker = L.circle([lat, lng], { radius: 80, color: "blue", fillColor: "blue", fillOpacity: 0.4 }).addTo(map);
        map.setView([lat, lng], 10);
    } else {
        userMarker.setLatLng([lat, lng]);
        map.panTo([lat, lng]);
    }
}

// --- Geolocation error ---
function geoError(err) {
    alert("Error fetching location. Please enable GPS/location services.");
}

// --- Watch user location ---
if (navigator.geolocation) {
    navigator.geolocation.watchPosition(geoSuccess, geoError, { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 });
} else {
    alert("Geolocation not supported.");
}
