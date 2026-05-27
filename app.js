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

  map.addControl(
    new maplibregl.NavigationControl(),
    "top-right"
  );

  // =========================
  // HOME BUTTON
  // =========================

  class HomeControl {

    onAdd(map) {

      const container =
        document.createElement("div");

      container.className =
        "maplibregl-ctrl maplibregl-ctrl-group";

      const btn =
        document.createElement("button");

      btn.className =
        "home-control-btn";

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
          duration: 1200
        });

      };

      container.appendChild(btn);

      return container;
    }
  }

  map.addControl(
    new HomeControl(),
    "top-right"
  );

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

    const panel =
      document.getElementById("newsPanel");

    panel.innerHTML =
      "Loading news...";

    try {

      const res =
        await fetch(
          "https://api.allorigins.win/raw?url=" +
          encodeURIComponent(
            "https://feeds.bbci.co.uk/news/world/rss.xml"
          )
        );

      const text =
        await res.text();

      const xml =
        new DOMParser()
        .parseFromString(text, "text/xml");

      const items =
        xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 12) return;

        const title =
          item.querySelector("title")
            ?.textContent;

        const link =
          item.querySelector("link")
            ?.textContent;

        const div =
          document.createElement("div");

        div.innerHTML =
          `<a href="${link}" target="_blank">${title}</a>`;

        panel.appendChild(div);
      });

    } catch (err) {

      console.error(err);

      panel.innerHTML =
        "News unavailable";
    }
  }

  loadNews();
  setInterval(loadNews, 60000);

  // =========================
  // LOAD GEOJSON
  // =========================

  const geojson =
    await fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
    ).then(r => r.json());

  // =========================
  // LOAD RISK.JSON
  // =========================

  let riskMap = {};
  let riskIndex = {};
  let colorsEnabled = true;

  try {

    const res =
      await fetch("/data/risk.json");

    riskMap =
      await res.json();

    console.log("✅ risk.json loaded");

  } catch (err) {

    console.error("❌ FAILED TO LOAD risk.json", err);
  }

  // =========================
  // NORMALIZE
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
  // BUILD RISK INDEX
  // =========================

  Object.entries(riskMap).forEach(([k, v]) => {

    riskIndex[normalize(k)] = v;
  });

  // =========================
  // ALIASES
  // =========================

  const aliases = {
    "united states of america": "united states",
    "russian federation": "russia",
    "iran islamic republic of": "iran",
    "korea republic of": "south korea",
    "korea democratic peoples republic of": "north korea",
    "viet nam": "vietnam",
    "syrian arab republic": "syria",
    "bolivia plurinational state of": "bolivia",
    "moldova republic of": "moldova",
    "lao peoples democratic republic": "laos",
    "united republic of tanzania": "tanzania",
    "czech republic": "czechia",
    "macedonia": "north macedonia"
  };

  // =========================
  // COLORS
  // =========================

  function getColor(level) {

    switch (Number(level)) {

      case 4:
        return "#c0392b";

      case 3:
        return "#e67e22";

      case 2:
        return "#f1c40f";

      default:
        return "#2ecc71";
    }
  }

  // =========================
  // GLOBAL RISK INDEX (ADDED)
  // =========================

  function updateGlobalRiskIndex() {

    const values = Object.values(riskIndex);

    if (!values.length) return;

    let sum = 0;

    values.forEach(v => sum += Number(v));

    const avg = sum / values.length;

    const el =
      document.getElementById("riskLevelText");

    if (!el) return;

    if (avg >= 3) {
      el.innerText = "SEVERE";
      el.style.color = "#c0392b";
    } else if (avg >= 2.3) {
      el.innerText = "HIGH";
      el.style.color = "#e67e22";
    } else if (avg >= 1.6) {
      el.innerText = "MODERATE";
      el.style.color = "#f1c40f";
    } else {
      el.innerText = "LOW";
      el.style.color = "#2ecc71";
    }
  }

  // =========================
  // APPLY COLORS
  // =========================

  function applyColors() {

    geojson.features.forEach(f => {

      let name = normalize(f.properties.name);

      if (aliases[name]) {
        name = aliases[name];
      }

      const level =
        riskIndex[name] ?? 1;

      f.properties.color =
        colorsEnabled
          ? getColor(level)
          : "#2a2a2a";
    });

    if (map.getSource("countries")) {

      map.getSource("countries")
        .setData(geojson);
    }
  }

  // =========================
  // MAP LOAD
  // =========================

  map.on("load", () => {

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
        "fill-opacity": 0.78
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

    applyColors();
    updateGlobalRiskIndex(); // ✅ ADDED

    const toggle =
      document.getElementById("colorToggle");

    if (toggle) {

      toggle.addEventListener("change", (e) => {

        colorsEnabled = e.target.checked;
        applyColors();
      });
    }

    setupSearch();
  });

  // =========================
  // SEARCH
  // =========================

  function setupSearch() {

    const input =
      document.getElementById("searchBox");

    const dropdown =
      document.createElement("div");

    dropdown.className = "searchDropdown";
    dropdown.style.display = "none";
    document.body.appendChild(dropdown);

    function matches(q) {

      q = q.toLowerCase();

      return geojson.features
        .filter(f =>
          f.properties.name
            .toLowerCase()
            .includes(q)
        )
        .slice(0, 8);
    }

    function highlight(f) {

      if (map.getLayer("highlight")) {
        map.removeLayer("highlight");
      }

      if (map.getSource("highlight-src")) {
        map.removeSource("highlight-src");
      }

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

      const value = e.target.value;

      const list = matches(value);

      dropdown.innerHTML = "";

      if (!list.length) {
        dropdown.style.display = "none";
        return;
      }

      const rect =
        input.getBoundingClientRect();

      dropdown.style.left =
        rect.left + "px";

      dropdown.style.top =
        rect.bottom + "px";

      list.forEach(f => {

        const item =
          document.createElement("div");

        item.className = "searchItem";
        item.textContent = f.properties.name;

        item.onclick = () => {

          input.value = f.properties.name;
          dropdown.style.display = "none";

          highlight(f);

          const bounds =
            new maplibregl.LngLatBounds();

          function add(c) {
            if (typeof c[0] === "number") {
              bounds.extend(c);
            } else {
              c.forEach(add);
            }
          }

          add(f.geometry.coordinates);

          map.fitBounds(bounds, {
            padding: 50,
            duration: 1200
          });

          // 🔥 ADDED COUNTRY PANEL TRIGGER
          showCountryPanel(f);
        };

        dropdown.appendChild(item);
      });

      dropdown.style.display = "block";
    });

    document.addEventListener("click", e => {

      if (e.target !== input) {
        dropdown.style.display = "none";
      }
    });
  }

  // =========================
  // COUNTRY PANEL (ADDED)
  // =========================

  function showCountryPanel(f) {

    const panel =
      document.getElementById("countryPanel");

    if (!panel) return;

    panel.classList.remove("hidden");

    let name =
      normalize(f.properties.name);

    if (aliases[name]) name = aliases[name];

    const level =
      riskIndex[name] ?? 1;

    const labels = {
      1: "LOW RISK",
      2: "CAUTION",
      3: "HIGH CAUTION",
      4: "DO NOT TRAVEL"
    };

    document.getElementById("countryName")
      .innerText = f.properties.name;

    document.getElementById("countryRiskText")
      .innerText = level;

    document.getElementById("countryRegion")
      .innerText = f.properties.region || "Global";

    document.getElementById("countryStatus")
      .innerText = labels[level];

    const badge =
      document.getElementById("countryRiskBadge");

    badge.innerText = labels[level];
    badge.style.background = getColor(level);
    badge.style.color = "#fff";
  }

});
