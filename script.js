
// =========================
// MAP SETUP
// =========================

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [0, 20],
  zoom: 2
});

map.addControl(new maplibregl.NavigationControl());


// =========================
// EST CLOCK + DATE
// =========================

function updateClock() {

  const now = new Date();

  const est = new Date(
    now.toLocaleString("en-US", { timeZone: "America/New_York" })
  );

  const time = est.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  });

  const date = est.toLocaleDateString("en-US", {
    weekday: "short",
    year: "numeric",
    month: "short",
    day: "numeric"
  });

  document.getElementById("topbar").innerHTML =
    `🕒 EST Time: ${time} | 📅 ${date}`;
}

setInterval(updateClock, 1000);
updateClock();


// =========================
// NEWS SYSTEM (LIVE + FALLBACK SAFE)
// =========================

const fallbackNews = [
  { source: "BBC", title: "Global news update", url: "https://www.bbc.com/news" },
  { source: "CNN", title: "Breaking world headlines", url: "https://www.cnn.com" },
  { source: "Reuters", title: "Global economic updates", url: "https://www.reuters.com" },
  { source: "NY Times", title: "Top world stories", url: "https://www.nytimes.com" }
];

async function loadNews() {

  const panel = document.getElementById("newsPanel");

  try {

    const res = await fetch(
      "https://api.gdeltproject.org/api/v2/doc/doc?format=json&maxrecords=10&query=bbc%20OR%20cnn%20OR%20reuters%20OR%20nytimes"
    );

    const data = await res.json();

    const articles = data.articles || data.result || [];

    panel.innerHTML = "<h3>📰 Live News</h3>";

    const newsToShow = articles.length ? articles : fallbackNews;

    newsToShow.forEach(a => {

      const title = a.title || "News Update";
      const url = a.url || "#";
      const source = a.sourceCountry || a.source || "Global";

      const div = document.createElement("div");
      div.className = "news-item";

      div.innerHTML = `
        <div class="source-label">${source}</div>
        <div style="margin-top:5px;">
          <a href="${url}" target="_blank"
             style="color:#00ffff; text-decoration:none;">
            ${title}
          </a>
        </div>
      `;

      panel.appendChild(div);

    });

  } catch (err) {

    console.log("News error:", err);

    const panel = document.getElementById("newsPanel");
    panel.innerHTML = "<h3>📰 Offline News</h3>";

    fallbackNews.forEach(a => {

      const div = document.createElement("div");
      div.className = "news-item";

      div.innerHTML = `
        <div class="source-label">${a.source}</div>
        <div style="margin-top:5px;">
          <a href="${a.url}" target="_blank"
             style="color:#00ffff; text-decoration:none;">
            ${a.title}
          </a>
        </div>
      `;

      panel.appendChild(div);

    });

  }
}

loadNews();
setInterval(loadNews, 60000);


// =========================
// COUNTRY RISK SYSTEM
// =========================

const countryRisk = {
  "United States of America": 2,
  "Canada": 1,
  "United Kingdom": 1,
  "France": 1,
  "Germany": 1,
  "Russia": 3,
  "Ukraine": 3,
  "China": 2,
  "Iran": 3,
  "Israel": 3,
  "India": 2,
  "Brazil": 2
};

function getColor(level) {

  if (level === 1) return "#00ff66"; // green
  if (level === 2) return "#ffcc00"; // yellow
  if (level === 3) return "#ff3333"; // red

  return "#2b2b2b";
}


// =========================
// COUNTRY MAP (REAL BORDERS)
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
        "case",

        ["==", ["get", "name"], "United States of America"], getColor(2),
        ["==", ["get", "name"], "Canada"], getColor(1),
        ["==", ["get", "name"], "United Kingdom"], getColor(1),
        ["==", ["get", "name"], "France"], getColor(1),
        ["==", ["get", "name"], "Germany"], getColor(1),
        ["==", ["get", "name"], "Russia"], getColor(3),
        ["==", ["get", "name"], "Ukraine"], getColor(3),
        ["==", ["get", "name"], "China"], getColor(2),
        ["==", ["get", "name"], "Iran"], getColor(3),
        ["==", ["get", "name"], "Israel"], getColor(3),
        ["==", ["get", "name"], "India"], getColor(2),
        ["==", ["get", "name"], "Brazil"], getColor(2),

        "#2b2b2b"
      ],
      "fill-opacity": 0.55
    }
  });

  map.addLayer({
    id: "country-borders",
    type: "line",
    source: "countries",
    paint: {
      "line-color": "#ffffff",
      "line-width": 0.6,
      "line-opacity": 0.25
    }
  });

}


// =========================
// DAILY REFRESH SYSTEM
// =========================

function scheduleDailyRefresh() {

  const now = new Date();
  const next = new Date();
  next.setHours(24, 0, 0, 0);

  const ms = next - now;

  setTimeout(() => {

    console.log("Daily refresh running...");

    loadCountries();

    scheduleDailyRefresh();

  }, ms);

}


// =========================
// INIT
// =========================

map.on("load", () => {

  loadCountries();
  scheduleDailyRefresh();

});
