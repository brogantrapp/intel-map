document.addEventListener("DOMContentLoaded", () => {

  // =========================
  // MAP
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
  // NORMALIZER
  // =========================

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/\./g, "")
      .trim();
  }

  // =========================
  // LOAD COUNTRIES
  // =========================

  async function loadCountries() {

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
        "fill-color": "#2a2a2a",
        "fill-opacity": 0.65
      }
    });

    map.addLayer({
      id: "countries-border",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#111",
        "line-width": 0.7
      }
    });

    await loadRisk();
    setupSearch();
  }

  // =========================
  // LOAD RISK
  // =========================

  async function loadRisk() {

    try {

      const res = await fetch(
        "https://raw.githubusercontent.com/brogantrapp/intel-map/main/data/risk.json?t=" + Date.now()
      );

      riskMap = await res.json();

      applyColors();

    } catch (e) {
      console.error("Risk failed:", e);
    }
  }

  // =========================
  // COLORS
  // =========================

  function getColor(level) {

    if (level === 1) return "#00aa55";
    if (level === 2) return "#d4c000";
    if (level === 3) return "#d97a00";
    if (level === 4) return "#c0392b";

    return "#2a2a2a";
  }

  function applyColors() {

    if (!geojsonData) return;

    const expr = ["match", ["get", "name"]];

    geojsonData.features.forEach(f => {

      const level = riskMap[norm(f.properties.name)] || 1;

      expr.push(
        f.properties.name,
        colorsEnabled ? getColor(level) : "#2a2a2a"
      );
    });

    expr.push("#2a2a2a");

    map.setPaintProperty(
      "countries-fill",
      "fill-color",
      expr
    );
  }

  // =========================
  // SEARCH
  // =========================

  function setupSearch() {

    const input = document.getElementById("searchBox");

    const dropdown = document.createElement("div");
    dropdown.className = "searchDropdown";
    dropdown.style.display = "none";

    document.body.appendChild(dropdown);

    function getMatches(query) {

      query = norm(query);

      if (!query) return [];

      return geojsonData.features.filter(f => {

        const name = norm(f.properties.name);

        return (
          name.includes(query) ||
          name.startsWith(query)
        );

      }).slice(0, 8);
    }

    function highlight(feature) {

      if (map.getLayer("highlight")) {
        map.removeLayer("highlight");
      }

      if (map.getSource("highlight-src")) {
        map.removeSource("highlight-src");
      }

      map.addSource("highlight-src", {
        type: "geojson",
        data: feature
      });

      map.addLayer({
        id: "highlight",
        type: "line",
        source: "highlight-src",
        paint: {
          "line-color": "#bbbbbb",
          "line-width": 3
        }
      });
    }

    input.addEventListener("input", e => {

      const value = e.target.value;

      const matches = getMatches(value);

      dropdown.innerHTML = "";

      if (!matches.length) {
        dropdown.style.display = "none";
        return;
      }

      const rect = input.getBoundingClientRect();

      dropdown.style.left = rect.left + "px";
      dropdown.style.top = rect.bottom + "px";

      matches.forEach(f => {

        const item = document.createElement("div");

        item.className = "searchItem";
        item.textContent = f.properties.name;

        item.onclick = () => {

          input.value = f.properties.name;
          dropdown.style.display = "none";

          highlight(f);

          const bounds = new maplibregl.LngLatBounds();

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
            duration: 1000
          });
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
  // NEWS
  // =========================

  async function loadNews() {

    const panel = document.getElementById("newsPanel");

    panel.innerHTML = "Loading news...";

    try {

      const proxy = "https://api.allorigins.win/raw?url=";
      const url = "https://feeds.bbci.co.uk/news/world/rss.xml";

      const res = await fetch(
        proxy + encodeURIComponent(url)
      );

      const text = await res.text();

      const xml = new DOMParser().parseFromString(
        text,
        "text/xml"
      );

      const items = xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 12) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");

        div.innerHTML = `
          <a href="${link}" target="_blank">
            ${title}
          </a>
        `;

        panel.appendChild(div);
      });

    } catch (e) {

      console.error(e);

      panel.innerHTML = "News unavailable";
    }
  }

  // =========================
  // CLOCK
  // =========================

  function startClock() {

    const el = document.getElementById("clockText");

    setInterval(() => {

      const now = new Date();

      el.textContent =
        now.toLocaleTimeString() +
        " | " +
        now.toLocaleDateString();

    }, 1000);
  }

  // =========================
  // TOGGLE
  // =========================

  document.getElementById("colorToggle")
    .addEventListener("change", e => {

      colorsEnabled = e.target.checked;
      applyColors();
    });

  // =========================
  // START
  // =========================

  map.on("load", loadCountries);

  loadNews();
  setInterval(loadNews, 60000);

  startClock();

});
