// -----------------------------------------------------
// HOSPITAL LIST
// -----------------------------------------------------
// Coordinates are examples.
// You can add, remove, or modify hospitals later.

const hospitals = [
  {
    name: "Royal Adelaide Hospital",
    lat: -34.9205,
    lon: 138.5871
  },
  {
    name: "Flinders Medical Centre",
    lat: -35.0214,
    lon: 138.5687
  },
  {
    name: "The Queen Elizabeth Hospital",
    lat: -34.8838,
    lon: 138.5330
  },
  {
    name: "Lyell McEwin Hospital",
    lat: -34.7497,
    lon: 138.6632
  },
  {
    name: "Modbury Hospital",
    lat: -34.8337,
    lon: 138.6921
  },
  {
    name: "Noarlunga Hospital",
    lat: -35.1427,
    lon: 138.4971
  },
  {
    name: "Mount Barker District Soldiers' Memorial Hospital",
    lat: -35.0645,
    lon: 138.8587
  },
  {
    name: "South Coast District Hospital",
    lat: -35.5565,
    lon: 138.6214
  }
];


// -----------------------------------------------------
// PAGE ELEMENTS
// -----------------------------------------------------

const locationButton = document.getElementById("locationButton");
const statusElement = document.getElementById("status");
const resultsElement = document.getElementById("results");
const accuracyElement = document.getElementById("accuracy");


// -----------------------------------------------------
// LOCATION BUTTON
// -----------------------------------------------------

locationButton.addEventListener("click", getLocation);


// -----------------------------------------------------
// GET CURRENT GPS LOCATION
// -----------------------------------------------------

function getLocation() {

  if (!navigator.geolocation) {
    statusElement.textContent =
      "Location services are not supported by this browser.";
    return;
  }

  locationButton.disabled = true;
  locationButton.textContent = "Getting location...";

  statusElement.textContent =
    "Obtaining current GPS location...";

  resultsElement.innerHTML = "";
  accuracyElement.textContent = "";

  navigator.geolocation.getCurrentPosition(
    locationSuccess,
    locationError,
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}


// -----------------------------------------------------
// SUCCESSFUL GPS LOCATION
// -----------------------------------------------------

function locationSuccess(position) {

  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  statusElement.textContent = "Location acquired.";

  accuracyElement.textContent =
    `GPS accuracy approximately ±${Math.round(accuracy)} metres`;

  calculateDistances(userLat, userLon);

  locationButton.disabled = false;
  locationButton.textContent = "Refresh Location";
}


// -----------------------------------------------------
// LOCATION ERROR
// -----------------------------------------------------

function locationError(error) {

  let message = "Unable to obtain your location.";

  if (error.code === error.PERMISSION_DENIED) {
    message =
      "Location permission was denied. Please allow location access in your browser settings.";
  }

  if (error.code === error.POSITION_UNAVAILABLE) {
    message =
      "Your current location could not be determined.";
  }

  if (error.code === error.TIMEOUT) {
    message =
      "Location request timed out. Please try again.";
  }

  statusElement.textContent = message;

  locationButton.disabled = false;
  locationButton.textContent = "Try Again";
}


// -----------------------------------------------------
// CALCULATE DISTANCE TO EVERY HOSPITAL
// -----------------------------------------------------

function calculateDistances(userLat, userLon) {

  const results = hospitals.map(hospital => {

    const distance = haversineDistance(
      userLat,
      userLon,
      hospital.lat,
      hospital.lon
    );

    return {
      ...hospital,
      distance: distance
    };

  });


  // Sort nearest to furthest
  results.sort((a, b) => a.distance - b.distance);


  // Display the five nearest hospitals
  displayResults(results.slice(0, 5));
}


// -----------------------------------------------------
// HAVERSINE DISTANCE FORMULA
// -----------------------------------------------------

function haversineDistance(lat1, lon1, lat2, lon2) {

  const earthRadiusKm = 6371;

  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(degreesToRadians(lat1)) *
    Math.cos(degreesToRadians(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);

  const c =
    2 * Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return earthRadiusKm * c;
}


// -----------------------------------------------------
// CONVERT DEGREES TO RADIANS
// -----------------------------------------------------

function degreesToRadians(degrees) {
  return degrees * (Math.PI / 180);
}


// -----------------------------------------------------
// DISPLAY RESULTS
// -----------------------------------------------------

function displayResults(results) {

  resultsElement.innerHTML = "";

  results.forEach((hospital, index) => {

    const hospitalElement =
      document.createElement("div");

    hospitalElement.className = "hospital";

    hospitalElement.innerHTML = `
      <div class="hospital-number">
        ${index + 1}
      </div>

      <div class="hospital-name">
        ${hospital.name}
      </div>

      <div class="hospital-distance">
        ${hospital.distance.toFixed(1)}
        <span>km</span>
      </div>
    `;

    resultsElement.appendChild(hospitalElement);

  });
}