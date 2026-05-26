const fs = require("fs");

async function run() {

  try {

    console.log("🌍 Fetching world countries...");

    // GET ALL COUNTRIES (guaranteed complete)
    const res = await fetch("https://restcountries.com/v3.1/all");

    const data = await res.json();

    const riskMap = {};

    // SIMPLE RISK MODEL (you can replace later with real intel sources)
    function assignRisk(country) {

      const region = country.region;

      const name = country.name.common.toLowerCase();

      // Default safe
      let risk = 1;

      // Higher baseline risk regions (very rough intelligence model)
      if (region === "Asia") risk = 2;
      if (region === "Africa") risk = 2;

      // Higher-risk examples
      const highRisk = [
        "russia",
        "ukraine",
        "iran",
        "north korea",
        "syria",
        "afghanistan"
      ];

      const mediumRisk = [
        "mexico",
        "turkey",
        "pakistan",
        "venezuela"
      ];

      if (highRisk.includes(name)) risk = 4;
      else if (mediumRisk.includes(name)) risk = 3;

      return risk;
    }

    data.forEach(country => {

      const name =
        country.name.common.toLowerCase();

      riskMap[name] = assignRisk(country);
    });

    // SAVE FILE
    fs.writeFileSync(
      "data/risk.json",
      JSON.stringify(riskMap, null, 2)
    );

    console.log("✅ risk.json generated for ALL countries");

  } catch (err) {

    console.error("❌ Scraper failed:");
    console.error(err);

  }
}

run();
