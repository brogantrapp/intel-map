
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
  // LOAD WORLD DATA
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
        "fill-color": "#2c2c2c",
        "fill-opacity": 0.6
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

    setupSearch(); // IMPORTANT: only runs AFTER data loads
  }

  // =========================
  // AUTOCORRECT MATCH ENGINE
  // =========================

  function findBestMatch(query) {

    query = norm(query);
    if (!query || !geojsonData) return null;

    let best = null;
    let bestScore = 0;

    for (const f of geojsonData.features) {

      const name = norm(f.properties.name);

      let score = 0;

      if (name === query) score = 100;
      else if (name.includes(query)) score = 80;
      else if (query.includes(name)) score = 60;
      else if (name.startsWith(query)) score = 70;

      if (score > bestScore) {
        bestScore = score;
        best = f;
      }
    }

    return best;
  }

  // =========================
  // HIGHLIGHT SYSTEM
  // =========================

  function highlightCountry(feature) {

    if (!feature) return;

    // remove old highlight safely
    if (map.getLayer("highlight-line")) {
      map.removeLayer("highlight-line");
    }

    if (map.getSource("highlight-src")) {
      map.removeSource("highlight-src");
    }

    map.addSource("highlight-src", {
      type: "geojson",
      data: feature
    });

    map.addLayer({
      id: "highlight-line",
      type: "line",
      source: "highlight-src",
      paint: {
        "line-color": "#aaaaaa",   // gray highlight
        "line-width": 2.5
      }
    });
  }

  // =========================
  // SEARCH SYSTEM
  // =========================

  function setupSearch() {

    const input = document.getElementById("searchBox");

    if (!input) {
      console.error("searchBox not found in HTML");
      return;
    }

    input.addEventListener("input", (e) => {

      const value = e.target.value;
      const match = findBestMatch(value);

      if (!match) return;

      // highlight border
      highlightCountry(match);

      // zoom to world (simple safe version)
      map.fitBounds([[-180, -85], [180, 85]], {
        padding: 50,
        duration: 800
      });
    });
  }

  // =========================
  // START
  // =========================

  map.on("load", loadWorld);

});
