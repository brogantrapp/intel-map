
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

  // =========================
  // NORMALIZE
  // =========================

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/\./g, "")
      .trim();
  }

  // =========================
  // LOAD MAP DATA
  // =========================

  async function loadWorld() {

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
        "fill-opacity": 0.6
      }
    });

    map.addLayer({
      id: "countries-border",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#111",
        "line-width": 0.8
      }
    });

    setupSearch();
  }

  // =========================
  // HIGHLIGHT (ONLY ON CLICK)
  // =========================

  function highlight(feature) {

    if (!feature) return;

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
        "line-color": "#aaaaaa",
        "line-width": 3
      }
    });
  }

  // =========================
  // AUTOCOMPLETE ENGINE
  // =========================

  function getMatches(query) {

    query = norm(query);
    if (!query || !geojsonData) return [];

    const results = [];

    for (const f of geojsonData.features) {

      const name = norm(f.properties.name);

      if (
        name.includes(query) ||
        query.includes(name) ||
        name.startsWith(query)
      ) {
        results.push(f);
      }
    }

    return results.slice(0, 6); // limit dropdown
  }

  // =========================
  // SEARCH UI (DROPDOWN)
  // =========================

  function setupSearch() {

    const input = document.getElementById("searchBox");

    if (!input) {
      console.error("searchBox missing");
      return;
    }

    // create dropdown
    const dropdown = document.createElement("div");
    dropdown.style.position = "absolute";
    dropdown.style.background = "#111";
    dropdown.style.border = "1px solid #333";
    dropdown.style.zIndex = "9999";
    dropdown.style.width = "200px";
    dropdown.style.maxHeight = "200px";
    dropdown.style.overflowY = "auto";
    dropdown.style.display = "none";

    document.body.appendChild(dropdown);

    input.addEventListener("input", (e) => {

      const rect = input.getBoundingClientRect();
      dropdown.style.left = rect.left + "px";
      dropdown.style.top = rect.bottom + "px";

      const matches = getMatches(e.target.value);

      dropdown.innerHTML = "";

      if (matches.length === 0) {
        dropdown.style.display = "none";
        return;
      }

      matches.forEach(f => {

        const div = document.createElement("div");

        div.textContent = f.properties.name;
        div.style.padding = "6px";
        div.style.cursor = "pointer";
        div.style.color = "#ccc";

        div.onmouseenter = () => {
          div.style.background = "#222";
        };

        div.onmouseleave = () => {
          div.style.background = "transparent";
        };

        div.onclick = () => {

          input.value = f.properties.name;
          dropdown.style.display = "none";

          highlight(f);

          map.fitBounds([[-180, -85], [180, 85]], {
            padding: 60,
            duration: 800
          });
        };

        dropdown.appendChild(div);
      });

      dropdown.style.display = "block";
    });

    document.addEventListener("click", (e) => {
      if (e.target !== input) {
        dropdown.style.display = "none";
      }
    });
  }

  // =========================
  // NEWS (FIXED + BIGGER + RELIABLE)
  // =========================

  async function loadNews() {

    const panel = document.getElementById("newsPanel");

    if (!panel) return;

    panel.style.fontSize = "14px";
    panel.style.lineHeight = "1.4";
    panel.innerHTML = "<div style='color:#aaa'>Loading news...</div>";

    try {

      const proxy = "https://api.allorigins.win/raw?url=";
      const url = "https://feeds.bbci.co.uk/news/world/rss.xml";

      const res = await fetch(proxy + encodeURIComponent(url));
      const text = await res.text();

      const xml = new DOMParser().parseFromString(text, "text/xml");
      const items = xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 12) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");
        div.style.padding = "10px";
        div.style.borderBottom = "1px solid #222";

        div.innerHTML = `
          <a href="${link}" target="_blank" style="color:#9ecbff; text-decoration:none;">
            ${title}
          </a>
        `;

        panel.appendChild(div);
      });

    } catch (e) {
      console.error("News failed:", e);
      panel.innerHTML = "<div style='color:red'>News unavailable</div>";
    }
  }

  // =========================
  // START
  // =========================

  map.on("load", loadWorld);

  loadNews();
  setInterval(loadNews, 60000);

});
