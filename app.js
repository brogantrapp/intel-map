document.addEventListener("DOMContentLoaded", async () => {

  const map = new maplibregl.Map({
    container: "map",
    style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    center: [0, 20],
    zoom: 1.0
  });

  map.addControl(new maplibregl.NavigationControl(), "top-right");

  class HomeControl {
    onAdd(map) {
      const container = document.createElement("div");
      container.className = "maplibregl-ctrl maplibregl-ctrl-group";

      const btn = document.createElement("button");
      btn.innerHTML = "⌂";
      btn.title = "Reset View";
      btn.style.background = "#e6e6e6";
      btn.style.color = "#111";

      btn.onclick = () => {
        map.flyTo({
          center: [0, 20],
          zoom: 1.0,
          bearing: 0,
          pitch: 0,
          duration: 1200
        });
      };

      container.appendChild(btn);
      return container;
    }
  }

  map.addControl(new HomeControl(), "top-right");

  function updateClock() {
    document.getElementById("clockText").innerText =
      new Date().toLocaleTimeString() +
      " | " +
      new Date().toLocaleDateString();
  }

  updateClock();
  setInterval(updateClock, 1000);

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

    } catch (err) {
      panel.innerHTML = "News unavailable";
    }
  }

  loadNews();
  setInterval(loadNews, 60000);

  const geojson = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  ).then(r => r.json());

  let riskData = {};
  let colorsEnabled = true;

  try {
    riskData = await fetch("/data/risk.json").then(r => r.json());
  } catch (err) {
    console.error("risk.json failed", err);
  }

  function normalize(name) {
    return name
      .toLowerCase()
      .replace(/\(.*?\)/g, "")
      .replace(/[.,']/g, "")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getColor(level) {
    switch (Number(level)) {
      case 4: return "#c0392b";
      case 3: return "#e67e22";
      case 2: return "#f1c40f";
      default: return "#2ecc71";
    }
  }

  function getRegion(name) {

    const n = normalize(name);

    const middleEast = [
      "afghanistan","iran","iraq","syria","yemen","saudi arabia",
      "united arab emirates","qatar","kuwait","bahrain","oman","israel","lebanon","jordan"
    ];

    if (middleEast.includes(n)) return "Middle East";

    if ([
      "france","germany","italy","spain","norway","sweden","finland","poland","uk","united kingdom"
    ].includes(n)) return "Europe";

    if ([
      "united states","canada","mexico"
    ].includes(n)) return "North America";

    if ([
      "brazil","argentina","chile","peru","colombia"
    ].includes(n)) return "South America";

    if ([
      "china","japan","india","south korea","indonesia"
    ].includes(n)) return "Asia";

    if ([
      "australia","new zealand"
    ].includes(n)) return "Oceania";

    return "Unknown";
  }

  function updateInfo(countryName, level) {

    const panel = document.getElementById("infoPanel");
    if (!panel) return;

    const region = getRegion(countryName);

    let label = "Low Risk";
    if (level == 2) label = "Moderate Risk";
    if (level == 3) label = "High Risk";
    if (level == 4) label = "Extreme Risk";

    panel.innerHTML = `
      <h3>${countryName}</h3>
      <p><b>Risk:</b> ${level}</p>
      <p><b>Status:</b> ${label}</p>
      <p><b>Region:</b> ${region}</p>
    `;
  }

  function applyColors() {

    geojson.features.forEach(f => {

      const name = normalize(f.properties.name);

      const match = Object.entries(riskData)
        .find(([k]) => normalize(k) === name);

      const level = match ? (match[1]?.risk ?? match[1]) : 1;

      f.properties.color =
        colorsEnabled ? getColor(level) : "#2a2a2a";
    });

    if (map.getSource("countries")) {
      map.getSource("countries").setData(geojson);
    }
  }

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
        "fill-color": ["get", "color"],
        "fill-opacity": 0.78
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

    applyColors();

    document.getElementById("colorToggle")
      ?.addEventListener("change", e => {
        colorsEnabled = e.target.checked;
        applyColors();
      });

    setupSearch();
  });

  function setupSearch() {

    const input = document.getElementById("searchBox");
    const dropdown = document.createElement("div");
    dropdown.className = "searchDropdown";
    dropdown.style.display = "none";
    document.body.appendChild(dropdown);

    function matches(q) {
      q = normalize(q);

      return geojson.features
        .filter(f => normalize(f.properties.name).includes(q))
        .slice(0, 8);
    }

    function highlight(f) {

      if (map.getLayer("highlight")) map.removeLayer("highlight");
      if (map.getSource("highlight-src")) map.removeSource("highlight-src");

      map.addSource("highlight-src", {
        type: "geojson",
        data: f
      });

      map.addLayer({
        id: "highlight",
        type: "line",
        source: "highlight-src",
        paint: {
          "line-color": "#fff",
          "line-width": 3
        }
      });
    }

    input.addEventListener("input", e => {

      const list = matches(e.target.value);

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

          const match = Object.entries(riskData)
            .find(([k]) => normalize(k) === normalize(f.properties.name));

          const level = match ? (match[1]?.risk ?? match[1]) : 1;

          highlight(f);
          updateInfo(f.properties.name, level);

          const bounds = new maplibregl.LngLatBounds();

          function add(c) {
            if (typeof c[0] === "number") bounds.extend(c);
            else c.forEach(add);
          }

          add(f.geometry.coordinates);

          map.fitBounds(bounds, {
            padding: 50,
            duration: 1200
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
