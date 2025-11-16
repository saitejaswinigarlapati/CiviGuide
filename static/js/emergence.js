let map = L.map('map').setView([0, 0], 13);
let userMarker, routingControl;
let allServices = [];
let markers = [];
let voiceEnabled = true;

// --- Initialize Map ---
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data © OpenStreetMap contributors'
}).addTo(map);

// --- Geolocation ---
if (navigator.geolocation) {
  navigator.geolocation.getCurrentPosition(async pos => {
    const { latitude, longitude } = pos.coords;
    map.setView([latitude, longitude], 13);
    userMarker = L.marker([latitude, longitude]).addTo(map)
      .bindPopup("📍 You are here").openPopup();
    await loadNearbyServices(latitude, longitude);
  }, () => alert("⚠️ Please enable location access."));
} else {
  alert("❌ Geolocation not supported in this browser.");
}

// --- Load nearby services ---
async function loadNearbyServices(lat, lon) {
  const types = [
    { key: 'hospital', icon: 'red' },
    { key: 'police', icon: 'blue' },
    { key: 'fire_station', icon: 'orange' }
  ];

  allServices = [];
  document.getElementById('services').innerHTML = `<p>Loading nearby services...</p>`;

  for (let t of types) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${t.key}&limit=8&bounded=1&viewbox=${lon - 0.03},${lat + 0.03},${lon + 0.03},${lat - 0.03}`;
    const res = await axios.get(url);
    const data = res.data.map(s => ({
      id: s.place_id,
      name: s.display_name.split(',')[0],
      type: t.key,
      lat: parseFloat(s.lat),
      lon: parseFloat(s.lon),
      address: s.display_name,
      distance: getDistance(lat, lon, s.lat, s.lon).toFixed(2) + " km"
    }));
    allServices.push(...data);
  }

  renderServices(allServices);
  loadMarkers(allServices);
}

// --- Haversine Distance ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
}

// --- Render Services ---
function renderServices(list) {
  const container = document.getElementById('services');
  container.innerHTML = '';
  if (!list.length) return container.innerHTML = `<p>No services found.</p>`;
  list.forEach(s => {
    const colorClass = s.type === "hospital" ? "hospital" : s.type === "police" ? "police" : "fire";
    container.innerHTML += `
      <div class="service-card ${colorClass}">
        <h4>${s.type === 'hospital' ? '🏥' : s.type === 'police' ? '👮‍♂️' : '🚒'} ${s.name}</h4>
        <p><b>Type:</b> ${s.type}</p>
        <p><b>Address:</b> ${s.address}</p>
        <p><b>Distance:</b> ${s.distance || ''}</p>
        <button onclick="showOnMapByCoords(${s.lat}, ${s.lon})">Show on Map</button>
      </div>`;
  });
}

// --- Map Markers ---
function loadMarkers(list) {
  markers.forEach(m => map.removeLayer(m));
  markers = [];

  list.forEach(s => {
    const color = s.type === "hospital" ? "red" : s.type === "police" ? "blue" : "orange";
    const marker = L.circleMarker([s.lat, s.lon], { radius: 8, color, fillOpacity: 0.9 }).addTo(map);
    marker.bindPopup(`<b>${s.name}</b><br>${s.address || s.type}`);
    markers.push(marker);
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.1));
  }
}

// --- Filter Services ---
function filterServices(type) {
  if (type === 'all') {
    renderServices(allServices);
    loadMarkers(allServices);
  } else {
    const filtered = allServices.filter(s => s.type === type);
    renderServices(filtered);
    loadMarkers(filtered);
  }
}

// --- Show Route from User to Service ---
async function showOnMapByCoords(lat, lon) {
  if (!userMarker) {
    alert("User location not available!");
    return;
  }

  const userLatLng = userMarker.getLatLng();
  const destLatLng = L.latLng(lat, lon);

  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [userLatLng, destLatLng],
    routeWhileDragging: false,
    addWaypoints: false,
    show: false
  }).addTo(map);

  routingControl.on('routesfound', function(e) {
    const route = e.routes[0];
    const instructions = route.instructions.map(inst => `<li>${inst.text}</li>`).join('');
    document.getElementById('directions-content').innerHTML = `<ol>${instructions}</ol>`;

    if (voiceEnabled) {
      route.instructions.forEach((inst, i) => speakInstruction(inst.text, i * 1000));
    }
  });

  routingControl.on('routeselected', function() {
    const bounds = L.latLngBounds([userLatLng, destLatLng]);
    map.fitBounds(bounds.pad(0.2));
  });
}

// --- Voice ---
function speakInstruction(text, delay = 0) {
  setTimeout(() => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'en-US';
    utter.rate = 1.1;
    speechSynthesis.speak(utter);
  }, delay);
}

function toggleVoice() {
  voiceEnabled = !voiceEnabled;
  document.getElementById('toggle-voice').innerText = voiceEnabled ? "🔊 Voice: On" : "🔇 Voice: Off";
  if (!voiceEnabled) speechSynthesis.cancel();
}

// --- Search Destination ---
async function searchDestination() {
  const query = document.getElementById('destination').value;
  if (!query) return alert("Enter a location!");

  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
  const data = await res.json();
  if (!data.length) return alert("Location not found!");

  const lat = parseFloat(data[0].lat);
  const lon = parseFloat(data[0].lon);

  map.setView([lat, lon], 14);
  await loadNearbyServices(lat, lon);
}
