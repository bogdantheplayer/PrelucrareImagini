const fileInput = document.getElementById("file");
const filterSelect = document.getElementById("filter");
const d0Wrap = document.getElementById("d0wrap");
const d0Input = document.getElementById("d0");
const d0Val = document.getElementById("d0val");
const runBtn = document.getElementById("run");
const clearBtn = document.getElementById("clear");
const grid = document.getElementById("grid");
const statusEl = document.getElementById("status");
const emptyEl = document.getElementById("empty");
const toastEl = document.getElementById("toast");
const healthEl = document.getElementById("health");
const summaryEl = document.getElementById("summary");
const fileHint = document.getElementById("fileHint");

const API_BASE = "http://127.0.0.1:8000";

const freqFilters = new Set([
  "Ideal Low-Pass (ILPF)",
  "Gaussian Low-Pass (GLPF)",
  "Ideal High-Pass (IHPF)",
  "Gaussian High-Pass (GHPF)",
]);

const seenKeys = new Set();
let hasOriginal = false;

function makeKey(title, d0Value) {
  // diferentiaza dupa D0
  if (freqFilters.has(title)) return `${title}__D0=${d0Value}`;
  // numele filtrului
  return title;
}

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 1500);
}

function setStatus(msg) {
  statusEl.textContent = msg || "";
}

function setLoading(isLoading) {
  runBtn.disabled = isLoading;
  runBtn.textContent = isLoading ? "Processing..." : "Apply";
}

function clearGrid() {
  grid.innerHTML = "";
  emptyEl.style.display = "flex";
}

function showGrid() {
  emptyEl.style.display = "none";
}

function b64ToDownload(base64png, filename) {
  const a = document.createElement("a");
  a.href = `data:image/png;base64,${base64png}`;
  a.download = filename;
  a.click();
}

// addCard cu Remove + key
function addCard(title, base64png, keyForCard) {
  showGrid();

  const card = document.createElement("div");
  card.className = "card";
  card.dataset.key = keyForCard;

  const head = document.createElement("div");
  head.className = "card-head";

  const t = document.createElement("div");
  t.className = "card-title";
  t.textContent = title;

  const actions = document.createElement("div");
  actions.className = "card-actions";

  const btnSave = document.createElement("button");
  btnSave.className = "icon-btn";
  btnSave.textContent = "Save";
  btnSave.addEventListener("click", () => {
    const safe = title.replace(/[^\w\s()-]/g, "").replace(/\s+/g, "_");
    b64ToDownload(base64png, `${safe}.png`);
    toast(`Saved: ${safe}.png`);
  });

  const btnRemove = document.createElement("button");
  btnRemove.className = "icon-btn";
  btnRemove.textContent = "Remove";
  btnRemove.addEventListener("click", () => {
    card.remove();
    seenKeys.delete(keyForCard);
    if (grid.children.length === 0) {
      clearGrid();
      hasOriginal = false;
    }
  });

  actions.appendChild(btnSave);
  actions.appendChild(btnRemove);

  head.appendChild(t);
  head.appendChild(actions);

  const img = document.createElement("img");
  img.src = `data:image/png;base64,${base64png}`;
  img.alt = title;

  card.appendChild(head);
  card.appendChild(img);
  grid.appendChild(card);
}



d0Input.addEventListener("input", () => {
  d0Val.textContent = d0Input.value;
});

fileInput.addEventListener("change", () => {
  const f = fileInput.files?.[0];
  fileHint.textContent = f ? `Selectat: ${f.name}` : "Alege o imagine (JPG/PNG/BMP).";
});

// Clear
clearBtn.addEventListener("click", () => {
  fileInput.value = "";
  clearGrid();
  setStatus("");
  seenKeys.clear();
  hasOriginal = false;
  toast("Cleared");
});

async function checkHealth() {
  try {
    const resp = await fetch(`${API_BASE}/health`);
    const ok = resp.ok;
    healthEl.textContent = ok ? "Backend: online" : "Backend: error";
  } catch {
    healthEl.textContent = "Backend: offline";
  }
}

runBtn.addEventListener("click", async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    setStatus("Alege o imagine.");
    toast("No file");
    return;
  }

  setLoading(true);
  setStatus("Procesez...");

  const selectedFilter = filterSelect.value;
  const d0Value = d0Input.value;

  const form = new FormData();
  form.append("file", file);
  form.append("filter_name", selectedFilter);
  form.append("d0", d0Value);

  try {
    const resp = await fetch(`${API_BASE}/process`, { method: "POST", body: form });
    const data = await resp.json();

    if (!resp.ok) throw new Error(data?.detail || `HTTP ${resp.status}`);

    const images = data.images || {};

    // Original
    if (images["Original"] && !hasOriginal) {
      const k0 = "Original";
      if (!seenKeys.has(k0)) {
        seenKeys.add(k0);
        addCard("Original", images["Original"], k0);
      }
      hasOriginal = true;
    }

    // Filtrul selectat
    if (images[selectedFilter]) {
      const key = makeKey(selectedFilter, d0Value);

      if (seenKeys.has(key)) {
        toast("Deja ai acest rezultat");
      } else {
        seenKeys.add(key);
        const displayTitle = freqFilters.has(selectedFilter)
          ? `${selectedFilter} (D0=${d0Value})`
          : selectedFilter;
        addCard(displayTitle, images[selectedFilter], key);
      }
    }

    setStatus("Gata.");
    toast("Done");
  } catch (e) {
    setStatus("Eroare: " + e.message);
    toast("Error");
    // nu sterg grid-ul la eroare
  } finally {
    setLoading(false);
  }
});

(async function init() {
  updateD0Visibility();
  clearGrid();
  await checkHealth();
  setInterval(checkHealth, 2500);
})();
