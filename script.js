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
let colorsEnabled = true;
let riskMap = {};


// =========================
// CLOCK
// =========================

function updateClock() {
  const now = new Date();
  const est = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  document.getElementById("clockText").textContent =
    est.toLocaleTimeString() + " | " + est.toLocaleDateString();
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

    btn.onclick = () => {
      map.fitBounds([[-180, -85], [180, 85]]);
    };

    div.appendChild(btn);
    return div;
  }

  onRemove() {}
}

map.addControl(new HomeControl());


// =========================
// COLORS
// =========================

function color(level) {
  if (level === 1) return "#2ecc71";
  if (level === 2) return "#f1c40f";
  if (level === 3) return "#e67e22";
  if (level === 4) return "#e74c3c";
  return "#2a2a2a";
}


// =========================
// ADVISORY FETCH
// =========================

async function loadAdvisories() {
  try {
    const res = await fetch(
      "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.json"
    );

    const data = await res.json();

    const temp = {};

    (data.data || []).forEach(c => {
      if (c.country && c.advisoryLevel) {
        temp[c.country.toLowerCase()] = Number(c.advisoryLevel);
      }
    });

    riskMap = temp;

    applyColors();

  } catch (e) {
    console.log("advisory error", e);
  }
}


// =========================
// APPLY COLORS (SAFE + WORKING)
// =========================

function applyColors() {

  map.setPaintProperty(
    "countries-fill",
    "fill-color",
    [
      "case",

      ["==", colorsEnabled, false],
      "#2a2a2a",

      [
        "match",
        ["downcase", ["get", "name"]],

        ...Object.entries(riskMap).flatMap(([k, v]) => [
          k,
          color(v)
        ]),

        "#2a2a2a"
      ]
    ]
  );
}


// =========================
// MAP LOAD
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
      "line-width": 0.6
    }
  });

  loadAdvisories();
  setInterval(loadAdvisories, 86400000);
});
