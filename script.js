
// =========================
// MAP
// =========================

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [10, 25],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl());

let geojsonData = null;
let colorsEnabled = true;


// =========================
// CLOCK
// =========================

function updateClock() {

  const now = new Date();

  const est = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  document.getElementById("clockText").textContent =
    est.toLocaleTimeString("en-US") +
    " | " +
    est.toLocaleDateString("en-US");
}

setInterval(updateClock, 1000);
updateClock();


// =========================
// COLOR TOGGLE (FIXED)
// =========================

document.getElementById("colorToggle").addEventListener("change", (e) => {

  colorsEnabled = e.target.checked;

  updateColors();
});

function updateColors() {

  map.setPaintProperty(
    "countries-fill",
    "fill-color",
    colorsEnabled ? getColorExpr() : "#2a2a2a"
  );

  // FIX: borders also toggle properly
  map.setPaintProperty(
    "countries-border",
    "line-color",
    colorsEnabled ? "#555" : "#2a2a2a"
  );

  map.setPaintProperty(
    "countries-border",
    "line-opacity",
    colorsEnabled ? 0.6 : 0.15
  );
}


// =========================
// COLOR LOGIC
// =========================

function getColorExpr() {

  return [
    "match",
    ["get", "name"],

    "Russia", "#7a1f1f",
    "Ukraine", "#7a1f1f",
    "Iran", "#7a1f1f",

    "China", "#8a6a1f",
    "United States of America", "#8a6a1f",
    "India", "#8a6a1f",

    "Canada", "#1f5a3a",
    "France", "#1f5a3a",
    "Germany", "#1f5a3a",
    "United Kingdom", "#1f5a3a",

    "#1c1c1c"
  ];
}


// =========================
// SEARCH (FIXED ACCURATE ZOOM)
// =========================

function setupSearch() {

  const box = document.getElementById("searchBox");
  const list = document.getElementById("suggestions");

  function getCountries() {

    return geojsonData.features
      .map(f => f.properties.name)
      .filter(Boolean)
      .sort();
  }

  function zoomToCountry(name) {

    const feature = geojsonData.features.find(f =>
      f.properties.name.toLowerCase() === name.toLowerCase()
    );

    if (!feature) return;

    const bounds = new maplibregl.LngLatBounds();

    function walk(coords) {

      if (typeof coords[0] === "number") {
        bounds.extend(coords);
      } else {
        coords.forEach(walk);
      }
    }

    walk(feature.geometry.coordinates);

    map.fitBounds(bounds, {
      padding: 80,
      maxZoom: 5,
      duration: 900
    });
  }

  function showSuggestions(matches) {

    list.innerHTML = "";

    if (!matches.length) {
      list.style.display = "none";
      return;
    }

    matches.slice(0, 8).forEach(name => {

      const div = document.createElement("div");
      div.className = "suggestion";
      div.textContent = name;

      div.onclick = () => {

        box.value = name;
        list.style.display = "none";

        zoomToCountry(name);
      };

      list.appendChild(div);
    });

    list.style.display = "block";
  }

  box.addEventListener("input", () => {

    const q = box.value.toLowerCase().trim();

    if (!q) {
      list.style.display = "none";
      return;
    }

    const matches = getCountries().filter(c =>
      c.toLowerCase().includes(q)
    );

    showSuggestions(matches);
  });

  box.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {
      zoomToCountry(box.value.trim());
      list.style.display = "none";
    }
  });

  document.addEventListener("click", (e) => {

    if (!document.getElementById("searchWrapper").contains(e.target)) {
      list.style.display = "none";
    }
  });
}


// =========================
// LOAD MAP DATA
// =========================

map.on("load", async () => {

  const res = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );

  geojsonData = await res.json();

  map.addSource("countries", {
    type: "geojson",
    data: geojsonData
  });

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": getColorExpr(),
      "fill-opacity": 0.55
    }
  });

  map.addLayer({
    id: "countries-border",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#555",
      "line-width": 0.7,
      "line-opacity": 0.6
    }
  });

  setupSearch();
  updateColors();
});
