// =========================
// MAP
// =========================

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [10, 25],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl());


// =========================
// CLOCK
// =========================

function updateClock() {

  const now = new Date();

  const est = new Date(
    now.toLocaleString("en-US", {
      timeZone: "America/New_York"
    })
  );

  const time = est.toLocaleTimeString("en-US");
  const date = est.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  document.getElementById("clockText").textContent =
    `EST ${time} | ${date}`;
}

setInterval(updateClock, 1000);
updateClock();



// =========================
// SMART COUNTRY SEARCH (FULL WORLD)
// =========================

function setupSearch() {

  const box = document.getElementById("searchBox");

  box.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;

    const query = box.value.toLowerCase().trim();

    const features = map.querySourceFeatures("countries");

    let match = null;

    for (const f of features) {

      const name = (f.properties.name || "").toLowerCase();

      if (name.includes(query)) {
        match = f;
        break;
      }
    }

    if (!match) {
      alert("Country not found");
      return;
    }

    // get bounding box of country
    const coords = match.geometry.coordinates;

    let bounds = new maplibregl.LngLatBounds();

    function addCoords(c) {

      if (typeof c[0] === "number") {
        bounds.extend(c);
      } else {
        c.forEach(addCoords);
      }
    }

    addCoords(coords);

    map.fitBounds(bounds, {
      padding: 40,
      maxZoom: 5
    });

  });
}

setupSearch();


// =========================
// TOGGLE
// =========================

let colorsEnabled = true;

document.getElementById("colorToggle").addEventListener("change", (e) => {
  colorsEnabled = e.target.checked;
  updateColors();
});

function updateColors() {

  map.setPaintProperty(
    "countries-fill",
    "fill-color",
    colorsEnabled ? [

      "match",
      ["get", "name"],

      "Russia", "#7a1f1f",
      "Ukraine", "#7a1f1f",
      "Iran", "#7a1f1f",

      "China", "#8a6a1f",
      "United States of America", "#8a6a1f",
      "India", "#8a6a1f",

      "Canada", "#1f5a3a",
      "France", "#1f5a3a",
      "Germany", "#1f5a3a",
      "United Kingdom", "#1f5a3a",

      "#1c1c1c"

    ] : "#2b2b2b"
  );
}


// =========================
// NEWS (SAFE RSS)
// =========================

const feeds = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://www.reuters.com/rssFeed/worldNews"
];

const rssProxy = "https://api.rss2json.com/v1/api.json?rss_url=";

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  let all = [];

  for (const feed of feeds) {

    try {

      const res = await fetch(rssProxy + encodeURIComponent(feed));
      const data = await res.json();

      if (data.items) {

        all.push(...data.items.map(i => ({
          title: i.title,
          link: i.link,
          source: data.feed?.title || "News"
        })));
      }

    } catch (e) {
      console.log("Feed failed:", feed);
    }
  }

  all.slice(0, 12).forEach(a => {

    const div = document.createElement("div");
    div.className = "news-item";

    div.innerHTML = `
      <div class="source-label">${a.source}</div>
      <a href="${a.link}" target="_blank">${a.title}</a>
    `;

    panel.appendChild(div);

  });
}

loadNews();
setInterval(loadNews, 60000);


// =========================
// COUNTRIES
// =========================

map.on("load", async () => {

  const res = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );

  const geo = await res.json();

  map.addSource("countries", {
    type: "geojson",
    data: geo
  });

  map.addLayer({
    id: "countries-fill",
    type: "fill",
    source: "countries",
    paint: {
      "fill-color": "#1c1c1c",
      "fill-opacity": 0.55
    }
  });

  map.addLayer({
    id: "countries-border",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#555",
      "line-width": 0.7
    }
  });

  updateColors();
});
