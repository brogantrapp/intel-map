
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

let geojsonData;
let riskMap = {};
let colorsEnabled = true;


// =========================
// NORMALIZER
// =========================

function norm(s) {
  return (s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}


// =========================
// LOAD RISK (DEBUG VERSION)
// =========================

async function loadRisk() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/brogantrapp/intel-map/main/data/risk.json?t=" + Date.now()
    );

    const raw = await res.json();

    console.log("RAW RISK KEYS:", Object.keys(raw).slice(0, 10));

    riskMap = {};

    for (const [k, v] of Object.entries(raw)) {
      riskMap[norm(k)] = v;
    }

    console.log("NORMALIZED RISK KEYS:", Object.keys(riskMap).slice(0, 10));

  } catch (e) {
    console.error("❌ Risk load failed FULL:", e);
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
// APPLY COLORS (DEBUG VERSION)
// =========================

function applyColors() {

  if (!geojsonData) {
    console.warn("GeoJSON not loaded yet");
    return;
  }

  let matched = 0;
  let total = geojsonData.features.length;

  const expr = [
    "match",
    ["get", "name"]
  ];

  geojsonData.features.forEach(f => {

    const name = f.properties.name;
    const key = norm(name);

    const level = riskMap[key];

    if (level) matched++;

    expr.push(name, getColor(level || 1));
  });

  expr.push("#2ecc71");

  console.log(`MATCHED ${matched}/${total} countries`);

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

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": "#2ecc71",
      "fill-opacity": 0.6
    }
  });

  await loadRisk();

  applyColors();
});


// =========================
// NEWS (DEBUG FIX)
// =========================

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  if (!panel) {
    console.error("❌ newsPanel NOT FOUND in HTML");
    return;
  }

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  try {
    const res = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml");

    const text = await res.text();

    const xml = new DOMParser().parseFromString(text, "text/xml");
    const items = xml.querySelectorAll("item");

    console.log("NEWS ITEMS FOUND:", items.length);

    let count = 0;

    items.forEach(item => {

      if (count >= 8) return;

      const title = item.querySelector("title")?.textContent;
      const link = item.querySelector("link")?.textContent;

      const div = document.createElement("div");
      div.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;
      panel.appendChild(div);

      count++;
    });

  } catch (e) {
    console.error("❌ NEWS FAILED:", e);
  }
}

loadNews();
setInterval(loadNews, 60000);


// =========================
// TOGGLE DEBUG
// =========================

document.getElementById("colorToggle").addEventListener("change", (e) => {
  colorsEnabled = e.target.checked;
  applyColors();
});
loadNews();
setInterval(loadNews, 60000);
