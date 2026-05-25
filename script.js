// =========================
// MAP INIT
// =========================

const map = new maplibregl.Map({
  container: "map",
  style: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  center: [10, 20],
  zoom: 1.8
});

map.addControl(new maplibregl.NavigationControl());

let geojsonData = null;
let colorsEnabled = true;
let riskMap = {};


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

  document.getElementById("clockText").textContent =
    est.toLocaleTimeString() +
    " | " +
    est.toLocaleDateString();
}

setInterval(updateClock, 1000);
updateClock();


// =========================
// HOME BUTTON
// =========================

class HomeControl {

  onAdd(map) {

    this.map = map;

    const div = document.createElement("div");

    div.className =
      "maplibregl-ctrl maplibregl-ctrl-group";

    const btn = document.createElement("button");

    btn.innerHTML = "⌂";
    btn.title = "Reset View";

    btn.onclick = () => {

      map.fitBounds(
        [
          [-180, -85],
          [180, 85]
        ],
        {
          padding: 20,
          duration: 1000
        }
      );

      map.setFilter(
        "countries-highlight",
        ["==", "ADMIN", ""]
      );
    };

    div.appendChild(btn);

    return div;
  }

  onRemove() {}
}

map.addControl(new HomeControl(), "top-right");


// =========================
// SEARCH ALIASES
// =========================

const aliases = {

  "usa": "United States of America",
  "us": "United States of America",

  "uk": "United Kingdom",

  "russia": "Russia",

  "drc": "Democratic Republic of the Congo",

  "uae": "United Arab Emirates"
};


// =========================
// LEVEL → COLOR
// =========================

function levelToColor(level) {

  if (level === 1) return "#2ecc71";
  if (level === 2) return "#f1c40f";
  if (level === 3) return "#e67e22";
  if (level === 4) return "#e74c3c";

  return "#2a2a2a";
}


// =========================
// LOAD ADVISORIES
// =========================

async function loadAdvisories() {

  try {

    const url =
      "https://api.allorigins.win/raw?url=" +
      encodeURIComponent(
        "https://travel.state.gov/content/travel/en/traveladvisories/traveladvisories.json"
      );

    const res = await fetch(url);

    const data = await res.json();

    const temp = {};

    const list = data.data || data || [];

    // COUNTRY NAME FIXES
    const nameFixes = {

      "united states":
        "united states of america",

      "russian federation":
        "russia",

      "korea, south":
        "south korea",

      "korea, north":
        "north korea",

      "congo, democratic republic of the":
        "democratic republic of the congo",

      "czech republic":
        "czechia",

      "burma":
        "myanmar",

      "eswatini":
        "swaziland"
    };

    list.forEach(item => {

      let country =
        (item.country || "")
          .toLowerCase()
          .trim();

      const level =
        Number(item.advisoryLevel);

      if (nameFixes[country]) {
        country = nameFixes[country];
      }

      if (
        country &&
        level >= 1 &&
        level <= 4
      ) {
        temp[country] = level;
      }
    });

    riskMap = temp;

    console.log(
      "Loaded advisories:",
      riskMap
    );

    applyColors();

  } catch (e) {

    console.log(
      "Advisory load failed:",
      e
    );
  }
}


// =========================
// COLOR EXPRESSION
// =========================

function getColorExpr() {

  return [

    "match",

    [
      "downcase",

      [
        "coalesce",

        ["get", "name"],
        ["get", "ADMIN"],
        ["get", "NAME"]
      ]
    ],

    ...Object.entries(riskMap).flatMap(
      ([country, level]) => [

        country,

        levelToColor(level)
      ]
    ),

    "#2a2a2a"
  ];
}


// =========================
// APPLY COLORS
// =========================

function applyColors() {

  map.setPaintProperty(
    "countries-fill",

    "fill-color",

    colorsEnabled
      ? getColorExpr()
      : "#2a2a2a"
  );

  map.setPaintProperty(
    "countries-border",

    "line-color",

    colorsEnabled
      ? "#555"
      : "#2a2a2a"
  );
}


// =========================
// HIGHLIGHT
// =========================

function highlight(name) {

  map.setFilter(
    "countries-highlight",

    [
      "==",

      [
        "coalesce",

        ["get", "name"],
        ["get", "ADMIN"],
        ["get", "NAME"]
      ],

      name
    ]
  );
}


// =========================
// ZOOM
// =========================

function zoomTo(feature) {

  const bounds =
    new maplibregl.LngLatBounds();

  function walk(coords) {

    if (
      typeof coords[0] === "number"
    ) {
      bounds.extend(coords);
    }

    else {
      coords.forEach(walk);
    }
  }

  walk(feature.geometry.coordinates);

  map.fitBounds(bounds, {
    padding: 80,
    maxZoom: 5,
    duration: 1000
  });

  const name =
    feature.properties.name ||
    feature.properties.ADMIN ||
    feature.properties.NAME;

  highlight(name);
}


