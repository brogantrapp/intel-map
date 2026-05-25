// =========================
// MAP SETUP
// =========================

const map = new maplibregl.Map({
  container: "map",

  style:
    "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",

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

  document.getElementById("topbar").innerHTML =
    `EST | ${time} | ${date}`;
}

updateClock();

setInterval(updateClock, 1000);


// =========================
// ENGLISH NEWS ONLY
// =========================

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  try {

    const query =
      "sourcecountry:US OR sourcecountry:UK " +
      "AND (domain:bbc.com OR domain:cnn.com OR domain:reuters.com OR domain:nytimes.com)";

    const url =
      "https://api.gdeltproject.org/api/v2/doc/doc?" +
      "query=" + encodeURIComponent(query) +
      "&format=json" +
      "&maxrecords=10" +
      "&sort=datedesc";

    const res = await fetch(url);

    const data = await res.json();

    const articles = data.articles || [];

    panel.innerHTML = "<h3>LIVE NEWS</h3>";

    if (!articles.length) {

      panel.innerHTML += "<p>No live articles found.</p>";
      return;
    }

    articles.forEach(article => {

      const title = article.title || "News Update";

      const source =
        article.domain ||
        article.sourceCountry ||
        "News";

      const link = article.url || "#";

      const div = document.createElement("div");

      div.className = "news-item";

      div.innerHTML = `
        <div class="source-label">
          ${source.toUpperCase()}
        </div>

        <a href="${link}" target="_blank">
          ${title}
        </a>
      `;

      panel.appendChild(div);

    });

  } catch (err) {

    console.log("News failed:", err);

    panel.innerHTML = `
      <h3>NEWS OFFLINE</h3>

      <div class="news-item">
        <div class="source-label">BBC</div>
        <a href="https://bbc.com/news" target="_blank">
          BBC World News
        </a>
      </div>

      <div class="news-item">
        <div class="source-label">REUTERS</div>
        <a href="https://reuters.com" target="_blank">
          Reuters World Updates
        </a>
      </div>

      <div class="news-item">
        <div class="source-label">CNN</div>
        <a href="https://cnn.com" target="_blank">
          CNN Headlines
        </a>
      </div>
    `;
  }
}

loadNews();

setInterval(loadNews, 60000);


// =========================
// COUNTRY MAP
// =========================

const countriesUrl =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";


// =========================
// COUNTRY COLORS
// =========================

async function loadCountries() {

  const res = await fetch(countriesUrl);

  const geojson = await res.json();

  map.addSource("countries", {
    type: "geojson",
    data: geojson
  });

  map.addLayer({
    id: "country-fills",
    type: "fill",
    source: "countries",

    paint: {

      "fill-color": [

        "match",

        ["get", "name"],

        // HIGH RISK
        "Russia", "#7a1f1f",
        "Ukraine", "#7a1f1f",
        "Iran", "#7a1f1f",

        // MEDIUM RISK
        "China", "#8a6a1f",
        "United States of America", "#8a6a1f",
        "India", "#8a6a1f",
        "Brazil", "#8a6a1f",

        // LOW RISK
        "Canada", "#1f5a3a",
        "France", "#1f5a3a",
        "Germany", "#1f5a3a",
        "United Kingdom", "#1f5a3a",

        // DEFAULT
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
// COUNTRY CLICK POPUP
// =========================

map.on("click", "country-fills", (e) => {

  const country =
    e.features[0].properties.name;

  new maplibregl.Popup()
    .setLngLat(e.lngLat)
    .setHTML(`
      <div style="color:black;">
        <strong>${country}</strong>
      </div>
    `)
    .addTo(map);

});


// =========================
// MAP LOAD
// =========================

map.on("load", () => {

  loadCountries();

});
