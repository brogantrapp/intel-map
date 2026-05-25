// =========================
// MAP INIT
// =========================

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [10, 20],
  zoom: 1.8
});

map.addControl(new maplibregl.NavigationControl());

let geojsonData = null;
let riskMap = {};
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

  const el = document.getElementById("clockText");

  if (el) {
    el.textContent =
      est.toLocaleTimeString() +
      " | " +
      est.toLocaleDateString();
  }
}

setInterval(updateClock, 1000);
updateClock();


// =========================
// HOME BUTTON
// =========================

class HomeControl {

  onAdd(map) {

    const div = document.createElement("div");
    div.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const btn = document.createElement("button");
    btn.innerHTML = "⌂";
    btn.title = "Reset View";

    btn.onclick = () => {

      map.fitBounds([
        [-180, -85],
        [180, 85]
      ]);

      map.setFilter("countries-highlight", ["==", "ADMIN", ""]);
    };

    div.appendChild(btn);
    return div;
  }

  onRemove() {}
}

map.addControl(new HomeControl(), "top-right");


// =========================
// COLORS
// =========================

function levelToColor(level) {

  if (level === 1) return "#2ecc71";
  if (level === 2) return "#f1c40f";
  if (level === 3) return "#e67e22";
  if (level === 4) return "#e74c3c";

  return "#2a2a2a";
}


// =========================
// LOAD RISK DATA (GITHUB)
// =========================

async function loadAdvisories() {

  try {

    const url =
      "https://raw.githubusercontent.com/YOUR_USERNAME/world-risk-map/main/data/risk.json";

    const res = await fetch(url);

    const data = await res.json();

    riskMap = data || {};

    console.log("✅ GitHub risk data loaded:", riskMap);

    applyColors();

  } catch (e) {

    console.log("❌ Failed to load risk data:", e);
  }
}


// =========================
// COLOR EXPRESSION
// =========================

function getColorExpr() {

  return [

    "match",

    ["downcase", ["get", "name"]],

    ...Object.entries(riskMap).flatMap(([country, level]) => [
      country.toLowerCase(),
      levelToColor(level)
    ]),

    "#2a2a2a"
  ];
}


// =========================
// APPLY COLORS
// =========================

function applyColors() {

  if (!map.getLayer("countries-fill")) return;

  map.setPaintProperty(
    "countries-fill",
    "fill-color",
    colorsEnabled ? getColorExpr() : "#2a2a2a"
  );
}


// =========================
// LOAD MAP
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
      "fill-color": "#2a2a2a",
      "fill-opacity": 0.6
    }
  });

  map.addLayer({
    id: "countries-border",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#555",
      "line-width": 0.7
    }
  });

  map.addLayer({
    id: "countries-highlight",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#00ffff",
      "line-width": 3
    },
    filter: ["==", "ADMIN", ""]
  });

  // 🔥 load GitHub data AFTER map is ready
  setTimeout(loadAdvisories, 1000);
});


// =========================
// TOGGLE (optional checkbox)
// =========================

const toggle = document.getElementById("colorToggle");

if (toggle) {
  toggle.addEventListener("change", (e) => {
    colorsEnabled = e.target.checked;
    applyColors();
  });
}
loadNews();
setInterval(loadNews, 60000);
