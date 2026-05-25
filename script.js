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
    now.toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  document.getElementById("clockText").textContent =
    est.toLocaleTimeString() +
    " | " +
    est.toLocaleDateString();
}

setInterval(updateClock, 1000);
updateClock();


// =========================
// HOME BUTTON
// =========================

class HomeControl {

  onAdd(map) {

    this.map = map;

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
// LEVEL COLORS
// =========================

function levelToColor(level) {

  if (level === 1) return "#2ecc71";
  if (level === 2) return "#f1c40f";
  if (level === 3) return "#e67e22";
  if (level === 4) return "#e74c3c";

  return "#2a2a2a";
}


// =========================
// LOAD ADVISORIES (GITHUB VERSION)
// =========================

async function loadAdvisories() {

  try {

    const url =
      "https://raw.githubusercontent.com/josh/us-state-travel-advisories-feeds/master/advisories.json";

    const res = await fetch(url);
    const data = await res.json();

    const temp = {};

    /**
     * We do NOT assume structure — we normalize it safely
     * because GitHub datasets often vary slightly
     */

    const list =
      Array.isArray(data)
        ? data
        : (data.data || data.advisories || []);

    list.forEach(item => {

      const country =
        (
          item.country ||
          item.name ||
          item.country_name ||
          ""
        )
          .toLowerCase()
          .trim();

      const level =
        Number(
          item.advisoryLevel ||
          item.level ||
          item.risk_level
        );

      if (country && level >= 1 && level <= 4) {
        temp[country] = level;
      }
    });

    riskMap = temp;

    console.log("GitHub advisories loaded:", riskMap);

    applyColors();

  } catch (e) {

    console.log("Advisory load failed:", e);
  }
}


// =========================
// COLOR EXPRESSION
// =========================

function getColorExpr() {

  return [

    "match",

    [
      "downcase",

      [
        "coalesce",
        ["get", "name"],
        ["get", "ADMIN"],
        ["get", "NAME"]
      ]
    ],

    ...Object.entries(riskMap).flatMap(([country, level]) => [
      country,
      levelToColor(level)
    ]),

    "#2a2a2a"
  ];
}


// =========================
// APPLY COLORS
// =========================

function applyColors() {

  map.setPaintProperty(
    "countries-fill",
    "fill-color",
    colorsEnabled ? getColorExpr() : "#2a2a2a"
  );

  map.setPaintProperty(
    "countries-border",
    "line-color",
    colorsEnabled ? "#555" : "#2a2a2a"
  );
}


// =========================
// HIGHLIGHT
// =========================

function highlight(name) {

  map.setFilter("countries-highlight", [
    "==",
    [
      "coalesce",
      ["get", "name"],
      ["get", "ADMIN"],
      ["get", "NAME"]
    ],
    name
  ]);
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

  loadAdvisories();

  setInterval(loadAdvisories, 86400000);
});


// =========================
// TOGGLE (if you have checkbox)
// =========================

const toggle = document.getElementById("colorToggle");

if (toggle) {
  toggle.addEventListener("change", (e) => {
    colorsEnabled = e.target.checked;
    applyColors();
  });
}
