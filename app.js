document.addEventListener("DOMContentLoaded", async () => {

  // =========================
  // MAP
  // =========================

  const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [0, 20],
    zoom: 1.8
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

      this._map = map;

      this._container =
        document.createElement("div");

      this._container.className =
        "maplibregl-ctrl maplibregl-ctrl-group";

      const btn =
        document.createElement("button");

      btn.className =
        "home-control-btn";

      btn.type = "button";

      btn.innerHTML = "⌂";

      btn.title = "Reset View";

      btn.onclick = () => {

        map.flyTo({
          center: [0, 20],
          zoom: 1.8,
          bearing: 0,
          pitch: 0,
          duration: 1200
        });

      };

      this._container.appendChild(btn);

      return this._container;
    }

    onRemove() {

      this._container.parentNode.removeChild(
        this._container
      );

      this._map = undefined;
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

    panel.innerHTML = "Loading news...";

    try {

      const response =
        await fetch(
          "https://api.allorigins.win/raw?url=" +
          encodeURIComponent(
            "https://feeds.bbci.co.uk/news/world/rss.xml"
          )
        );

      const text =
        await response.text();

      const xml =
        new DOMParser()
        .parseFromString(text, "text/xml");

      const items =
        xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i >= 15) return;

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
  // LOAD MAP GEOJSON
  // =========================

  const geojson =
    await fetch(
      "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
    ).then(r => r.json());

  // =========================
  // LOAD RISK.JSON
  // =========================

  let riskMap = {};

  try {

    const riskResponse =
      await fetch("./data/risk.json");

    riskMap =
      await riskResponse.json();

    console.log(
      "✅ risk.json loaded",
      riskMap
    );

  } catch (err) {

    console.error(
      "❌ FAILED TO LOAD risk.json"
    );

    console.error(err);
  }

  // =========================
  // NORMALIZE COUNTRY NAMES
  // =========================

  function normalize(name) {

    return name
      .toLowerCase()
      .trim()
      .replace(/[.']/g, "")
      .replace(/\s+/g, " ");
  }

  // =========================
  // RISK COLORS
  // =========================

  let colorsEnabled = true;

  function getRiskColor(level) {

    switch(Number(level)) {

      case 4:
        return "#ff0000";

      case 3:
        return "#ff8800";

      case 2:
        return "#ffee00";

      case 1:
      default:
        return "#00aa44";
    }
  }

  // =========================
  // APPLY COLORS
  // =========================

  function applyColors() {

    geojson.features.forEach(feature => {

      const rawName =
        feature.properties.name;

      const name =
        normalize(rawName);

      const level =
        riskMap[name] || 1;

      feature.properties.color =
        colorsEnabled
          ? getRiskColor(level)
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

    // APPLY COLORS FIRST
    applyColors();

    // SOURCE
    map.addSource("countries", {
      type: "geojson",
      data: geojson
    });

    // FILLS
    map.addLayer({
      id: "country-fills",
      type: "fill",
      source: "countries",
      paint: {
        "fill-color": ["get", "color"],
        "fill-opacity": 0.78
      }
    });

    // BORDERS
    map.addLayer({
      id: "country-borders",
      type: "line",
      source: "countries",
      paint: {
        "line-color": "#111",
        "line-width": 0.7
      }
    });

    // SEARCH
    setupSearch();
  });

  // =========================
  // TOGGLE SWITCH
  // =========================

  const colorToggle =
    document.getElementById("colorToggle");

  colorToggle.addEventListener("change", () => {

    colorsEnabled =
      colorToggle.checked;

    applyColors();
  });

  // =========================
  // SEARCH
  // =========================

  function setupSearch() {

    const input =
      document.getElementById("searchBox");

    const dropdown =
      document.createElement("div");

    dropdown.className =
      "searchDropdown";

    dropdown.style.display =
      "none";

    document.body.appendChild(dropdown);

    // MATCHES
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

    // HIGHLIGHT
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
          "line-color": "#ffffff",
          "line-width": 3
        }
      });
    }

    // INPUT
    input.addEventListener("input", e => {

      const value =
        e.target.value;

      const results =
        matches(value);

      dropdown.innerHTML = "";

      if (!value || !results.length) {

        dropdown.style.display =
          "none";

        return;
      }

      const rect =
        input.getBoundingClientRect();

      dropdown.style.left =
        rect.left + "px";

      dropdown.style.top =
        rect.bottom + "px";

      results.forEach(feature => {

        const item =
          document.createElement("div");

        item.className =
          "searchItem";

        item.textContent =
          feature.properties.name;

        item.onclick = () => {

          input.value =
            feature.properties.name;

          dropdown.style.display =
            "none";

          highlight(feature);

          const bounds =
            new maplibregl.LngLatBounds();

          function addCoords(coords) {

            if (
              typeof coords[0] === "number"
            ) {

              bounds.extend(coords);

            } else {

              coords.forEach(addCoords);
            }
          }

          addCoords(
            feature.geometry.coordinates
          );

          map.fitBounds(bounds, {
            padding: 40,
            duration: 1200
          });
        };

        dropdown.appendChild(item);
      });

      dropdown.style.display =
        "block";
    });

    // CLICK OUTSIDE
    document.addEventListener("click", e => {

      if (e.target !== input) {

        dropdown.style.display =
          "none";
      }
    });
  }

});
