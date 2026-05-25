// =========================
// MAP
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
    ` EST | ${time} |  ${date}`;
}

updateClock();

setInterval(updateClock, 1000);


// =========================
// NEWS
// =========================

const fallbackNews = [
  {
    source: "BBC",
    title: "BBC World News",
    url: "https://www.bbc.com/news"
  },
  {
    source: "CNN",
    title: "CNN Global Headlines",
    url: "https://www.cnn.com"
  },
  {
    source: "Reuters",
    title: "Reuters World Updates",
    url: "https://www.reuters.com"
  }
];

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  try {

    const res = await fetch(
      "https://api.gdeltproject.org/api/v2/doc/doc?format=json&maxrecords=8&query=world"
    );

    const data = await res.json();

    const articles = data.articles || fallbackNews;

    panel.innerHTML = "<h3> Live News</h3>";

    articles.forEach(article => {

      const div = document.createElement("div");

      div.className = "news-item";

      div.innerHTML = `
        <div class="source-label">
          ${article.sourceCountry || article.source || "Global"}
        </div>

        <a href="${article.url || "#"}"
           target="_blank">
          ${article.title || "News Update"}
        </a>
      `;

      panel.appendChild(div);

    });

  } catch (err) {

    console.log("News failed:", err);

    panel.innerHTML = "<h3> Backup News</h3>";

    fallbackNews.forEach(article => {

      const div = document.createElement("div");

      div.className = "news-item";

      div.innerHTML = `
        <div class="source-label">
          ${article.source}
        </div>

        <a href="${article.url}"
           target="_blank">
          ${article.title}
        </a>
      `;

      panel.appendChild(div);

    });

  }
}

loadNews();

setInterval(loadNews, 60000);


// =========================
// COUNTRY COLORS
// =========================

const countriesUrl =
  "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json";

const riskLevels = {
  "Russia": "#ff3333",
  "Ukraine": "#ff3333",
  "Iran": "#ff3333",

  "China": "#ffcc00",
  "United States of America": "#ffcc00",
  "India": "#ffcc00",
  "Brazil": "#ffcc00",

  "Canada": "#00ff66",
  "France": "#00ff66",
  "Germany": "#00ff66",
  "United Kingdom": "#00ff66"
};


// =========================
// LOAD COUNTRIES
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

        "Russia", "#ff3333",
        "Ukraine", "#ff3333",
        "Iran", "#ff3333",

        "China", "#ffcc00",
        "United States of America", "#ffcc00",
        "India", "#ffcc00",
        "Brazil", "#ffcc00",

        "Canada", "#00ff66",
        "France", "#00ff66",
        "Germany", "#00ff66",
        "United Kingdom", "#00ff66",

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
      "line-color": "#666",
      "line-width": 0.7,
      "line-opacity": 0.5
    }
  });

}


// =========================
// START
// =========================

map.on("load", () => {

  loadCountries();

});
