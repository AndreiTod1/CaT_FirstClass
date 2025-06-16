// public/js/map.js
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-year").textContent =
    new Date().getFullYear();
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const closeMenuBtn = document.querySelector(".close-menu");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuBtn && closeMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", function () {
      mobileMenu.classList.add("active");
    });

    closeMenuBtn.addEventListener("click", function () {
      mobileMenu.classList.remove("active");
    });
  }

  const fadeElements = document.querySelectorAll(".fade-in");

  function checkFade() {
    fadeElements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top;
      const elementBottom = element.getBoundingClientRect().bottom;

      if (elementTop < window.innerHeight && elementBottom > 0) {
        element.classList.add("visible");
      }
    });
  }
  checkFade();
  console.log("📍 DOM fully loaded, initializing map");

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

  console.log("✔️ Tile-layer added.");

  //
  fetch("/api/camps")
    .then((res) => res.json())
    .then((camps) => {
      console.log("🔍 Received campings:", camps);
      camps.forEach((camp) => {
        if (camp.latitude && camp.longitude) {
          L.marker([camp.latitude, camp.longitude])
            .addTo(map)
            .bindPopup(`<b>${camp.name}</b><br>${camp.description || ""}`);
        }
      });
    })
    .catch((err) => console.error(" Error at fetch(/api/camps):", err));
});
