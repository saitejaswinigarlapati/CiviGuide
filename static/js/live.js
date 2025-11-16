// Map initialization
const map = L.map('map').setView([20.5937, 78.9629], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19
}).addTo(map);

let routingControl = null;
let userMarker = null;

// Sample Disaster Zones (latitude, longitude, radius in meters)
const disasterZones = [
    {lat: 28.6139, lng: 77.2090, radius: 5000, type: 'Flood'},
    {lat: 19.0760, lng: 72.8777, radius: 4000, type: 'Fire'},
    {lat: 13.0827, lng: 80.2707, radius: 3000, type: 'Flood'}
];

// Add disaster zone markers
disasterZones.forEach(zone => {
    const circle = L.circle([zone.lat, zone.lng], {
        color: zone.type.toLowerCase() === 'flood' ? 'blue' : 'red',
        fillColor: zone.type.toLowerCase() === 'flood' ? '#3399ff' : '#f03',
        fillOpacity: 0.5,
        radius: zone.radius
    }).addTo(map);

    circle.bindPopup(`⚠️ ${zone.type} Zone`);
});

// Sidebar toggle
function toggleSidebar() {
    const sidebar = document.getElementById('mySidebar');
    const content = document.querySelector('.content-container');
    sidebar.classList.toggle('active');
    content.classList.toggle('active');

    // Redraw map after sidebar toggle
    if (typeof map !== 'undefined') {
        setTimeout(() => {
            map.invalidateSize();
        }, 300);
    }
}

// Geocode function using Nominatim
async function geocode(location) {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
    const data = await res.json();
    if (!data.length) throw new Error(`Location not found: ${location}`);
    return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Find route from source to destination
async function findRoute() {
    const sourceInput = document.getElementById('source').value.trim();
    const destInput = document.getElementById('destination').value.trim();

    if (!sourceInput || !destInput) {
        alert('Please enter both source and destination.');
        return;
    }

    try {
        const srcCoords = await geocode(sourceInput);
        const destCoords = await geocode(destInput);

        // Remove existing route
        if (routingControl) {
            map.removeControl(routingControl);
        }

        routingControl = L.Routing.control({
            waypoints: [
                L.latLng(srcCoords[0], srcCoords[1]),
                L.latLng(destCoords[0], destCoords[1])
            ],
            lineOptions: {
                styles: [{ color: '#ff9800', opacity: 0.7, weight: 6 }]
            },
            createMarker: function(i, wp) {
                return L.marker(wp.latLng).bindPopup(i === 0 ? 'Source' : 'Destination');
            },
            routeWhileDragging: false,
            collapsible: true
        }).addTo(map);

        // Fit map to route
        map.fitBounds([srcCoords, destCoords]);

        // Check if route intersects flood zone
        routingControl.on('routesfound', function(e) {
            const route = e.routes[0];
            const routePoints = route.coordinates.map(c => [c.lat, c.lng]);
            let intersectsFlood = false;

            routePoints.forEach(pt => {
                disasterZones.forEach(zone => {
                    if (zone.type.toLowerCase() === 'flood') {
                        const distance = map.distance(pt, [zone.lat, zone.lng]);
                        if (distance < zone.radius) intersectsFlood = true;
                    }
                });
            });

            if (intersectsFlood) {
                // Show popup asking for alternative route
                if (confirm("⚠️ The planned route passes through a flood area. Do you want an alternative route?")) {
                    // Redirect to alternate route page
                    window.location.href = `{{ url_for('alternate') }}?source=${encodeURIComponent(sourceInput)}&destination=${encodeURIComponent(destInput)}`;
                }
            }
        });

    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// Microphone input
const micBtn = document.getElementById('micButton');
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';

    if (micBtn) {
        micBtn.onclick = () => recognition.start();
    }

    recognition.onresult = function (event) {
        const text = event.results[0][0].transcript;
        const srcInput = document.getElementById('source');
        const destInput = document.getElementById('destination');

        if (!srcInput.value) srcInput.value = text;
        else destInput.value = text;
    };
}

// User geolocation
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        userMarker = L.marker([lat, lng]).addTo(map).bindPopup('You are here').openPopup();
        map.setView([lat, lng], 10);

        // Check if inside disaster zone
        disasterZones.forEach(zone => {
            const distance = map.distance([lat, lng], [zone.lat, zone.lng]);
            if (distance < zone.radius) {
                alert(`⚠️ You are currently in a ${zone.type} zone!`);
            }
        });

    }, err => {
        console.warn('Geolocation error:', err.message);
    }, { enableHighAccuracy: true });
} else {
    alert('Geolocation not supported by this browser.');
}
