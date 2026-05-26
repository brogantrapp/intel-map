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
  // HOME BUTTON (MAP CONTROL)
  // =========================

  class HomeControl {
    onAdd(map) {

      this._map = map;

      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.innerHTML = "🏠";
      btn.title = "Reset View";

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
      this._container.remove();
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

      const xml = new DOMParser().parseFromString(text, "text/xml");

      const items = xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 12) return;

        const title = item.querySelector("title")?.textContent;
        const link = item.querySelector("link")?.textContent;

        const div = document.createElement("div");

        div.innerHTML = `<a href="${link}" target="_blank">${title}</a>`;

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

  let riskMap = {};
  let colorsEnabled = true;

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
        "fill-color": "#2a2a2a",
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

    setupSearch();
  });

  // =========================
  // SEARCH + DROPDOWN
  // =========================

  function setupSearch() {

    const input = document.getElementById("searchBox");

    const dropdown = document.createElement("div");
    dropdown.className = "searchDropdown";
    dropdown.style.display = "none";
    document.body.appendChild(dropdown);

    function matches(q) {

      q = q.toLowerCase();

      return geojson.features.filter(f =>
        f.properties.name.toLowerCase().includes(q)
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
          "line-color": "#bbbbbb",
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

      const rect = input.getBoundingClientRect();

      dropdown.style.left = rect.left + "px";
      dropdown.style.top = rect.bottom + "px";

      list.forEach(f => {

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
      if (e.target !== input) dropdown.style.display = "none";
    });
  }

});
