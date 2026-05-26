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

  map.addControl(new maplibregl.NavigationControl());

  // =========================
  // MOVE MAP CONTROLS RIGHT
  // =========================

  const style = document.createElement("style");

  style.innerHTML = `
    .maplibregl-ctrl-top-right {
      right: 285px !important;
      top: 70px !important;
    }
  `;

  document.head.appendChild(style);

  // =========================
  // HOME BUTTON
  // =========================

  class HomeControl {

    onAdd(map) {

      this._map = map;

      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");

      btn.className = "home-control-btn";

      btn.title = "Reset View";

      btn.innerHTML = "⌂";

      btn.style.background = "#e6e6e6";
      btn.style.color = "#111";

      btn.onclick = () => {

        map.flyTo({
          center: [0, 20],
          zoom: 1.8,
          bearing: 0,
          pitch: 0,
          duration: 1000
        });

      };

      container.appendChild(btn);

      return container;
    }

    onRemove() {
      this._container?.remove();
      this._map = undefined;
    }
  }

  map.addControl(new HomeControl(), "top-right");

  // =========================
  // CLOCK
  // =========================

  setInterval(() => {

    document.getElementById("clockText").innerText =
      new Date().toLocaleTimeString() +
      " | " +
      new Date().toLocaleDateString();

  }, 1000);

  // =========================
  // COLOR TOGGLE CHECKBOX
  // =========================

  const topbar = document.getElementById("topbar");

  const toggleWrap = document.createElement("label");

  toggleWrap.style.color = "#aaa";
  toggleWrap.style.fontSize = "13px";

  toggleWrap.innerHTML = `
    <input type="checkbox" id="colorToggle" checked />
    Risk Colors
  `;

  topbar.appendChild(toggleWrap);

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

      const xml =
        new DOMParser().parseFromString(text, "text/xml");

      const items = xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 12) return;

        const title =
          item.querySelector("title")?.textContent;

        const link =
          item.querySelector("link")?.textContent;

        const div = document.createElement("div");

        div.innerHTML =
          `<a href="${link}" target="_blank">${title}</a>`;

        panel.appendChild(div);
      });

    } catch (e) {

      panel.innerHTML = "News unavailable";

    }
  }

  loadNews();

  setInterval(loadNews, 60000);

  // =========================
  // WORLD DATA
  // =========================

  const res = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );

  const geojson = await res.json();

  // =========================
  // RISK DATA
  // =========================

  let riskMap = {};

  async function loadRiskData() {

    try {

      const res =
        await fetch("./data/risk.json");

      riskMap =
        await res.json();

      console.log("✅ risk.json loaded");

      applyRiskColors();

    } catch (e) {

      console.error("❌ Risk load failed");

      console.error(e);

    }
  }

  // =========================
  // RISK COLORS
  // =========================

  function getRiskColor(level) {

    switch(level) {

      case 4:
        return "#ff0000";

      case 3:
        return "#ff8800";

      case 2:
        return "#ffee00";

      default:
        return "#00aa44";
    }
  }

  function applyRiskColors() {

    const enabled =
      document.getElementById("colorToggle")?.checked;

    geojson.features.forEach(f => {

      const name =
        f.properties.name.toLowerCase();

      const level =
        riskMap[name] || 1;

      f.properties.riskColor =
        enabled
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
        "fill-color": [
          "get",
          "riskColor"
        ],
        "fill-opacity": 0.7
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

    await loadRiskData();

    setupSearch();

    // =========================
    // COLOR TOGGLE EVENT
    // =========================

    document
      .getElementById("colorToggle")
      .addEventListener("change", () => {

        applyRiskColors();

      });

  });

  // =========================
  // SEARCH SYSTEM
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

      return geojson.features.filter(f =>
        f.properties.name
          .toLowerCase()
          .includes(q)
      ).slice(0, 8);
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

        item.textContent =
          f.properties.name;

        item.onclick = () => {

          input.value =
            f.properties.name;

          dropdown.style.display =
            "none";

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

});
