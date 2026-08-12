const SHEET_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vSi_aPZJoD7bUtuHi3gn2mULSt-aPq2dtARcmswOGYIhK4nSqnQ7-azN0iMliooGp_tte-nXHFK2CSz/pub?output=csv";
const UPDATE_INTERVAL = 5 * 60 * 1000;
const MIN_LOADING_TIME = 3000;
let isDataLoaded = false;

function parseCSVRow(row) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < row.length; i++) {
    const char = row[i];
    if (char === '"') inQuotes = !inQuotes;
    else if (char === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

function createTableItem(title, url) {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.className = "table_item";
  link.textContent = title;
  return link;
}

function createStatusItem(text, className) {
  const link = document.createElement("a");
  link.href = "#";
  link.className = `${className} table_item`;
  link.textContent = text;
  return link;
}

async function loadDataFromSheets() {
  const containers = {
    played: document.querySelector(".table_played .table_items"),
    willPlay: document.querySelector(".table_will_play .table_items"),
    watched: document.querySelector(".table_watched .table_items"),
    willWatch: document.querySelector(".table_will_watch .table_items"),
  };

  try {
    console.log("Fetching data with minimum delay");

    const delay = new Promise((resolve) =>
      setTimeout(resolve, MIN_LOADING_TIME),
    );
    const fetchData = fetch(SHEET_URL).then((res) => {
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      return res.text();
    });

    const [csvText] = await Promise.all([fetchData, delay]);
    const rows = csvText.split("\n").slice(1);

    Object.values(containers).forEach((c) => {
      if (c) c.innerHTML = "";
    });
    const counts = { played: 0, willPlay: 0, watched: 0, willWatch: 0 };

    rows.forEach((row) => {
      if (!row.trim()) return;
      const cols = parseCSVRow(row);
      if (cols.length < 4) return;

      const title = cols[0].replace(/^"|"$/g, "").trim();
      const url = cols[1].replace(/^"|"$/g, "").trim();
      const type = cols[2].replace(/^"|"$/g, "").trim().toLowerCase();
      const status = cols[3].replace(/^"|"$/g, "").trim().toLowerCase();

      if (!title || !url) return;

      let key;
      if (type === "game" && status === "played") key = "played";
      else if (type === "game" && status === "willplay") key = "willPlay";
      else if (type === "movie" && status === "watched") key = "watched";
      else if (type === "movie" && status === "willwatch") key = "willWatch";

      if (key && containers[key]) {
        containers[key].appendChild(createTableItem(title, url));
        counts[key]++;
      }
    });

    Object.keys(containers).forEach((key) => {
      if (counts[key] === 0 && containers[key]) {
        containers[key].appendChild(
          createStatusItem(
            "Тут пока ничего нет, но вы всегда можете это исправить",
            "zero-item",
          ),
        );
      }
    });

    isDataLoaded = true;
    console.log("Data sync complete", counts);
  } catch (error) {
    console.error("Data sync failed", error);
    if (!isDataLoaded) {
      Object.values(containers).forEach((c) => {
        if (c) {
          c.innerHTML = "";
          c.appendChild(
            createStatusItem(
              "Что-то не загрузилось, попробуй потом(",
              "fail-item",
            ),
          );
        }
      });
    }
  }
}

function init() {
  console.log("App initialization");

  setTimeout(() => {
    if (!isDataLoaded) {
      console.warn("Operation timed out");
      document.querySelectorAll(".loading-item").forEach((item) => {
        item.textContent = "Не удалось загрузить данные, попробуйте позже";
        item.className = "fail-item table_item";
      });
    }
  }, 60000);

  loadDataFromSheets();
  setInterval(loadDataFromSheets, UPDATE_INTERVAL);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
