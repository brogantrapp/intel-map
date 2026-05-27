document.addEventListener("DOMContentLoaded", async () => {

  // =========================
  // MAP
  // =========================

  const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [0, 20],
    zoom: 1.0
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  // =========================
  // HOME BUTTON
  // =========================

  class HomeControl {
    onAdd(map) {

      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.className = "home-control-btn";
      btn.innerHTML = "⌂";
      btn.title = "Reset View";

      btn.style.background = "#e6e6e6";
      btn.style.color = "#111";

      btn.onclick = () => {
        map.flyTo({
          center: [0, 20],
          zoom: 1.0,
          bearing: 0,
          pitch: 0,
          duration: 1000
        });
      };

      container.appendChild(btn);
      return container;
    }
  }

  map.addControl(new HomeControl(), "top-right");

  // =========================
  // CLOCK
  // =========================

  function updateClock() {
    document.getElementById("clockText").innerText =
      new Date().toLocaleTimeString() +
      " | " +
      new Date().toLocaleDateString();
  }

  updateClock();
  setInterval(updateClock, 1000);

  // =========================
  // NEWS
  // =========================

  async function loadNews() {

    const panel = document.getElementById("newsPanel");

    panel.innerHTML = "Loading news...";

    try {

      const res = await fetch(
        "https://api.allorigins.win/raw?url=" +
        encodeURIComponent("https://feeds.bbci.co.uk/news/world/rss.xml")
      );

      const text = await res.text();

      const xml = new DOMParser().parseFromString(text, "text/xml");

      const items = xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 12) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");

        div.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;
        panel.appendChild(div);
      });

    } catch (e) {
      console.error(e);
      panel.innerHTML = "News unavailable";
    }
  }

  loadNews();
  setInterval(loadNews, 60000);

  // =========================
  // GEOJSON
  // =========================

  const geojson = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  ).then(r => r.json());

  // =========================
  // RISK.JSON
  // =========================

  let riskMap = {};
  let riskIndex = {};
  let colorsEnabled = true;

  async function loadRisk() {

    try {

      const res = await fetch("./data/risk.json");
      riskMap = await res.json();

      buildRiskIndex();

      console.log("✅ risk loaded");

    } catch (e) {
      console.error("❌ risk load failed", e);
    }
  }

  // =========================
  // NORMALIZER
  // =========================

  function normalize(name) {
    return name
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[.,']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // =========================
  // BUILD INDEX (CRITICAL FIX)
  // =========================

  function buildRiskIndex() {

    riskIndex = {};

    Object.entries(riskMap).forEach(([k, v]) => {
      riskIndex[normalize(k)] = v;
    });
  }

  // =========================
  // COLORS
  // =========================

  function getColor(level) {

    switch (Number(level)) {

      case 4: return "#c0392b";
      case 3: return "#e67e22";
      case 2: return "#f1c40f";
      default: return "#00aa44";
    }
  }

  // =========================
  // APPLY COLORS (FIXED CORE)
  // =========================

  const aliases = {
    "russian federation": "russia",
    "united states of america": "united states",
    "iran islamic republic of": "iran",
    "korea republic of": "south korea",
    "korea democratic peoples republic of": "north korea",
    "viet nam": "vietnam",
    "syrian arab republic": "syria",
    "bolivia plurinational state of": "bolivia",
    "moldova republic of": "moldova",
    "lao peoples democratic republic": "laos",
    "united republic of tanzania": "tanzania"
  };

  function applyColors() {

    geojson.features.forEach(f => {

      let name = normalize(f.properties.name);

      if (aliases[name]) {
        name = aliases[name];
      }

      const level = riskIndex[name] ?? 1;

      f.properties.color = colorsEnabled
        ? getColor(level)
        : "#2a2a2a";
    });

    if (map.getSource("countries")) {
      map.getSource("countries").setData(geojson);
    }
  }

  // =========================
  // MAP LOAD
  // =========================

  map.on("load", async () => {

    map.addSource("countries", {
      type: "geojson",
      data: geojson
    });

    map.addLayer({
      id: "fill",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.75
      }
    });

    map.addLayer({
      id: "border",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#111",
        "line-width": 0.8
      }
    });

    document
      .getElementById("colorToggle")
      ?.addEventListener("change", (e) => {

        colorsEnabled = e.target.checked;
        applyColors();
      });

    await loadRisk();
    applyColors();
    setupSearch();
  });

  // =========================
  // SEARCH
  // =========================

  function setupSearch() {

    const input = document.getElementById("searchBox");

    const dropdown = document.createElement("div");
    dropdown.className = "searchDropdown";
    dropdown.style.display = "none";
    document.body.appendChild(dropdown);

    function matches(q) {
      q = q.toLowerCase();
      return geojson.features
        .filter(f => f.properties.name.toLowerCase().includes(q))
        .slice(0, 8);
    }

    function highlight(f) {

      if (map.getLayer("highlight")) map.removeLayer("highlight");
      if (map.getSource("highlight-src")) map.removeSource("highlight-src");

      map.addSource("highlight-src", {
        type: "geojson",
        data: f
      });

      map.addLayer({
        id: "highlight",
        type: "line",
        source: "highlight-src",
        paint: {
          "line-color": "#ffffff",
          "line-width": 3
        }
      });
    }

    input.addEventListener("input", e => {

      const list = matches(e.target.value);

      dropdown.innerHTML = "";

      if (!list.length) {
        dropdown.style.display = "none";
        return;
      }

      const rect = input.getBoundingClientRect();

      dropdown.style.left = rect.left + "px";
      dropdown.style.top = rect.bottom + "px";

      list.forEach(f => {

        const item = document.createElement("div");
        item.className = "searchItem";
        item.textContent = f.properties.name;

        item.onclick = () => {

          input.value = f.properties.name;
          dropdown.style.display = "none";

          highlight(f);

          const bounds = new maplibregl.LngLatBounds();

          function add(c) {
            if (typeof c[0] === "number") bounds.extend(c);
            else c.forEach(add);
          }

          add(f.geometry.coordinates);

          map.fitBounds(bounds, {
            padding: 50,
            duration: 1200
          });
        };

        dropdown.appendChild(item);
      });

      dropdown.style.display = "block";
    });

    document.addEventListener("click", e => {
      if (e.target !== input) dropdown.style.display = "none";
    });
  }

});
