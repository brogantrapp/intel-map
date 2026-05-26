const fs = require("fs");

async function run() {

  try {

    console.log("🌍 Starting scraper...");

    const res = await fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/countries-50m.json");

    if (!res.ok) {
      throw new Error("API request failed: " + res.status);
    }

    const data = await res.json();

    console.log("📦 Countries received:", data.length);

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error("No country data returned");
    }

    const riskMap = {};

    function getRisk(country) {

      const name = country.name?.common?.toLowerCase();

      const region = country.region;

      let risk = 1;

      if (!name) return 1;

      if (["russia", "ukraine", "iran", "north korea", "syria", "afghanistan"].includes(name)) {
        return 4;
      }

      if (["mexico", "turkey", "pakistan", "venezuela"].includes(name)) {
        return 3;
      }

      if (region === "Africa" || region === "Asia") {
        risk = 2;
      }

      return risk;
    }

    for (const country of data) {

      const name = country.name?.common;

      if (!name) continue;

      riskMap[name.toLowerCase()] = getRisk(country);
    }

    console.log("🧠 Risk map size:", Object.keys(riskMap).length);

    fs.mkdirSync("data", { recursive: true });

    fs.writeFileSync(
      "data/risk.json",
      JSON.stringify(riskMap, null, 2)
    );

    console.log("✅ risk.json written successfully");

  } catch (err) {

    console.error("❌ SCRAPER FAILED:");
    console.error(err);

    // FORCE FILE OUTPUT EVEN ON FAILURE (important debug step)
    fs.mkdirSync("data", { recursive: true });

    fs.writeFileSync(
      "data/risk.json",
      JSON.stringify({
        error: true,
        message: err.message
      }, null, 2)
    );
  }
}

run();
