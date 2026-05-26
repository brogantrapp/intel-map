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
      "https://raw.githubusercontent.com/brogantrapp/world-risk-map/main/data/risk.json";

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


//=========================
// LOAD NEWS
// ========================

async function loadNews() {

  const panel = document.getElementById("newsPanel");
  if (!panel) {
    console.error("newsPanel element not found in HTML");
    return;
  }

  panel.innerHTML = "<div style='color:#00ffff'>Loading news...</div>";

  try {

    // CORS proxy (required for RSS feeds in browser)
    const rssUrl = "https://feeds.bbci.co.uk/news/world/rss.xml";
    const proxy = "https://api.allorigins.win/raw?url=";

    const res = await fetch(proxy + encodeURIComponent(rssUrl));

    if (!res.ok) throw new Error("Network response not ok");

    const text = await res.text();

    const xml = new DOMParser().parseFromString(text, "text/xml");
    const items = xml.querySelectorAll("item");

    panel.innerHTML = "";

    let count = 0;

    items.forEach(item => {

      if (count >= 10) return;

      const title = item.querySelector("title")?.textContent;
      const link = item.querySelector("link")?.textContent;

      const div = document.createElement("div");

      div.innerHTML = `
        <a href="${link}" target="_blank" style="color:#9be7ff; text-decoration:none;">
          ${title}
        </a>
      `;

      panel.appendChild(div);

      count++;
    });

  } catch (e) {
    console.error("News load failed:", e);
    panel.innerHTML = "<div style='color:#ff5555'>News unavailable</div>";
  }
}

//=========================
// AUTOCORRECT
//=========================


function setupSearch(map, geojsonData) {

  const input = document.getElementById("searchBox");

  if (!input) {
    console.error("searchBox not found in HTML");
    return;
  }

  // normalize function
  function norm(s) {
    return (s || "").toLowerCase().trim();
  }

  // find best match (autocorrect-style)
  function findBestMatch(query) {

    query = norm(query);

    if (!query) return null;

    let bestMatch = null;
    let bestScore = 0;

    for (const feature of geojsonData.features) {

      const name = norm(feature.properties.name);

      // simple scoring system (partial match)
      let score = 0;

      if (name === query) score = 100;
      else if (name.includes(query)) score = 80;
      else if (query.includes(name)) score = 60;
      else if (name.startsWith(query)) score = 70;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = feature;
      }
    }

    return bestMatch;
  }

  // highlight layer state
  let highlightId = null;

  function highlightCountry(feature) {

    if (!feature) return;

    const name = feature.properties.name;

    // remove old highlight layer if exists
    if (map.getLayer("highlight-layer")) {
      map.removeLayer("highlight-layer");
      map.removeSource("highlight-source");
    }

    map.addSource("highlight-source", {
      type: "geojson",
      data: feature
    });

    map.addLayer({
      id: "highlight-layer",
      type: "line",
      source: "highlight-source",
      paint: {
        "line-color": "#00ffff",
        "line-width": 3
      }
    });
  }

  input.addEventListener("input", (e) => {

    const value = e.target.value;

    const match = findBestMatch(value);

    if (!match) return;

    highlightCountry(match);

    // zoom to country
    const coords = match.geometry.coordinates;

    try {
      map.flyTo({
        center: [0, 20],
        zoom: 3
      });
    } catch (err) {
      console.error("Zoom error:", err);
    }

  });
}
