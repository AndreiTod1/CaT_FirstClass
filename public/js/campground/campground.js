import { BookingModule } from "./booking.js";
import { CalendarModule } from "./calendar.js";
import { ReviewsModule } from "./reviews.js";

let currentUser = null;
let currentCampground = null;

async function getCurrentUser() {
  try {
    const resp = await fetch("/api/auth/me", { credentials: "include" });
    if (!resp.ok) return;
    const { ok, user } = await resp.json();
    if (ok && user) currentUser = user;
  } catch (err) {
    console.warn("getCurrentUser error:", err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await getCurrentUser();

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showError("Lipsă parametru id în URL!");
    return;
  }

  currentCampground = await fetchCampground(id);
  if (!currentCampground) {
    showError("Camping-ul nu a fost găsit!");
    return;
  }

  await loadCampgroundDetails();

  // Initialize modules
  BookingModule.init(currentUser, currentCampground);
  CalendarModule.init(currentCampground);
  ReviewsModule.init(currentUser, currentCampground);
});

async function fetchCampground(id) {
  try {
    const resp = await fetch(`/api/camps/${id}`);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (err) {
    console.error("fetchCampground error:", err);
    return null;
  }
}

async function loadCampgroundDetails() {
  document.getElementById("loadingSpinner").style.display = "none";
  document.getElementById("campingDetailsMain").style.display = "block";

  document.title = `${currentCampground.name} - GrenCamping`;

  const imgUrl =
    currentCampground.image_url ||
    "https://placehold.co/1200x800?text=No+image";
  const priceNum = parseFloat(currentCampground.price ?? 0);
  const rating = parseFloat(currentCampground.avg_rating ?? 0).toFixed(1);

  document.getElementById("campingMainImage").src = imgUrl;
  document.getElementById("campingMainImage").alt = currentCampground.name;
  document.getElementById("campingName").textContent = currentCampground.name;
  document.getElementById("campingLocation").textContent =
    currentCampground.region;
  document.getElementById("campingRating").textContent = rating;
  document.getElementById("campingDescription").textContent =
    currentCampground.description;
  document.getElementById("campingPrice").textContent = priceNum;

  populateFeatures();
  populateGallery();
}

function buildFeatureList(c) {
  const f = [];
  if (c.wifi) f.push("Wi-Fi gratuit");
  if (c.shower) f.push("Dușuri");
  if (c.parking) f.push("Parcare gratuită");
  if (c.barbecue) f.push("Zone pentru grătar");
  const typeTxt =
    c.type === "tent"
      ? "camping corturi"
      : c.type === "rv"
      ? "camping rulote"
      : c.type;
  if (typeTxt) f.push(`Tip: ${typeTxt}`);
  return f;
}

function populateFeatures() {
  const list = buildFeatureList(currentCampground);
  const container = document.getElementById("campingFeatures");
  container.innerHTML = "";

  list.forEach((feat) => {
    const item = document.createElement("div");
    item.className = "feature-item";

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", "16");
    svg.setAttribute("height", "16");
    svg.setAttribute("viewBox", "0 0 24 24");
    svg.setAttribute("fill", "none");
    svg.setAttribute("stroke", "currentColor");
    svg.setAttribute("stroke-width", "2");
    svg.setAttribute("stroke-linecap", "round");
    svg.setAttribute("stroke-linejoin", "round");

    const polyline = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "polyline"
    );
    polyline.setAttribute("points", "20 6 9 17 4 12");
    svg.appendChild(polyline);

    const span = document.createElement("span");
    span.textContent = feat;

    item.appendChild(svg);
    item.appendChild(span);
    container.appendChild(item);
  });
}

function populateGallery() {
  const container = document.getElementById("campingGallery");
  container.innerHTML = "";
  const urls = currentCampground.gallery?.length
    ? currentCampground.gallery
    : [currentCampground.image_url].filter(Boolean);

  urls.forEach((u) => {
    const div = document.createElement("div");
    div.className = "gallery-item";
    const img = document.createElement("img");
    img.src = u;
    img.alt = currentCampground.name;
    img.addEventListener("click", () => openImageModal(u));
    div.appendChild(img);
    container.appendChild(div);
  });
}

// Make openImageModal global so other modules can use it
window.openImageModal = function (url) {
  const modal = document.createElement("div");
  modal.className = "image-modal";

  const modalContent = document.createElement("div");
  modalContent.className = "image-modal-content";

  const closeBtn = document.createElement("span");
  closeBtn.className = "image-modal-close";
  closeBtn.innerHTML = "&times;";

  const img = document.createElement("img");
  img.src = url;
  img.alt = currentCampground.name;

  modalContent.appendChild(closeBtn);
  modalContent.appendChild(img);
  modal.appendChild(modalContent);

  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("image-modal-close"))
      document.body.removeChild(modal);
  });

  document.body.appendChild(modal);
};

function showError(msg) {
  document.getElementById("loadingSpinner").style.display = "none";

  const errorContainer = document.createElement("div");
  errorContainer.style.cssText =
    "display:flex;justify-content:center;align-items:center;height:100vh;text-align:center";

  const errorContent = document.createElement("div");

  const errorTitle = document.createElement("h1");
  errorTitle.textContent = "Eroare";

  const errorMessage = document.createElement("p");
  errorMessage.textContent = msg;

  const backLink = document.createElement("a");
  backLink.href = "camps.html";
  backLink.className = "btn btn-primary";
  backLink.textContent = "Înapoi la camping-uri";

  errorContent.appendChild(errorTitle);
  errorContent.appendChild(errorMessage);
  errorContent.appendChild(backLink);
  errorContainer.appendChild(errorContent);

  document.body.innerHTML = "";
  document.body.appendChild(errorContainer);
}
