
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
// CLOCK (CENTERED TOP BAR)
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

  document.getElementById("topbar").innerHTML =
    `EST ${time} | ${date}`;
}

updateClock();
setInterval(updateClock, 1000);


// =========================
// RELIABLE ENGLISH NEWS (RSS)
// =========================

const feeds = [
  "https://feeds.bbci.co.uk/news/world/rss.xml",
  "https://rss.cnn.com/rss/edition_world.rss",
  "https://www.reuters.com/rssFeed/worldNews",
  "https://feeds.a.dj.com/rss/RSSWorldNews.xml"
];

// RSS → JSON proxy (works in browser)
const rssProxy = "https://api.rss2json.com/v1/api.json?rss_url=";

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  panel.innerHTML = "<h3>LIVE NEWS</h3>";

  let allArticles = [];

  try {

    for (const feed of feeds) {

      const res = await fetch(rssProxy + encodeURIComponent(feed));

      const data = await res.json();

      if (data.items) {

        const items = data.items.map(item => ({
          title: item.title,
          link: item.link,
          source: data.feed?.title || "News"
        }));

        allArticles = allArticles.concat(items);
      }
    }

    if (!allArticles.length) {
      panel.innerHTML += "<p>No news available.</p>";
      return;
    }

    // limit + display
    allArticles.slice(0, 12).forEach(article => {

      const div = document.createElement("div");
      div.className = "news-item";

      div.innerHTML = `
        <div class="source-label">
          ${article.source}
        </div>

        <a href="${article.link}" target="_blank">
          ${article.title}
        </a>
      `;

      panel.appendChild(div);

    });

  } catch (err) {

    console.log("News error:", err);

    panel.innerHTML = `
      <h3>NEWS OFFLINE</h3>

      <div class="news-item">
        <div class="source-label">BBC</div>
        <a href="https://bbc.com/news" target="_blank">BBC News</a>
      </div>

      <div class="news-item">
        <div class="source-label">REUTERS</div>
        <a href="https://reuters.com" target="_blank">Reuters</a>
      </div>
    `;
  }
}

loadNews();
setInterval(loadNews, 60000);


// =========================
// COUNTRIES
// =========================

const countriesUrl =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

async function loadCountries() {

  const res = await fetch(countriesUrl);
  const geojson = await res.json();

  map.addSource("countries", {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    id: "country-fill",
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
    id: "country-borders",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#555",
      "line-width": 0.7,
      "line-opacity": 0.5
    }
  });
}


// =========================
// INIT MAP
// =========================

map.on("load", () => {
  loadCountries();
});
