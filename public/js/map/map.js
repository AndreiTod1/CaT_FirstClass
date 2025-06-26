function buildQuery(params) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== "" && v !== false && v != null) qs.append(k, v);
  }
  return qs.toString() ? `?${qs}` : "";
}

async function fetchCamps(filters = {}) {
  const res = await fetch(`/api/camps${buildQuery(filters)}`);
  if (!res.ok) throw new Error("Eroare la încărcarea camping-urilor");
  return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
  const rangeSlider = document.querySelector('input[type="range"]');
  const rangeValue = document.querySelector(".range-value");

  if (rangeSlider && rangeValue) {
    rangeSlider.addEventListener("input", function () {
      rangeValue.textContent = `≤ ${this.value} lei`;
    });
  }

  const mapEl = document.getElementById("map");
  if (!mapEl) {
    console.error("Div #map not found in DOM");
    return;
  }

  if (typeof L === "undefined") {
    console.error("Leaflet (L) is not defined.");
    return;
  }

  // Center on Romania
  const map = L.map("map").setView([45.9432, 24.9668], 7);
  console.log("✔️ Map created, adding tile-layer…");

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  }).addTo(map);

  const markersGroup = L.layerGroup().addTo(map);

  const regionSelect = document.querySelector(
    ".filters-container .filter-select"
  );
  const checkboxItems = document.querySelectorAll(
    ".filters-container .checkbox-item"
  );
  const ratingItems = document.querySelectorAll(
    ".filters-container .radio-item"
  );
  const applyBtn = document.querySelector(".filters-section .btn-primary");
  const resetBtn = document.querySelector(".filters-section .btn-outline");

  // filters objects
  function getFilters() {
    const filters = {
      region: regionSelect
        ? regionSelect.value === "all"
          ? ""
          : regionSelect.value
        : "",
      price: rangeSlider ? rangeSlider.value : "",
    };

    // checkbox-uri
    checkboxItems.forEach((label) => {
      const input = label.querySelector('input[type="checkbox"]');
      const txt = label.textContent.trim();
      let key;
      if (txt === "Wi-Fi") key = "wifi";
      if (txt === "Parcare") key = "parking";
      if (txt === "Grătar") key = "barbecue";
      if (txt === "Dușuri") key = "shower";
      if (key) filters[key] = input.checked ? "true" : "";
    });

    // rating minim radio
    ratingItems.forEach((label) => {
      const input = label.querySelector('input[type="radio"]');
      const txt = label.textContent.trim();
      if (input.checked && txt !== "Toate") {
        const num = parseFloat(txt.replace("+", ""));
        if (!isNaN(num)) filters.minRating = num;
      }
    });

    return filters;
  }

  //load camps, put markers
  async function updateMarkers(filters) {
    try {
      const camps = await fetchCamps(filters);
      markersGroup.clearLayers();

      // update numer of results
      const countEl = document.querySelector(".results-count");
      if (countEl) countEl.textContent = `Locații găsite (${camps.length})`;

      camps.forEach((camp) => {
        console.log("Adding marker for camp:", camp);
        if (camp.latitude && camp.longitude && camp.status === true) {
          L.marker([camp.latitude, camp.longitude])
            .addTo(markersGroup)
            .bindPopup(`<b>${camp.name}</b><br>${camp.description || ""}`);
        }
      });
    } catch (err) {
      console.error("Eroare la fetch/map:", err);
    }
  }

  // evenimente pe butoane
  if (applyBtn) {
    applyBtn.addEventListener("click", () => {
      updateMarkers(getFilters());
    });
  }
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (regionSelect) regionSelect.value = "all";
      if (rangeSlider) {
        const init = rangeSlider.getAttribute("value") || rangeSlider.min;
        rangeSlider.value = init;
        if (rangeValue) rangeValue.textContent = `≤ ${init} lei`;
      }
      checkboxItems.forEach((label) => {
        label.querySelector('input[type="checkbox"]').checked = false;
      });
      ratingItems.forEach((label, i) => {
        label.querySelector('input[type="radio"]').checked = i === 0;
      });
      updateMarkers(getFilters());
    });
  }

  // apel initial
  updateMarkers(getFilters());
});
