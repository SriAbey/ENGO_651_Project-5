// OpenWeatherMap API Key
const OPENWEATHERMAP_API_KEY = "a19fcc4c24cf6450b86f7e2b3b2bcaec";

let selectedLocation = null;

// MQTT Variables
var marker = {};
var connected_flag = 0;
var mqtt;
var reconnectTimeout = 2000;
var host = "test.mosquitto.org";
var port = 8081;

// Initialize map
var map = L.map('map').setView([51.0447, -114.0719], 12);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

function onConnect() {
  document.getElementById("status").innerHTML = "Status: Connected";
  document.getElementById("status").className = "status connected";
  // Show single connection message
  document.getElementById("connection-message").innerHTML = "Connected to: " + host + " on Port: " + port;
  connected_flag = 1;
  console.log("on Connect " + connected_flag);
}

function MQTTconnect() {
  document.getElementById("connection-message").innerHTML = "";
  var s = document.forms["connform"]["server"].value;
  var p = document.forms["connform"]["port"].value;
  
  if (p != "") {
    port = parseInt(p);
  }
  if (s != "") {
    host = s;
  }
  
  console.log("connecting to " + host + " " + port);
  
  var x = Math.floor(Math.random() * 10000); 
  var cname = "orderform-" + x;
  mqtt = new Paho.MQTT.Client(host, port, cname);
  
  var options = {
    timeout: 10,
    onSuccess: onConnect,
    onFailure: onFailure,
    useSSL: false  // Explicitly set SSL to false for non-secure connection
  };
  
  mqtt.onConnectionLost = onConnectionLost;
  mqtt.onMessageArrived = onMessageArrived;
  
  try {
    mqtt.connect(options);
  } catch (e) {
    document.getElementById("connection-message").innerHTML = "Connection Error: " + e.message;
    console.error("connection error:", e);
  }
  
  return false;
}

// Disconnect from MQTT broker
function MQTTdisconnect() {
  if (mqtt && connected_flag) {
    mqtt.disconnect();
    document.getElementById("status").innerHTML = "Status: Disconnected";
    document.getElementById("status").className = "status";
    document.getElementById("connection-message").innerHTML = "Disconnected Successfully";
    connected_flag = 0;
  }
}

// MQTT Functions
function onConnectionLost() {
  if (connected_flag) {  // Only show if we were previously connected
    console.log("connection lost");
    document.getElementById("status").innerHTML = "Status: Disconnected";
    document.getElementById("status").className = "status";
    document.getElementById("connection-message").innerHTML = "Connection Lost";
    connected_flag = 0;
  }
}

function onFailure(message) {
  console.log("Failed");
  document.getElementById("messages").innerHTML = "Connection Failed- Retrying";
  setTimeout(MQTTconnect, reconnectTimeout);
}

// Update the sub_topics function
function sub_topics() {
  document.getElementById("subscribe-error").innerHTML = "";
  if (connected_flag == 0) {
    document.getElementById("subscribe-error").innerHTML = "Not Connected - Can't Subscribe";
    return false;
  }
  var stopic = document.forms["subs"]["Stopic"].value;
  console.log("Subscribing to Topic: =" + stopic);
  mqtt.subscribe(stopic);
  return false;
}

function send_message() {
  const msgInput = document.forms["smessage"]["message"];
  const topicInput = document.forms["smessage"]["Ptopic"];
  
  // Clear previous messages
  document.getElementById("publish-error").innerHTML = "";
  document.getElementById("publish-message").innerHTML = "";

  if (!connected_flag) {
    document.getElementById("publish-error").innerHTML = "Not connected - Cannot Publish";
    return false;
  }

  const message = msgInput.value;
  const topic = topicInput.value || "ENGO-651/SRTPA/my_temperature";

  if (!message.trim()) {
    document.getElementById("publish-error").innerHTML = "Message Cannot be Empty";
    return false;
  }

  try {
    const mqttMessage = new Paho.MQTT.Message(message);
    mqttMessage.destinationName = topic;
    mqttMessage.qos = 1; // Changed to QoS 1 for better reliability
    mqttMessage.retained = false;
    
    mqtt.send(mqttMessage);
    
    console.log(`Published to ${topic}: ${message}`);
    document.getElementById("publish-message").innerHTML = 
      `✓ Published to ${topic}: "${message}"`;
    
    // Clear input after successful publish
    msgInput.value = "";
    
  } catch (error) {
    console.error("publish error:", error);
    document.getElementById("publish-error").innerHTML = 
      `Publish Failed: ${error.message}`;
  }
  return false;
}

