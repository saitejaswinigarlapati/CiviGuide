// Splash and main
setTimeout(() => {
  document.getElementById("splash").style.display="none";
  document.getElementById("main").style.display="flex";
  initMap();
},1500);

// Sidebar toggle
function toggleSidebar(){
  const sidebar=document.getElementById("mySidebar");
  sidebar.style.width=sidebar.style.width==="250px"?"0":"250px";
}

// Map & routing
function initMap(){
  var map=L.map('map').setView([22.0,78.0],5);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19}).addTo(map);
  let routingControl=null, routeInstructions=[], currentStepIndex=0;

  window.searchRoute=function(){
    const src=document.getElementById('source').value.trim(),
          dest=document.getElementById('destination').value.trim();
    if(!src||!dest){alert("Enter both source and destination"); return;}
    const nominatimURL=place=>`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
    Promise.all([fetch(nominatimURL(src)).then(r=>r.json()), fetch(nominatimURL(dest)).then(r=>r.json())])
    .then(([srcData,destData])=>{
      if(!srcData.length){alert("Source not found"); return;}
      if(!destData.length){alert("Destination not found"); return;}
      const srcLatLng=L.latLng(srcData[0].lat,srcData[0].lon),
            destLatLng=L.latLng(destData[0].lat,destData[0].lon);
      if(routingControl) map.removeControl(routingControl);
      routingControl=L.Routing.control({
        waypoints:[srcLatLng,destLatLng],
        lineOptions:{styles:[{color:'red',opacity:0.8,weight:5}]},
        router:L.Routing.osrmv1({serviceUrl:'https://router.project-osrm.org/route/v1'}),
        show:true
      }).addTo(map);
      routingControl.on('routesfound', e=>{
        const route=e.routes[0];
        document.getElementById('distanceBox').innerText=`Distance: ${(route.summary.totalDistance/1000).toFixed(2)} km | ETA: ${Math.round(route.summary.totalTime/60)} min`;
        routeInstructions=route.instructions;
        currentStepIndex=0;
      });
    });
  };
  document.getElementById('searchBtn').onclick=searchRoute;

  window.reverseLocations=function(){
    let s=document.getElementById('source'), d=document.getElementById('destination');
    [s.value,d.value]=[d.value,s.value];
  };

  document.getElementById('micButton').onclick=function(){
    if(routeInstructions.length===0){alert("No route loaded."); return;}
    currentStepIndex=0; speak("Starting navigation. Follow the instructions.");
    let interval=setInterval(()=>{
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
    let utter=new SpeechSynthesisUtterance(text);
    utter.lang='en-US';
    window.speechSynthesis.speak(utter);
  }
}

// Feedback stars
function highlightStars(num){
  const stars=document.querySelectorAll('#stars .star');
  stars.forEach((s,idx)=>{ s.classList.toggle('yellow', idx<num); });
}

const stars=document.querySelectorAll('#stars .star');
stars.forEach((star,idx)=>{
  star.addEventListener('mouseover',()=>{
    stars.forEach((s,i)=>s.classList.toggle('hovered', i<=idx));
  });
  star.addEventListener('mouseout',()=>{
    stars.forEach(s=>s.classList.remove('hovered'));
  });
});

// Feedback popup
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
function submitFeedback(){
  closeFeedback(); 
  alert("Thanks for your feedback!");
}

// Visit count logic
let visits=localStorage.getItem('visits')||0;
visits++;
localStorage.setItem('visits',visits);
if(visits%5===0 && visits!=0){ setTimeout(showFeedbackPopup,1000); }