// =========================
// SEARCH
// =========================

function setupSearch() {

  const box =
    document.getElementById(
      "searchBox"
    );

  const list =
    document.getElementById(
      "suggestions"
    );

  function normalize(q) {

    return (
      aliases[
        q.toLowerCase().trim()
      ] || q
    );
  }

  function getCountries() {

    return geojsonData.features.map(
      f =>

        f.properties.name ||
        f.properties.ADMIN ||
        f.properties.NAME
    );
  }

  function find(name) {

    return geojsonData.features.find(
      f => {

        const n =
          (
            f.properties.name ||
            f.properties.ADMIN ||
            f.properties.NAME
          )
          .toLowerCase();

        return (
          n === name.toLowerCase()
        );
      }
    );
  }

  function show(matches) {

    list.innerHTML = "";

    if (!matches.length) {

      list.style.display = "none";
      return;
    }

    matches
      .slice(0, 8)
      .forEach(name => {

        const div =
          document.createElement(
            "div"
          );

        div.className =
          "suggestion";

        div.textContent = name;

        div.onclick = () => {

          box.value = name;

          list.style.display =
            "none";

          const f = find(name);

          if (f) zoomTo(f);
        };

        list.appendChild(div);
      });

    list.style.display = "block";
  }

  box.addEventListener(
    "input",

    () => {

      const q =
        normalize(box.value)
          .toLowerCase();

      if (!q) {

        list.style.display =
          "none";

        return;
      }

      show(

        getCountries().filter(
          c =>

            c
              .toLowerCase()
              .includes(q)
        )
      );
    }
  );
}


// =========================
// CLICK
// =========================

function setupClick() {

  map.on(
    "click",

    "countries-fill",

    e => {

      zoomTo(
        e.features[0]
      );
    }
  );

  map.on(
    "mouseenter",

    "countries-fill",

    () => {

      map.getCanvas().style.cursor =
        "pointer";
    }
  );

  map.on(
    "mouseleave",

    "countries-fill",

    () => {

      map.getCanvas().style.cursor =
        "";
    }
  );
}


// =========================
// NEWS
// =========================

const feeds = [

  "https://feeds.bbci.co.uk/news/world/rss.xml",

  "https://rss.cnn.com/rss/edition_world.rss",

  "https://www.reuters.com/rssFeed/worldNews"
];

const proxy =
  "https://api.rss2json.com/v1/api.json?rss_url=";

async function loadNews() {

  const panel =
    document.getElementById(
      "newsPanel"
    );

  panel.innerHTML =
    "<h3>LIVE NEWS</h3>";

  let all = [];

  for (const f of feeds) {

    try {

      const res =
        await fetch(
          proxy +
          encodeURIComponent(f)
        );

      const data =
        await res.json();

      if (data.items) {

        all.push(

          ...data.items.map(i => ({

            title: i.title,

            link: i.link,

            source:
              data.feed?.title ||
              "News"
          }))
        );
      }

    } catch {}
  }

  all
    .slice(0, 15)
    .forEach(a => {

      const div =
        document.createElement(
          "div"
        );

      div.className =
        "news-item";

      div.innerHTML = `

        <div class="source-label">
          ${a.source}
        </div>

        <a
          href="${a.link}"
          target="_blank"
        >
          ${a.title}
        </a>
      `;

      panel.appendChild(div);
    });
}


// =========================
// LOAD MAP
// =========================

map.on("load", async () => {

  const res = await fetch(
    "https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json"
  );

  geojsonData = await res.json();

  map.addSource(
    "countries",

    {
      type: "geojson",
      data: geojsonData
    }
  );

  map.addLayer({

    id: "countries-fill",

    type: "fill",

    source: "countries",

    paint: {

      "fill-color":
        "#2a2a2a",

      "fill-opacity": 0.6
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

  map.addLayer({

    id: "countries-highlight",

    type: "line",

    source: "countries",

    paint: {

      "line-color": "#00ffff",

      "line-width": 3
    },

    filter: [
      "==",
      "ADMIN",
      ""
    ]
  });

  setupSearch();

  setupClick();

  loadNews();

  loadAdvisories();

  setInterval(
    loadNews,
    60000
  );

  setInterval(
    loadAdvisories,
    86400000
  );
});


// =========================
// TOGGLE
// =========================

document
  .getElementById(
    "colorToggle"
  )

  .addEventListener(
    "change",

    e => {

      colorsEnabled =
        e.target.checked;

      applyColors();
    }
  );
