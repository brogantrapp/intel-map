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


// =========================
// NORMALIZER (CRITICAL FIX)
// =========================

function norm(s) {
  return (s || "").toLowerCase().trim();
}


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
// LOAD RISK DATA (FIXED)
// =========================

async function loadRisk() {
  try {
    const res = await fetch(
      "https://raw.githubusercontent.com/brogantrapp/intel-map/main/data/risk.json?t=" + Date.now()
    );

    const raw = await res.json();

    // normalize keys so matching ALWAYS works
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

      map.setFilter("countries-highlight", ["==", "name", ""]);
    };

    div.appendChild(btn);
    return div;
  }

  onRemove() {}
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

  // =========================
  // BUILD COLOR MAP (FIXED MATCHING)
  // =========================

  const colorMap = {};

  geojsonData.features.forEach(f => {

    const name = f.properties.name;
    const key = norm(name);

    const level = riskMap[key] || riskMap[norm(name)] || 1;

    colorMap[name] = getColor(level);
  });

  // =========================
  // COUNTRY LAYER
  // =========================

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": [
        "match",
        ["get", "name"],

        ...Object.entries(colorMap).flat(),

        "#2ecc71"
      ],
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

  map.addLayer({
    id: "countries-highlight",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#00ffff",
      "line-width": 3
    },
    filter: ["==", "name", ""]
  });

  map.addControl(new HomeControl(), "top-right");
});


// =========================
// NEWS (SIMPLE WORKING)
// =========================

async function loadNews() {

  const panel = document.getElementById("newsPanel");
  if (!panel) return;

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  const feeds = [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.cnn.com/rss/edition_world.rss"
  ];

  for (const feed of feeds) {
    try {
      const res = await fetch(feed);
      const text = await res.text();

      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");

      let count = 0;

      items.forEach(item => {
        if (count >= 6) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");
        div.className = "news-item";
        div.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;

        panel.appendChild(div);
        count++;
      });

    } catch (e) {
      console.log("News failed:", feed);
    }
  }
}

loadNews();
setInterval(loadNews, 60000);
