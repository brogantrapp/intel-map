
function setupSearch(map, geojsonData) {

  const input = document.getElementById("searchBox");
  if (!input) {
    console.error("searchBox missing");
    return;
  }

  function norm(s) {
    return (s || "")
      .toLowerCase()
      .replace(/\./g, "")
      .trim();
  }

  // =========================
  // FIND MATCHES (AUTOCOMPLETE)
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

    return results.slice(0, 6);
  }

  // =========================
  // HIGHLIGHT LAYER (SAFE)
  // =========================

  function highlight(feature) {

    if (!feature) return;

    if (map.getLayer("highlight-layer")) {
      map.removeLayer("highlight-layer");
    }

    if (map.getSource("highlight-source")) {
      map.removeSource("highlight-source");
    }

    map.addSource("highlight-source", {
      type: "geojson",
      data: feature
    });

    map.addLayer({
      id: "highlight-layer",
      type: "line",
      source: "highlight-source",
      paint: {
        "line-color": "#aaaaaa",
        "line-width": 2.5
      }
    });
  }

  // =========================
  // DROPDOWN UI
  // =========================

  const dropdown = document.createElement("div");

  dropdown.style.position = "absolute";
  dropdown.style.background = "#111";
  dropdown.style.border = "1px solid #333";
  dropdown.style.zIndex = "9999";
  dropdown.style.width = "220px";
  dropdown.style.maxHeight = "220px";
  dropdown.style.overflowY = "auto";
  dropdown.style.display = "none";
  dropdown.style.fontSize = "13px";

  document.body.appendChild(dropdown);

  // =========================
  // INPUT LISTENER
  // =========================

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

      div.style.padding = "8px";
      div.style.cursor = "pointer";
      div.style.color = "#ccc";

      div.onmouseenter = () => {
        div.style.background = "#222";
      };

      div.onmouseleave = () => {
        div.style.background = "transparent";
      };

      // =========================
      // CLICK = SELECT + ZOOM
      // =========================

      div.onclick = () => {

        input.value = f.properties.name;
        dropdown.style.display = "none";

        highlight(f);

        // =========================
        // REAL COUNTRY ZOOM FIX
        // =========================

        const coords = f.geometry.coordinates;
        let bounds = new maplibregl.LngLatBounds();

        function add(c) {
          if (typeof c[0] === "number") {
            bounds.extend(c);
          } else {
            c.forEach(add);
          }
        }

        add(coords);

        map.fitBounds(bounds, {
          padding: 60,
          duration: 900
        });
      };

      dropdown.appendChild(div);
    });

    dropdown.style.display = "block";
  });

  // =========================
  // CLOSE DROPDOWN ON OUTSIDE CLICK
  // =========================

  document.addEventListener("click", (e) => {
    if (e.target !== input) {
      dropdown.style.display = "none";
    }
  });
}