function onMessageArrived(r_message) {
  console.log("message arrived:", {
    topic: r_message.destinationName,
    payload: r_message.payloadString,
    qos: r_message.qos,
    retained: r_message.retained
  });
  out_msg = "Message Received: " + r_message.payloadString + "<br>";
  out_msg = out_msg + "Message Received Topic: " + r_message.destinationName;
  var out_topic = r_message.destinationName;
  console.log(out_msg);
  
  // Show publish message under publish button
  document.getElementById("publish-message").innerHTML = out_msg;
  
  if (out_topic == "ENGO-651/SRTPA/my_temperature") {
    new_loc = JSON.parse(r_message.payloadString);
    var lat = new_loc.Lat;
    var long = new_loc.Long;
    var temp = new_loc.Temperature;
    map.removeLayer(marker);
    console.log(lat, long, temp);
    if (temp >= -40 && temp < 10) {
      var blueIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      marker = L.marker([lat, long], {icon: blueIcon}).addTo(map);
    }
    else if (temp >= 10 && temp < 30) {
      var greenIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      marker = L.marker([lat, long], {icon: greenIcon}).addTo(map);
    }
    else {
      var redIcon = new L.Icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      marker = L.marker([lat, long], {icon: redIcon}).addTo(map);
    }
    marker.bindPopup(`Latitude: ${lat} °<br> Longitude: ${long} °<br> Temperature: ${temp} °C`);
  }
}

// Location Functions
async function geoFindMe() {
  document.getElementById("share-status-message").innerHTML = "";
  document.getElementById("share-status-message").className = "share-message";

  if (connected_flag == 0) {
    document.getElementById("share-status-message").innerHTML = "Not Connected - Can't Share";
    document.getElementById("share-status-message").className = "share-message share-error";
    return false;
  }

  try {
    const position = await new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
    
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    
    // Fetch weather data
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`);
    const data = await response.json();
    
    if (data.cod !== 200) {
      throw new Error(data.message || "Failed to Fetch Weather Data");
    }
    
    const temp = data.main.temp;
    const weather = data.weather[0].description;
    
    // Update UI
    const now = new Date();
    const locationInfo = `
      <p><strong>Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
      <p><strong>Date & Time:</strong> ${now.toLocaleString()}</p>
      <p><strong>Temperature:</strong> ${temp}°C</p>
      <p><strong>Weather:</strong> ${weather}</p>
    `;
    document.getElementById("location-info").innerHTML = locationInfo;
    
    // Send MQTT message
    /* const info = JSON.stringify({
      Lat: lat,
      Long: lng,
      Temperature: temp,
      Weather: weather
    }); */

    const payload = {
      Lat: lat,
      Long: lng,
      Temperature: temp,
      Weather: weather
    };
    console.log("Publishing Current Location:", payload);
    const info = JSON.stringify(payload);
    
    /* const message = new Paho.MQTT.Message(info);
    message.destinationName = "ENGO-651/SRTPA/my_temperature";
    console.log("Connection status:", connected_flag);
    console.log("Sending to topic:", message.destinationName);
    console.log("Message payload:", info);
    mqtt.send(message); */

    const message = new Paho.MQTT.Message(info);
    message.destinationName = "ENGO-651/SRTPA/my_temperature";
    message.qos = 1; // Add this line
    message.retained = false; // Add this line
    console.log("Connection status:", connected_flag);
    console.log("Sending to topic:", message.destinationName);
    console.log("Message payload:", info);
    mqtt.send(message);

    // Update map and show success
    updateMapMarker(lat, lng, temp);
    document.getElementById("share-status-message").innerHTML = "Location and Weather Data Shared Successfully";
    document.getElementById("share-status-message").className = "share-message share-success";
    
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("share-status-message").innerHTML = `Error: ${error.message}`;
    document.getElementById("share-status-message").className = "share-message share-error";
  }
}

// Event Listeners
document.querySelector('#find-me').addEventListener('click', geoFindMe);

function updateMapMarker(lat, lng, temp) {
  map.removeLayer(marker);
  
  let iconColor;
  if (temp < 10) iconColor = 'blue';
  else if (temp < 30) iconColor = 'green';
  else iconColor = 'red';
  
  const customIcon = new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${iconColor}.png`,
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });
  
  marker = L.marker([lat, lng], {icon: customIcon}).addTo(map);
  marker.bindPopup(`
    <b>Location:</b> ${lat.toFixed(4)}, ${lng.toFixed(4)}<br>
    <b>Temperature:</b> ${temp}°C
  `);
  
  map.setView([lat, lng], 15);
}

