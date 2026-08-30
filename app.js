// -----------------------------------------------------
// CLOUDFLARE WORKER
// -----------------------------------------------------

const WORKER_URL =
  "https://hospital-distance-api.christopherrobinsullivan.workers.dev";


// -----------------------------------------------------
// HOSPITAL LIST
// -----------------------------------------------------

const hospitals = [
  {
    name: "Royal Adelaide Hospital",
    lat: -34.92061,
    lon: 138.58618
  },
  {
    name: "The Queen Elizabeth Hospital",
    lat: -34.88384,
    lon: 138.53364
  },
  {
    name: "Flinders Medical Centre",
    lat: -35.02158,
    lon: 138.56925
  },
  {
    name: "Noarlunga Hospital",
    lat: -35.14032,
    lon: 138.50073
  },
  {
    name: "Lyell McEwin Hospital",
    lat: -34.74781,
    lon: 138.66511
  },
  {
    name: "Modbury Hospital",
    lat: -34.83420,
    lon: 138.69051
  },
  {
    name: "Women's and Children's Hospital",
    lat: -34.91152,
    lon: 138.60001
  },
  {
    name: "Mount Barker District Soldiers' Memorial Hospital",
    lat: -35.08213,
    lon: 138.87012
  },
  {
    name: "Murray Bridge Soldiers' Memorial Hospital",
    lat: -35.12860,
    lon: 139.27916
  },
  {
    name: "South Coast District Hospital - Victor Harbor",
    lat: -35.56147,
    lon: 138.60681
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

async function locationSuccess(position) {

  const userLat = position.coords.latitude;
  const userLon = position.coords.longitude;
  const accuracy = position.coords.accuracy;

  statusElement.textContent =
    "Location acquired. Calculating road distances...";

  accuracyElement.textContent =
    `GPS accuracy approximately ±${Math.round(accuracy)} metres`;

  try {

    await calculateRoadDistances(userLat, userLon);

    statusElement.textContent =
      "Road distances calculated.";

  } catch (error) {

    console.error(error);

    statusElement.textContent =
      "Road distance unavailable. Showing straight-line distance instead.";

    displayStraightLineFallback(userLat, userLon);

  }

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
// CALCULATE ROAD DISTANCES
// -----------------------------------------------------

async function calculateRoadDistances(userLat, userLon) {

  // First calculate straight-line distance to every hospital.
  // This is free and happens entirely on the phone.

  const shortlisted = hospitals
    .map(hospital => {

      const straightLineDistance = haversineDistance(
        userLat,
        userLon,
        hospital.lat,
        hospital.lon
      );

      return {
        ...hospital,
        straightLineDistance
      };

    })

    // Sort geographically nearest first
    .sort(
      (a, b) =>
        a.straightLineDistance - b.straightLineDistance
    )

    // Only send the nearest 3 to Google
    .slice(0, 3);


  // Send current location + 3 destinations to Cloudflare

  const response = await fetch(WORKER_URL, {

    method: "POST",

    headers: {
      "Content-Type": "application/json"
    },

    body: JSON.stringify({

      origin: {
        lat: userLat,
        lon: userLon
      },

      destinations: shortlisted.map(hospital => ({
        lat: hospital.lat,
        lon: hospital.lon
      }))

    })

  });


  if (!response.ok) {
    throw new Error(
      `Worker returned ${response.status}`
    );
  }


  const data = await response.json();


  if (
    !data.results ||
    !Array.isArray(data.results) ||
    data.results.length === 0
  ) {
    throw new Error(
      "No road distance results returned."
    );
  }


  // Match Google's results back to each hospital

  const roadResults = data.results.map(route => {

    const hospital =
      shortlisted[route.destinationIndex];

    return {
      ...hospital,

      roadDistanceKm:
        route.distanceMeters / 1000,

      duration:
        route.duration
    };

  });


  // Sort by actual road distance
  roadResults.sort(
    (a, b) =>
      a.roadDistanceKm - b.roadDistanceKm
  );


  displayRoadResults(roadResults);
}


// -----------------------------------------------------
// DISPLAY ROAD DISTANCE RESULTS
// -----------------------------------------------------

function displayRoadResults(results) {

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
        ${hospital.roadDistanceKm.toFixed(1)}
        <span>km by road</span>
      </div>
    `;

    resultsElement.appendChild(
      hospitalElement
    );

  });

}


// -----------------------------------------------------
// STRAIGHT-LINE FALLBACK
// -----------------------------------------------------

function displayStraightLineFallback(
  userLat,
  userLon
) {

  const results = hospitals
    .map(hospital => {

      const distance =
        haversineDistance(
          userLat,
          userLon,
          hospital.lat,
          hospital.lon
        );

      return {
        ...hospital,
        distance
      };

    })

    .sort(
      (a, b) =>
        a.distance - b.distance
    )

    .slice(0, 3);


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
        <span>km straight-line</span>
      </div>
    `;

    resultsElement.appendChild(
      hospitalElement
    );

  });

}


// -----------------------------------------------------
// HAVERSINE DISTANCE
// -----------------------------------------------------

function haversineDistance(
  lat1,
  lon1,
  lat2,
  lon2
) {

  const earthRadiusKm = 6371;

  const dLat =
    degreesToRadians(lat2 - lat1);

  const dLon =
    degreesToRadians(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) *
    Math.sin(dLat / 2) +

    Math.cos(
      degreesToRadians(lat1)
    ) *

    Math.cos(
      degreesToRadians(lat2)
    ) *

    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);


  const c =
    2 *
    Math.atan2(
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