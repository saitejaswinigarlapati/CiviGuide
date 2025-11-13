let map = L.map('map').setView([0, 0], 13);
let userMarker, routingControl;
let allServices = [];
let markers = [];
let voiceEnabled = true;

// --- Init map ---
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

// --- Haversine distance ---
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180, dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// --- Render service cards ---
function renderServices(list) {
  const container = document.getElementById('services');
  container.innerHTML = '';
  if (!list.length) return container.innerHTML = `<p>No services found.</p>`;
  list.forEach((s, idx) => {
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

// --- Map markers ---
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

// --- Filter by type ---
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

// --- Show single service marker ---
function showOnMapByCoords(lat, lon) {
  if (routingControl) map.removeControl(routingControl);
  const marker = L.marker([lat, lon]).addTo(map);
  map.setView([lat, lon], 14);
}

// --- Voice synthesis ---
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

// --- Geocoding ---
async function geocode(location) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
  const data = await res.json();
  return data.length ? [parseFloat(data[0].lat), parseFloat(data[0].lon)] : null;
}

// --- Find route ---
async function findRoute() {
  const source = document.getElementById('source').value;
  const dest = document.getElementById('destination').value;

  const startCoords = await geocode(source);
  const endCoords = await geocode(dest);

  if (!startCoords || !endCoords) {
    alert("Could not find locations!");
    return;
  }

  if (routingControl) map.removeControl(routingControl);

  routingControl = L.Routing.control({
    waypoints: [
      L.latLng(startCoords[0], startCoords[1]),
      L.latLng(endCoords[0], endCoords[1])
    ],
    routeWhileDragging: false,
    addWaypoints: false
  }).addTo(map);

  routingControl.on('routesfound', function (e) {
    fetchServicesAlongRoute();
  });
}

// --- Fetch services along route ---
async function fetchServicesAlongRoute() {
  if (!routingControl || !routingControl._routes) return;

  const routeCoords = routingControl._routes[0].coordinates;
  const sampledPoints = [];
  const step = Math.max(1, Math.floor(routeCoords.length / 20)); // ~20 points along route
  for (let i = 0; i < routeCoords.length; i += step) sampledPoints.push(routeCoords[i]);

  const servicesAlongRoute = [];

  for (let p of sampledPoints) {
    const lat = p.lat;
    const lon = p.lng;

    const query = `
      [out:json];
      (
        node["amenity"="hospital"](around:1000,${lat},${lon});
        node["amenity"="police"](around:1000,${lat},${lon});
        node["amenity"="fire_station"](around:1000,${lat},${lon});
      );
      out;
    `;

    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', { method: 'POST', body: query });
      const data = await res.json();
      data.elements.forEach(el => {
        if (!servicesAlongRoute.some(s => s.id === el.id)) {
          servicesAlongRoute.push({
            id: el.id,
            name: el.tags.name || 'Unknown',
            type: el.tags.amenity,
            lat: el.lat,
            lon: el.lon,
            address: el.tags.address || ''
          });
        }
      });
    } catch (err) {
      console.error("Overpass error:", err);
    }
  }

  allServices = servicesAlongRoute;
  renderServices(allServices);
  loadMarkers(allServices);
}