// Allow clicking on map to select location
map.on('click', function(e) {
  if (connected_flag == 0) {
    document.getElementById("messages").innerHTML = "Please Connect to MQTT Broker First";
    return;
  }
  
  var lat = e.latlng.lat;
  var lng = e.latlng.lng;
  
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=8ad7c4064aba4bef601b02451ee208d4`)
  .then((response) => {
    return response.json()
  })
  .then((data) => {
    var temp = data.main.temp;
    var weather = data.weather[0].description;
    // var info = `{"Lat": "${lat}", "Long": "${lng}", "Temperature": "${temp}"}`;
    var payload = {
      Lat: lat,
      Long: lng,
      Temperature: temp
    };
    console.log("Publishing location:", payload);
    var info = JSON.stringify(payload);

    var my_topic = "ENGO-651/SRTPA/my_temperature";
    
    // Update location info display
    var now = new Date();
    var dateTime = now.toLocaleString();
    var locationInfo = `
      <p><strong>Temperature:</strong> ${temp}°C</p>
      <p><strong>Weather:</strong> ${weather}</p>
      <p><strong>Location:</strong> ${lat}, ${lng}</p>
      <p><strong>Date & Time:</strong> ${dateTime}</p>
    `;
    document.getElementById("location-info").innerHTML = locationInfo;

    // Send MQTT message
    /* message = new Paho.MQTT.Message(info);
    message.destinationName = my_topic;
    console.log("Connection status:", connected_flag);
    console.log("Sending to topic:", message.destinationName);
    console.log("Message payload:", info);
    mqtt.send(message);*/

    message = new Paho.MQTT.Message(info);
    message.destinationName = my_topic;
    message.qos = 1; // Add this line
    message.retained = false; // Add this line
    console.log("Connection status:", connected_flag);
    console.log("Sending to topic:", message.destinationName);
    console.log("Message payload:", info);
    mqtt.send(message);

    // Update map marker
    updateMapMarker(lat, lng, temp);
  });
});

map.on('click', async function(e) {
  selectedLocation = e.latlng;
  const lat = selectedLocation.lat;
  const lng = selectedLocation.lng;
  
  try {
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`);
    const data = await response.json();
    
    if (data.cod !== 200) throw new Error(data.message || "Failed to fetch weather data");
    
    const temp = data.main.temp;
    const weather = data.weather[0].description;
    
    const now = new Date();
    document.getElementById("location-info").innerHTML = `
      <p><strong>Selected Location:</strong> ${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
      <p><strong>Temperature:</strong> ${temp}°C</p>
      <p><strong>Weather:</strong> ${weather}</p>

    `;
    
    updateMapMarker(lat, lng, temp);
    
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("share-status-message").innerHTML = `Error: ${error.message}`;
    document.getElementById("share-status-message").className = "share-message share-error";
  }
});

document.getElementById('share-selected').addEventListener('click', async function() {
  if (!connected_flag) {
    document.getElementById("share-status-message").innerHTML = "Not Connected - Can't Share";
    document.getElementById("share-status-message").className = "share-message share-error";
    return;
  }
  
  if (!selectedLocation) {
    document.getElementById("share-status-message").innerHTML = "Please select a location on the Map First";
    document.getElementById("share-status-message").className = "share-message share-error";
    return;
  }
  
  try {
    const lat = selectedLocation.lat;
    const lng = selectedLocation.lng;
    
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&units=metric&appid=${OPENWEATHERMAP_API_KEY}`);
    const data = await response.json();
    
    if (data.cod !== 200) throw new Error(data.message || "Failed to Fetch Weather Data");
    
    const temp = data.main.temp;
    const weather = data.weather[0].description;
    
    /* const info = JSON.stringify({
      Lat: lat,
      Long: lng,
      Temperature: temp,
      Weather: weather
    });*/

    const payload = {
      Lat: lat,
      Long: lng,
      Temperature: temp,
      Weather: weather
    };
    console.log("Publishing Selected Location:", payload);
    const info = JSON.stringify(payload);
    
    /* const message = new Paho.MQTT.Message(info);
    message.destinationName = "ENGO-651/SRTPA/my_temperature";
    console.log("Connection status:", connected_flag);
    console.log("Sending to topic:", message.destinationName);
    console.log("Message payload:", info);
    mqtt.send(message); */

    const message = new Paho.MQTT.Message(info);
    message.destinationName = "ENGO-651/SRTPA/my_temperature";
    message.qos = 1; // Add this line
    message.retained = false; // Add this line
    console.log("Connection status:", connected_flag);
    console.log("Sending to topic:", message.destinationName);
    console.log("Message payload:", info);
    mqtt.send(message);
    
    document.getElementById("share-status-message").innerHTML = "Selected Location Shared Successfully";
    document.getElementById("share-status-message").className = "share-message share-success";
    
  } catch (error) {
    console.error("Error:", error);
    document.getElementById("share-status-message").innerHTML = `Error: ${error.message}`;
    document.getElementById("share-status-message").className = "share-message share-error";
  }
});