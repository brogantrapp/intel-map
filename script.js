document.addEventListener("DOMContentLoaded", async () => {

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

  startClock();

  // =========================
  // NEWS
  // =========================

  async function loadNews() {

    const panel = document.getElementById("newsPanel");

    panel.innerHTML = "Loading news...";

    try {

      const proxy =
        "https://api.allorigins.win/raw?url=";

      const rss =
        "https://feeds.bbci.co.uk/news/world/rss.xml";

      const res = await fetch(
        proxy + encodeURIComponent(rss)
      );

      const text = await res.text();

      const xml =
        new DOMParser().parseFromString(
          text,
          "text/xml"
        );

      const items = xml.querySelectorAll("item");

      panel.innerHTML = "";

      items.forEach((item, i) => {

        if (i > 10) return;

        const title =
          item.querySelector("title")?.textContent;

        const link =
          item.querySelector("link")?.textContent;

        const div =
          document.createElement("div");

        div.innerHTML = `
          <a href="${link}" target="_blank">
            ${title}
          </a>
        `;

        panel.appendChild(div);
      });

    } catch (e) {

      console.error(e);

      panel.innerHTML =
        "News unavailable";
    }
  }

  loadNews();

  // =========================
  // COUNTRIES
  // =========================

  const res = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );

  const geojsonData = await res.json();

  map.on("load", () => {

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
        "fill-opacity": 0.7
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

    dropdown.style.display = "none";

    document.body.appendChild(dropdown);

    input.addEventListener("input", e => {

      const value =
        e.target.value.toLowerCase();

      dropdown.innerHTML = "";

      if (!value) {
        dropdown.style.display = "none";
        return;
      }

      const matches =
        geojsonData.features.filter(f =>
          f.properties.name
            .toLowerCase()
            .includes(value)
        ).slice(0, 8);

      if (!matches.length) {
        dropdown.style.display = "none";
        return;
      }

      const rect =
        input.getBoundingClientRect();

      dropdown.style.left =
        rect.left + "px";

      dropdown.style.top =
        rect.bottom + "px";

      matches.forEach(f => {

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

          // REMOVE OLD
          if (map.getLayer("highlight")) {
            map.removeLayer("highlight");
          }

          if (map.getSource("highlight-src")) {
            map.removeSource("highlight-src");
          }

          // ADD NEW
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

          // ZOOM TO COUNTRY
          const bounds =
            new maplibregl.LngLatBounds();

          function addCoords(c) {
            if (typeof c[0] === "number") {
              bounds.extend(c);
            } else {
              c.forEach(addCoords);
            }
          }

          addCoords(f.geometry.coordinates);

          map.fitBounds(bounds, {
            padding: 40,
            duration: 1000
          });
        };

        dropdown.appendChild(item);
      });

      dropdown.style.display = "block";
    });
  }

});
