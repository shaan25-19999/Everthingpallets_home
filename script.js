// Home page data + charts + insights (AVERAGE by default)
const API_URL = "https://api.sheetbest.com/sheets/cab2f0a4-a638-4a03-91a0-cc5a12548c6a";

let sheetData = [];
let pelletChartInstance = null;
let briquetteChartInstance = null;

const fmtINR = (n) => isFinite(n) ? Number(n).toLocaleString("en-IN") : "--";
const toNum = (x) => {
  if (x == null) return NaN;
  const s = String(x).replace(/,/g, "").trim();
  const n = Number(s);
  return isFinite(n) ? n : NaN;
};

document.addEventListener("DOMContentLoaded", async () => {
  try {
    const res = await fetch(API_URL);
    sheetData = await res.json();

    // Expose for debugging
    window.sheetData = sheetData;

    // ✅ Stamp "last verified"
    const lastVerifiedEl = document.getElementById("lastVerified");
    if (lastVerifiedEl) {
      const now = new Date();
      lastVerifiedEl.textContent = now.toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    }

    // ✅ Populate prices + charts for AVERAGE
    renderAveragePrices();
    drawCharts("AVERAGE");

    // ✅ Build Top 3 cheapest (Pellet)
    renderTopCheapestPellet();
  } catch (e) {
    console.error("Home: fetch error", e);
  }
});

// ========================
// RENDER FUNCTIONS
// ========================
function renderAveragePrices() {
  const pelletEl = document.getElementById("pelletPrice");
  const briqEl = document.getElementById("briquettePrice");

  const pelletAvgRow = sheetData.find(
    (r) => (r.State || "").trim().toUpperCase() === "AVERAGE" &&
           (r.Type || "").toLowerCase() === "pellet"
  );
  const briqAvgRow = sheetData.find(
    (r) => (r.State || "").trim().toUpperCase() === "AVERAGE" &&
           (r.Type || "").toLowerCase() === "briquette"
  );

  let pelletPrice = toNum(pelletAvgRow?.Price);
  let briqPrice = toNum(briqAvgRow?.Price);

  if (pelletEl) pelletEl.textContent = fmtINR(pelletPrice);
  if (briqEl) briqEl.textContent = fmtINR(briqPrice);
}

function drawCharts(location) {
  const labels = ["Year", "6 Months", "Month", "Week"];

  const getRow = (type) =>
    sheetData.find(
      (r) =>
        (r.State || "").trim().toUpperCase() === String(location).toUpperCase() &&
        (r.Type || "").trim().toLowerCase() === type
    );

  const pelletRow = getRow("pellet");
  const briqRow = getRow("briquette");

  const extractSeries = (row, type) => {
    if (row) {
      return [
        toNum(row.Year),
        toNum(row["6 Month"]) || toNum(row["6 Months"]) || toNum(row["6mo"]),
        toNum(row.Month),
        toNum(row.Week),
      ].map((v) => (isFinite(v) ? v : 0));
    }
    return [0, 0, 0, 0];
  };

  const pelletValues = extractSeries(pelletRow, "pellet");
  const briqValues = extractSeries(briqRow, "briquette");

  if (pelletChartInstance) pelletChartInstance.destroy();
  if (briquetteChartInstance) briquetteChartInstance.destroy();

  const baseOptions = (label, data, borderColor, bgColor) => ({
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data,
          borderColor,
          backgroundColor: bgColor,
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => `₹${ctx.parsed.y.toLocaleString("en-IN")}/ton`,
          },
        },
      },
      scales: {
        y: {
          ticks: {
            callback: (v) => `₹${Number(v).toLocaleString("en-IN")}`,
          },
        },
      },
    },
  });

  pelletChartInstance = new Chart(document.getElementById("pelletChart"), 
    baseOptions("Pellet Price", pelletValues, "#1C3D5A", "rgba(29,61,89,0.12)")
  );

  briquetteChartInstance = new Chart(document.getElementById("briquetteChart"), 
    baseOptions("Briquette Price", briqValues, "#FFA500", "rgba(255,165,0,0.12)")
  );
}

function renderTopCheapestPellet() {
  const ul = document.getElementById("cheapestList");
  if (!ul) return;

  const pellets = sheetData
    .filter((r) => (r.Type || "").toLowerCase().trim() === "pellet")
    .map((r) => {
      const state = (r.State || "").trim();
      const price = toNum(r.Price);
      return { state, price };
    })
    .filter((x) => x.state && x.state.toUpperCase() !== "AVERAGE" && isFinite(x.price));

  // Min price per state
  const perStateMin = pellets.reduce((acc, r) => {
    acc[r.state] = Math.min(acc[r.state] ?? Infinity, r.price);
    return acc;
  }, {});

  const top3 = Object.entries(perStateMin)
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3);

  ul.innerHTML = top3.length
    ? top3
        .map(
          ([state, price], i) => `
        <li class="bg-white rounded-xl shadow p-6 hover:shadow-lg transition">
          <div class="text-4xl font-bold text-[#66A5AD] mb-2">${i + 1}</div>
          <div class="font-semibold text-lg">${state}</div>
          <div class="text-gray-700">₹${price.toLocaleString("en-IN")}/ton</div>
        </li>
      `
        )
        .join("")
    : `<li class="text-gray-500">Not enough data yet.</li>`;
}