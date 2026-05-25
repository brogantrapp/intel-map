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
// HOME BUTTON CONTROL
// =========================

class HomeControl {
  onAdd(map) {
    this.map = map;
    this.container = document.createElement("div");

    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.title = "Reset View";
    this.button.innerHTML = "⌂";

    this.button.onclick = () => {
      map.flyTo({
        center: [10, 25],
        zoom: 2,
        duration: 1000
      });

      map.setFilter("countries-highlight", ["==", "name", ""]);
    };

    this.container.appendChild(this.button);
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
// COLOR FUNCTION
// =========================

function getColorExpr() {

  return [
    "match",
    ["get", "name"],

    "Russia", "#7a1f1f",
    "Russian Federation", "#7a1f1f",

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
// APPLY COLORS (TOGGLE FIXED)
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

  map.setFilter("countries-highlight", [
    "==",
    "name",
    name
  ]);
}


// =========================
// ZOOM FUNCTION
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
// SEARCH + AUTOCOMPLETE
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

    if (!q) {
      list.style.display = "none";
      return;
    }

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

  document.addEventListener("click", (e) => {

    if (!document.getElementById("searchWrapper").contains(e.target)) {
      list.style.display = "none";
    }
  });
}


// =========================
// CLICK TO ZOOM
// =========================

function setupClick() {

  map.on("click", "countries-fill", (e) => {
    zoomTo(e.features[0]);
  });

  map.on("mouseenter", "countries-fill", () => {
    map.getCanvas().style.cursor = "pointer";
  });

  map.on("mouseleave", "countries-fill", () => {
    map.getCanvas().style.cursor = "";
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
  setInterval(loadNews, 60000);
});


// =========================
// TOGGLE EVENT
// =========================

document.getElementById("colorToggle").addEventListener("change", (e) => {
  colorsEnabled = e.target.checked;
  applyColors();
});
