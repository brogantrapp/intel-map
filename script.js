
document.addEventListener("DOMContentLoaded", () => {

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
  // SAFE NORMALIZER
  // =========================

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/\./g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  // =========================
  // LOAD RISK DATA (SAFE)
  // =========================

  async function loadRisk() {
    try {
      const res = await fetch(
        "https://raw.githubusercontent.com/brogantrapp/intel-map/main/data/risk.json?t=" + Date.now()
      );

      const raw = await res.json();

      riskMap = {};

      for (const [k, v] of Object.entries(raw)) {
        riskMap[norm(k)] = v;
      }

      console.log("✅ Risk loaded:", Object.keys(riskMap).length);

      applyColors();

    } catch (e) {
      console.error("❌ Risk load failed:", e);
    }
  }

  // =========================
  // COLOR LOGIC
  // =========================

  function getColor(level) {
    if (level === 1) return "#00ff88";
    if (level === 2) return "#ffee00";
    if (level === 3) return "#ff7a00";
    if (level === 4) return "#ff2a2a";
    return "#00ff88";
  }

  // =========================
  // APPLY COLORS (SAFE MATCHING)
  // =========================

  function applyColors() {

    if (!geojsonData) return;

    const expr = ["match", ["get", "name"]];

    geojsonData.features.forEach(f => {

      const name = f.properties.name;
      const level = riskMap[norm(name)];

      expr.push(
        name,
        colorsEnabled ? getColor(level || 1) : "#1a1f25"
      );
    });

    expr.push("#1a1f25");

    try {
      map.setPaintProperty("countries-fill", "fill-color", expr);
    } catch (e) {
      console.error("Color apply failed:", e);
    }
  }

  // =========================
  // HOME BUTTON (CLEAN)
  // =========================

  class HomeControl {
    onAdd(map) {
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const button = document.createElement("button");

      button.innerHTML = "⌂";
      button.title = "Reset View";

      button.style.fontSize = "18px";
      button.style.color = "#00ffff";

      button.onclick = () => {
        map.fitBounds([[-180, -85], [180, 85]]);
      };

      container.appendChild(button);
      return container;
    }

    onRemove() {}
  }

  // =========================
  // NEWS (CORS SAFE + FALLBACK)
  // =========================

  async function loadNews() {

    const panel = document.getElementById("newsPanel");
    if (!panel) {
      console.error("❌ newsPanel missing");
      return;
    }

    panel.innerHTML = "<div style='color:#00ffff'>LOADING NEWS...</div>";

    try {

      // CORS proxy fallback (IMPORTANT FIX)
      const url = "https://feeds.bbci.co.uk/news/world/rss.xml";
      const proxy = "https://api.allorigins.win/raw?url=";

      const res = await fetch(proxy + encodeURIComponent(url));

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
          <a href="${link}" target="_blank" style="color:#9be7ff;">
            ${title}
          </a>
        `;

        panel.appendChild(div);

        count++;
      });

    } catch (e) {
      console.error("❌ News failed:", e);
      panel.innerHTML = "<div style='color:#ff5555'>NEWS UNAVAILABLE</div>";
    }
  }

  // =========================
  // CLOCK (FIXED SAFE VERSION)
  // =========================

  function startClock() {

    const el = document.getElementById("clockText");

    if (!el) {
      console.warn("⚠️ clockText missing");
      return;
    }

    setInterval(() => {

      const now = new Date();

      const est = new Date(
        now.toLocaleString("en-US", {
          timeZone: "America/New_York"
        })
      );

      el.textContent =
        est.toLocaleTimeString() +
        " | " +
        est.toLocaleDateString();

    }, 1000);
  }

  // =========================
  // SEARCH (SAFE + OPTIONAL)
  // =========================

  function setupSearch() {

    const input = document.getElementById("searchBox");

    if (!input) return;

    input.addEventListener("input", (e) => {

      const value = e.target.value.toLowerCase().trim();
      if (!value || !geojsonData) return;

      const match = geojsonData.features.find(f =>
        f.properties.name.toLowerCase().includes(value)
      );

      if (match) {
        const coords = match.geometry.coordinates;

        // fallback: just zoom in globally (safe)
        map.flyTo({ center: [10, 20], zoom: 2 });
      }

    });
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
        "fill-color": "#00ff88",
        "fill-opacity": 0.65
      }
    });

    map.addLayer({
      id: "countries-border",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#0a0f14",
        "line-width": 0.8
      }
    });

    map.addControl(new HomeControl(), "top-right");

    await loadRisk();

    applyColors();
  });

  // =========================
  // TOGGLE
  // =========================

  const toggle = document.getElementById("colorToggle");

  if (toggle) {
    toggle.addEventListener("change", (e) => {
      colorsEnabled = e.target.checked;
      applyColors();
    });
  }

  // =========================
  // INIT SYSTEMS
  // =========================

  loadNews();
  setInterval(loadNews, 60000);

  startClock();
  setupSearch();

});
