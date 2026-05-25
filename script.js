// =========================
// MAP INIT
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

//  Travel advisory data
let riskMap = {};


// =========================
// HOME BUTTON
// =========================

class HomeControl {
  onAdd(map) {

    this.map = map;
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.title = "Reset View";
    btn.innerHTML = "⌂";

    btn.onclick = () => {

      map.fitBounds(
        [
          [-180, -85],
          [180, 85]
        ],
        {
          padding: 20,
          duration: 1200
        }
      );

      map.setFilter("countries-highlight", ["==", "name", ""]);
    };

    this.container.appendChild(btn);
    return this.container;
  }

  onRemove() {
    this.container.parentNode.removeChild(this.container);
    this.map = undefined;
  }
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

  document.getElementById("clockText").textContent =
    est.toLocaleTimeString("en-US") +
    " | " +
    est.toLocaleDateString();
}

setInterval(updateClock, 1000);
updateClock();


// =========================
// ALIASES
// =========================

const aliases = {
  "usa": "United States of America",
  "us": "United States of America",
  "uk": "United Kingdom",
  "britain": "United Kingdom",
  "russia": "Russia",
  "drc": "Democratic Republic of the Congo",
  "congo": "Democratic Republic of the Congo"
};


// =========================
// NORMALIZE
// =========================

function normalizeName(name) {
  return (name || "").toLowerCase().trim();
}


// =========================
// LEVEL → COLOR
// =========================

function levelToColor(level) {

  switch (level) {
    case 1: return "#2ecc71"; // green
    case 2: return "#f1c40f"; // yellow
    case 3: return "#e67e22"; // orange
    case 4: return "#e74c3c"; // red
    default: return "#1c1c1c";
  }
}


// =========================
// LOAD STATE DEPT ADVISORIES
// =========================

async function loadAdvisories() {

  try {

    const res = await fetch(
      "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.json"
    );

    const data = await res.json();

    const mapObj = {};

    const list = data.data || data || [];

    list.forEach(item => {

      const country = normalizeName(item.country);
      const level = Number(item.advisoryLevel);

      if (country && level >= 1 && level <= 4) {
        mapObj[country] = level;
      }
    });

    riskMap = mapObj;

    applyColors();

  } catch (err) {
    console.log("Advisory load failed:", err);
  }
}


// =========================
// COLORS (FIXED SAFE VERSION)
// =========================

function getColorExpr() {

  return [
    "case",

    ["==", colorsEnabled, false],
    "#2a2a2a",

    [
      "match",
      ["downcase", ["get", "name"]],

      ...Object.entries(riskMap).flatMap(([country, level]) => [
        country,
        levelToColor(level)
      ]),

      "#1c1c1c"
    ]
  ];
}


// =========================
// APPLY COLORS
// =========================

function applyColors() {

  map.setPaintProperty(
    "countries-fill",
    "fill-color",
    getColorExpr()
  );

  map.setPaintProperty(
    "countries-border",
    "line-color",
    colorsEnabled ? "#555" : "#2a2a2a"
  );

  map.setPaintProperty(
    "countries-border",
    "line-opacity",
    colorsEnabled ? 0.6 : 0.1
  );
}


// =========================
// HIGHLIGHT
// =========================

function highlight(name) {

  map.setFilter("countries-highlight", ["==", "name", name]);
}


// =========================
// ZOOM
// =========================

function zoomTo(feature) {

  const bounds = new maplibregl.LngLatBounds();

  function walk(c) {
    if (typeof c[0] === "number") {
      bounds.extend(c);
    } else {
      c.forEach(walk);
    }
  }

  walk(feature.geometry.coordinates);

  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: 5,
    duration: 900
  });

  highlight(feature.properties.name);
}


// =========================
// SEARCH
// =========================

function setupSearch() {

  const box = document.getElementById("searchBox");
  const list = document.getElementById("suggestions");

  function normalize(q) {
    return aliases[q.toLowerCase().trim()] || q;
  }

  function getCountries() {
    return geojsonData.features.map(f => f.properties.name);
  }

  function find(name) {
    return geojsonData.features.find(f =>
      f.properties.name.toLowerCase() === name.toLowerCase()
    );
  }

  function show(matches) {

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

        const f = find(name);
        if (f) zoomTo(f);
      };

      list.appendChild(div);
    });

    list.style.display = "block";
  }

  box.addEventListener("input", () => {

    const q = normalize(box.value).toLowerCase();

    if (!q) return list.style.display = "none";

    show(getCountries().filter(c =>
      c.toLowerCase().includes(q)
    ));
  });

  box.addEventListener("keydown", (e) => {

    if (e.key === "Enter") {

      const f = find(normalize(box.value));

      if (f) zoomTo(f);

      list.style.display = "none";
    }
  });
}


// =========================
// CLICK MAP
// =========================

function setupClick() {

  map.on("click", "countries-fill", (e) => {
    zoomTo(e.features[0]);
  });
}


// =========================
// NEWS
// =========================

const feeds = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://www.reuters.com/rssFeed/worldNews"
];

const proxy = "https://api.rss2json.com/v1/api.json?rss_url=";

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  let all = [];

  for (const f of feeds) {

    try {

      const res = await fetch(proxy + encodeURIComponent(f));
      const data = await res.json();

      if (data.items) {

        all.push(...data.items.map(i => ({
          title: i.title,
          link: i.link,
          source: data.feed?.title || "News"
        })));
      }

    } catch {}
  }

  all.slice(0, 15).forEach(a => {

    const div = document.createElement("div");
    div.className = "news-item";

    div.innerHTML = `
      <div class="source-label">${a.source}</div>
      <a href="${a.link}" target="_blank">${a.title}</a>
    `;

    panel.appendChild(div);
  });
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

  setupSearch();
  setupClick();

  applyColors();
  loadNews();
  loadAdvisories();

  setInterval(loadNews, 60000);
  setInterval(loadAdvisories, 24 * 60 * 60 * 1000);
});


// =========================
// TOGGLE
// =========================

document.getElementById("colorToggle").addEventListener("change", (e) => {
  colorsEnabled = e.target.checked;
  applyColors();
});
