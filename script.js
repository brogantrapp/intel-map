
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
  // PROFESSIONAL HOME BUTTON
  // =========================

  class HomeControl {
    onAdd(map) {
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const button = document.createElement("button");

      button.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 10.5L12 3l9 7.5"></path>
          <path d="M5 10v10h14V10"></path>
        </svg>
      `;

      button.title = "Reset View";

      button.style.display = "flex";
      button.style.alignItems = "center";
      button.style.justifyContent = "center";

      button.onclick = () => {
        map.fitBounds([
          [-180, -85],
          [180, 85]
        ]);
      };

      container.appendChild(button);
      return container;
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

    map.addControl(new HomeControl(), "top-right");
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
  // NEWS (FIXED + RELIABLE)
  // =========================

  async function loadNews() {

    const panel = document.getElementById("newsPanel");
    if (!panel) return;

    panel.innerHTML = `
      <div style="font-weight:600; margin-bottom:8px;">
        Latest News
      </div>
    `;

    try {
      const res = await fetch("https://feeds.bbci.co.uk/news/world/rss.xml");
      const text = await res.text();

      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");

      let count = 0;

      items.forEach(item => {

        if (count >= 8) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");
        div.style.padding = "6px 0";
        div.style.borderBottom = "1px solid rgba(255,255,255,0.1)";

        div.innerHTML = `
          <a href="${link}" target="_blank" style="color:#ddd; text-decoration:none;">
            ${title}
          </a>
        `;

        panel.appendChild(div);

        count++;
      });

    } catch (e) {
      console.error("News failed:", e);

      panel.innerHTML += `
        <div style="color:#888; padding-top:8px;">
          News temporarily unavailable
        </div>
      `;
    }
  }

  loadNews();
  setInterval(loadNews, 60000);

});
