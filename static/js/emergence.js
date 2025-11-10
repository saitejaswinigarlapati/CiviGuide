// Sidebar toggle
function toggleSidebar(){
  const sidebar = document.getElementById("mySidebar");
  sidebar.style.width = sidebar.style.width==="250px" ? "0" : "250px";
}

// Map setup
const map = L.map('map').setView([20.5937,78.9629],5);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);

let routingControl=null, serviceMarkers=[], userMarker=null;

// Icons
const serviceIcons={
  police:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/police-badge.png',iconSize:[32,32],iconAnchor:[16,32]}),
  hospital:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/hospital-room.png',iconSize:[32,32],iconAnchor:[16,32]}),
  fire_station:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/fire-station.png',iconSize:[32,32],iconAnchor:[16,32]}),
  pharmacy:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/pill.png',iconSize:[32,32],iconAnchor:[16,32]}),
  ambulance:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/ambulance.png',iconSize:[32,32],iconAnchor:[16,32]}),
  shelter:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/home.png',iconSize:[32,32],iconAnchor:[16,32]}),
  rescue:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/lifebuoy.png',iconSize:[32,32],iconAnchor:[16,32]}),
  user:L.icon({iconUrl:'https://img.icons8.com/color/48/000000/marker.png',iconSize:[32,32],iconAnchor:[16,32]})
};

// Clear previous markers and route
function clearMarkers(){
  serviceMarkers.forEach(m=>map.removeLayer(m));
  serviceMarkers=[];
  if(routingControl){ map.removeControl(routingControl); routingControl=null; }
  if(userMarker){ map.removeLayer(userMarker); userMarker=null; }
}

// Get coordinates from location name
async function getCoords(location){
  const res=await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
  const data=await res.json();
  if(data.length===0) throw new Error("Location not found: "+location);
  return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
}

// Fetch nearby services using Overpass API
async function fetchServices(lat, lon, type){
  let query='';
  if(type==='all'){
    query=`[out:json][timeout:25];(node(around:2000,${lat},${lon})[amenity~"police|hospital|fire_station|pharmacy|ambulance|shelter|rescue"];way(around:2000,${lat},${lon})[amenity~"police|hospital|fire_station|pharmacy|ambulance|shelter|rescue"];);out center tags;`;
  } else {
    query=`[out:json][timeout:25];(node(around:2000,${lat},${lon})[amenity=${type}];way(around:2000,${lat},${lon})[amenity=${type}];);out center tags;`;
  }
  const res=await fetch("https://overpass-api.de/api/interpreter",{method:'POST',headers:{'Content-Type':'text/plain'},body:query});
  const text=await res.text();
  let data;
  try{ data=JSON.parse(text); } catch(e){ return []; }
  return data.elements.map(el=>{
    if(el.type==='node') return {lat:el.lat, lon:el.lon, tags:el.tags||{}};
    if(el.type==='way' && el.center) return {lat:el.center.lat, lon:el.center.lon, tags:el.tags||{}};
    return null;
  }).filter(el=>el!==null);
}

// Add marker
function addMarker(lat, lon, name, contact, type){
  const icon=serviceIcons[type]||serviceIcons['police'];
  const m=L.marker([lat,lon],{icon}).addTo(map).bindPopup(`${name} - ${contact}`);
  serviceMarkers.push(m);
}

// Sample route coordinates
function sampleRouteCoordinates(routeCoordinates, step=5){
  const sampled=[];
  for(let i=0;i<routeCoordinates.length;i+=step) sampled.push(routeCoordinates[i]);
  return sampled;
}

// Show route and services
async function showRouteServices(){
  clearMarkers();
  const source=document.getElementById('source').value.trim();
  const destination=document.getElementById('destination').value.trim();
  const via=document.getElementById('via').value.trim();
  const serviceType=document.getElementById('serviceType').value;
  if(!source||!destination){ alert("Enter both source and destination"); return; }

  try{
    const srcCoords=await getCoords(source);
    const destCoords=await getCoords(destination);
    let waypoints=[L.latLng(srcCoords[0], srcCoords[1])];
    if(via){ const viaCoords=await getCoords(via); waypoints.push(L.latLng(viaCoords[0], viaCoords[1])); }
    waypoints.push(L.latLng(destCoords[0], destCoords[1]));

    routingControl=L.Routing.control({
      waypoints:waypoints,
      routeWhileDragging:false,
      show:false,
      createMarker:function(){ return null; }
    }).addTo(map);

    routingControl.on('routesfound', async function(e){
      const route=e.routes[0];
      const coords=route.coordinates.map(c=>[c.lat,c.lng]);
      const sampled=sampleRouteCoordinates(coords, Math.max(Math.floor(coords.length/15),1));
      for(const pt of sampled){
        const services=await fetchServices(pt[0],pt[1],serviceType);
        for(const s of services){
          const name=s.tags.name||"Unknown";
          const contact=s.tags.phone||s.tags.contact||"N/A";
          addMarker(s.lat,s.lon,name,contact,s.tags.amenity||serviceType);
        }
      }
      map.fitBounds(coords);
      document.getElementById('distanceBox').innerText=`Distance: ${(route.summary.totalDistance/1000).toFixed(2)} km | ETA: ${(route.summary.totalTime/60).toFixed(0)} min`;
    });

  } catch(err){ alert("Error: "+err.message); }
}

// Speech recognition for source/destination
const micBtn=document.getElementById('micButton');
const SpeechRecognition=window.SpeechRecognition || window.webkitSpeechRecognition;
if(SpeechRecognition){
  const recognition=new SpeechRecognition();
  recognition.continuous=false; recognition.lang='en-US';
  micBtn.onclick=()=>{ recognition.start(); }
  recognition.onresult=function(event){
    const text=event.results[0][0].transcript;
    if(!document.getElementById('source').value) document.getElementById('source').value=text;
    else document.getElementById('destination').value=text;
  }
}

// User location
if(navigator.geolocation){
  navigator.geolocation.getCurrentPosition(pos=>{
    const {latitude,longitude}=pos.coords;
    userMarker=L.marker([latitude,longitude],{icon:serviceIcons['user']}).addTo(map).bindPopup("You are here").openPopup();
    map.setView([latitude,longitude],13);
  });
}
