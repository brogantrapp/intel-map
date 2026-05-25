
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
// NORMALIZER + ALIASES FIX
// =========================

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const aliases = {
  "united states": "united states of america",
  "usa": "united states of america",
  "uk": "united kingdom",
  "russia": "russia",
  "iran": "iran"
};


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
// LOAD RISK (FIXED MATCHING)
// =========================

async function loadRisk() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/brogantrapp/intel-map/main/data/risk.json?t=" + Date.now()
    );

    const raw = await res.json();

    const cleaned = {};

    for (const [k, v] of Object.entries(raw)) {
      cleaned[norm(k)] = v;
    }

    riskMap = cleaned;

    console.log("✅ Risk loaded:", Object.keys(riskMap).length);

  } catch (e) {
    console.error("❌ Risk load failed:", e);
    riskMap = {};
  }
}


// =========================
// COLOR FUNCTION
// =========================

function getColor(level) {
  if (level === 1) return "#2ecc71";
  if (level === 2) return "#f1c40f";
  if (level === 3) return "#e67e22";
  if (level === 4) return "#e74c3c";
  return "#2ecc71";
}


// =========================
// APPLY COLORS (TOGGLE FIX)
// =========================

function applyColors() {

  const expr = [
    "match",
    ["get", "name"],

    ...geojsonData.features.flatMap(f => {

      const name = f.properties.name;
      const key = norm(name);

      const level =
        riskMap[key] ||
        riskMap[aliases[key]] ||
        1;

      return [name, colorsEnabled ? getColor(level) : "#2a2a2a"];
    }),

    "#2a2a2a"
  ];

  map.setPaintProperty("countries-fill", "fill-color", expr);
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

  await loadRisk();

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": "#2ecc71",
      "fill-opacity": 0.6
    }
  });

  map.addLayer({
    id: "countries-border",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#444",
      "line-width": 0.7
    }
  });

  applyColors();
});


// =========================
// TOGGLE FIX (IMPORTANT)
// =========================

document.getElementById("colorToggle").addEventListener("change", (e) => {
  colorsEnabled = e.target.checked;
  applyColors();
});


// =========================
// NEWS (FIXED RELIABILITY)
// =========================

async function loadNews() {

  const panel = document.getElementById("newsPanel");
  if (!panel) return;

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  try {

    const feeds = [
      "https://feeds.bbci.co.uk/news/world/rss.xml"
    ];

    for (const feed of feeds) {

      const res = await fetch(feed);
      const text = await res.text();

      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");

      let count = 0;

      items.forEach(item => {

        if (count >= 8) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");
        div.className = "news-item";
        div.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;

        panel.appendChild(div);

        count++;
      });
    }

  } catch (e) {
    console.error("❌ News failed:", e);
  }
}

loadNews();
setInterval(loadNews, 60000);
