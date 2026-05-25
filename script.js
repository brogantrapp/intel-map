
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
// TOGGLE STATE
// =========================

let colorsEnabled = true;


// =========================
// NEWS (STABLE RSS)
// =========================

const feeds = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://www.reuters.com/rssFeed/worldNews",
  "https://feeds.a.dj.com/rss/RSSWorldNews.xml"
];

const rssProxy = "https://api.rss2json.com/v1/api.json?rss_url=";

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  let all = [];

  try {

    for (const feed of feeds) {

      const res = await fetch(rssProxy + encodeURIComponent(feed));

      const data = await res.json();

      if (data.items) {

        all.push(...data.items.map(i => ({
          title: i.title,
          link: i.link,
          source: data.feed?.title || "News"
        })));
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

  } catch (err) {

    panel.innerHTML += "<p>News unavailable</p>";
  }
}

loadNews();
setInterval(loadNews, 60000);


// =========================
// COUNTRIES
// =========================

const url =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

function getColor(name) {

  if (!colorsEnabled) return "#2b2b2b";

  switch (name) {

    case "Russia":
    case "Ukraine":
    case "Iran":
      return "#7a1f1f";

    case "China":
    case "United States of America":
    case "India":
      return "#8a6a1f";

    case "Canada":
    case "France":
    case "Germany":
    case "United Kingdom":
      return "#1f5a3a";

    default:
      return "#1c1c1c";
  }
}

async function loadCountries() {

  const res = await fetch(url);
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
      "fill-color": [
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
      ],
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

  updateColorLayer();
}


// =========================
// TOGGLE LOGIC
// =========================

function updateColorLayer() {

  if (!map.getLayer("countries-fill")) return;

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
// TOGGLE SWITCH
// =========================

document.addEventListener("DOMContentLoaded", () => {

  document.getElementById("colorToggle").addEventListener("change", (e) => {

    colorsEnabled = e.target.checked;

    updateColorLayer();

  });
});


// =========================
// INIT MAP
// =========================

map.on("load", () => {
  loadCountries();
});
