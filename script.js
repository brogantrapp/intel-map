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
// SEARCH FUNCTION
// =========================

const countryCoords = {
  "united states of america": [-98, 39],
  "canada": [-106, 56],
  "mexico": [-102, 23],
  "brazil": [-51, -10],
  "united kingdom": [-3, 55],
  "france": [2, 46],
  "germany": [10, 51],
  "russia": [105, 61],
  "china": [104, 35],
  "india": [78, 22],
  "japan": [138, 36],
  "australia": [133, -25],
  "iran": [53, 32],
  "ukraine": [31, 49]
};

function setupSearch() {

  const box = document.getElementById("searchBox");

  box.addEventListener("keydown", (e) => {

    if (e.key !== "Enter") return;

    const query = box.value.toLowerCase().trim();

    const coords = countryCoords[query];

    if (coords) {

      map.flyTo({
        center: coords,
        zoom: 4
      });

    } else {

      alert("Country not found in database");
    }
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
  });
}
