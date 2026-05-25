
// =========================
// SAFE DOM READY WRAPPER (IMPORTANT FIX)
// =========================

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

  let geojsonData;
  let riskMap = {};
  let colorsEnabled = true;


  // =========================
  // NORMALIZER
  // =========================

  function norm(s) {
    return (s || "").toLowerCase().trim();
  }


  // =========================
  // LOAD RISK
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

    } catch (e) {
      console.error("Risk load failed:", e);
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
  // APPLY COLORS
  // =========================

  function applyColors() {

    if (!geojsonData) return;

    const expr = ["match", ["get", "name"]];

    geojsonData.features.forEach(f => {

      const name = f.properties.name;
      const level = riskMap[norm(name)];

      expr.push(
        name,
        colorsEnabled ? getColor(level || 1) : "#2a2a2a"
      );
    });

    expr.push("#2ecc71");

    map.setPaintProperty("countries-fill", "fill-color", expr);
  }


  // =========================
  // HOME BUTTON (FIXED + GUARANTEED)
  // =========================

  class HomeControl {
    onAdd(map) {
      const div = document.createElement("div");
      div.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.innerHTML = "🏠";
      btn.title = "Reset View";

      btn.onclick = () => {
        map.fitBounds([
          [-180, -85],
          [180, 85]
        ]);
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

    await loadRisk();

    applyColors();

    // 🔥 HOME BUTTON ADDED HERE (ENSURES IT ALWAYS WORKS)
    map.addControl(new HomeControl(), "top-right");
  });


  // =========================
  // TOGGLE (FIXED)
  // =========================

  const toggle = document.getElementById("colorToggle");

  if (toggle) {
    toggle.addEventListener("change", (e) => {
      colorsEnabled = e.target.checked;
      applyColors();
    });
  } else {
    console.error("❌ colorToggle not found in HTML");
  }

});
