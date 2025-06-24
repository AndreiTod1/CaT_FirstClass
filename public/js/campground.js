let currentUser = null; // null ⇢ nu e logat

async function getCurrentUser() {
  try {
    const resp = await fetch("/api/auth/me", { credentials: "include" });
    if (!resp.ok) return; // 401 ⇒ guest
    const { ok, user } = await resp.json();
    if (ok && user) currentUser = user;
  } catch (err) {
    console.warn("getCurrentUser error:", err);
  }
}

let currentCampground = null;
let selectedRating = 0;
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();
let bookedDates = [];

document.addEventListener("DOMContentLoaded", async () => {
  await getCurrentUser(); // cine e logat?

  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    showError("Lipsă parametru „id” în URL!");
    return;
  }

  currentCampground = await fetchCampground(id);
  if (!currentCampground) {
    showError("Camping-ul nu a fost găsit!");
    return;
  }

  await loadCampgroundDetails();
  setupEventListeners();
});

async function fetchCampground(id) {
  try {
    const resp = await fetch(`/api/camps/${id}`);
    if (!resp.ok) return null; // 404 etc.
    return await resp.json();
  } catch (err) {
    console.error("fetchCampground error:", err);
    return null;
  }
}

async function loadCampgroundDetails() {
  // ascundem spinner
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

  await loadBookedDates();
  await loadReviews();
  updateCalendar();

  const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
  document.getElementById("checkinDate").min = tomorrow;
  document.getElementById("checkoutDate").min = tomorrow;
}

async function loadBookedDates() {
  try {
    const r = await fetch(`/api/bookings?campId=${currentCampground.id}`);
    bookedDates = r.ok ? await r.json() : [];
  } catch (e) {
    console.error("loadBookedDates error:", e);
    bookedDates = [];
  }
}

async function loadReviews() {
  try {
    const r = await fetch(`/api/camps/${currentCampground.id}/reviews`);
    const reviews = r.ok ? await r.json() : [];
    populateReviews(reviews);
  } catch (e) {
    console.error("loadReviews error:", e);
    populateReviews([]);
  }
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
    // bifa pt features
    item.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
            viewBox="0 0 24 24" fill="none" stroke="currentColor"
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
         <polyline points="20 6 9 17 4 12"></polyline>
       </svg>
       <span>${feat}</span>`;
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

function populateReviews(revs) {
  const cont = document.getElementById("reviewsContainer");
  cont.innerHTML = "";
  if (!revs.length) {
    cont.textContent =
      "Nu există recenzii încă. Fii primul care lasă o recenzie!";
    return;
  }
  revs.forEach((r) => cont.appendChild(createReviewElement(r)));
}

function createReviewElement(r) {
  const card = document.createElement("div");
  card.className = "review-card";
  const rating = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);
  card.innerHTML = `<div class="review-header">
       <div class="review-user-info">
         <div class="review-avatar"><span>${(r.author ||
           "U")[0].toUpperCase()}</span></div>
         <div class="review-user-details">
           <h4 class="review-user">${r.author || "Utilizator anonim"}</h4>
           <div class="review-rating">${rating}</div>
         </div>
       </div>
       <span class="review-date">${formatDate(r.created_at)}</span>
     </div>
     <div class="review-content">
       ${r.comment ? `<p class="review-comment">${r.comment}</p>` : ""}
       ${
         r.media_urls?.length
           ? `<div class="review-images">${r.media_urls
               .map((u) => `<img src="${u}" alt="Imagine" />`)
               .join("")}</div>`
           : ""
       }
     </div>`;
  // click pe img
  card
    .querySelectorAll(".review-images img")
    .forEach((img) =>
      img.addEventListener("click", () => openImageModal(img.src))
    );
  return card;
}

function ymd(y, m, d) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function updateCalendar() {
  const months = [
    "Ianuarie",
    "Februarie",
    "Martie",
    "Aprilie",
    "Mai",
    "Iunie",
    "Iulie",
    "August",
    "Septembrie",
    "Octombrie",
    "Noiembrie",
    "Decembrie",
  ];
  document.getElementById(
    "currentMonthYear"
  ).textContent = `${months[currentMonth]} ${currentYear}`;

  const cal = document.getElementById("availabilityCalendar");
  cal.innerHTML = "";
  cal.appendChild(createMonthCalendar(new Date(currentYear, currentMonth)));
}

function createMonthCalendar(date) {
  const y = date.getFullYear(),
    m = date.getMonth();
  const grid = document.createElement("div");
  grid.className = "days-grid";

  ["L", "M", "M", "J", "V", "S", "D"].forEach((d) => {
    const h = document.createElement("div");
    h.className = "day-header";
    h.textContent = d;
    grid.appendChild(h);
  });

  const firstDay = new Date(y, m, 1);
  const lastDay = new Date(y, m + 1, 0);
  const pad = (firstDay.getDay() + 6) % 7;
  for (let i = 0; i < pad; i++)
    grid.appendChild(
      Object.assign(document.createElement("div"), {
        className: "day-cell empty",
      })
    );

  for (let d = 1; d <= lastDay.getDate(); d++) {
    const cell = document.createElement("div");
    cell.className = "day-cell";
    cell.textContent = d;

    const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;
    const past = new Date(y, m, d) <= new Date().setHours(0, 0, 0, 0);

    if (bookedDates.includes(iso)) {
      cell.classList.add("booked");
      cell.title = "Indisponibil";
    } else if (past) {
      cell.classList.add("past");
    } else {
      cell.classList.add("available");
      cell.title = "Disponibil";
    }
    grid.appendChild(cell);
  }
  return grid;
}

function setupEventListeners() {
  document.getElementById("prevMonth").addEventListener("click", () => {
    currentMonth === 0 ? ((currentMonth = 11), currentYear--) : currentMonth--;
    updateCalendar();
  });
  document.getElementById("nextMonth").addEventListener("click", () => {
    currentMonth === 11 ? ((currentMonth = 0), currentYear++) : currentMonth++;
    updateCalendar();
  });

  /* stele rating */
  const stars = document.querySelectorAll(".star");
  stars.forEach((s) => {
    s.addEventListener("click", () => {
      selectedRating = +s.dataset.rating;
      updateStarDisplay();
    });
    s.addEventListener("mouseover", () => highlightStars(+s.dataset.rating));
  });
  document
    .querySelector(".star-rating")
    .addEventListener("mouseleave", updateStarDisplay);

  /* formulare */
  document.getElementById("addReviewForm").addEventListener("submit", (e) => {
    e.preventDefault();
    submitReview();
  });
  document.getElementById("bookingForm").addEventListener("submit", (e) => {
    e.preventDefault();
    submitBooking();
  });

  /* preț */
  ["checkinDate", "checkoutDate", "guestsCount"].forEach((id) =>
    document.getElementById(id).addEventListener("change", calculateTotalPrice)
  );
}

/*
  utils
*/
function updateStarDisplay() {
  document.querySelectorAll(".star").forEach((s, i) => {
    if (i < selectedRating) {
      s.textContent = "★";
      s.classList.add("selected");
    } else {
      s.textContent = "☆";
      s.classList.remove("selected");
    }
  });
}
function highlightStars(rate) {
  document
    .querySelectorAll(".star")
    .forEach((s, i) => (s.textContent = i < rate ? "★" : "☆"));
}

function calculateTotalPrice() {
  const inStr = document.getElementById("checkinDate").value;
  const outStr = document.getElementById("checkoutDate").value;
  if (!inStr || !outStr)
    return void (document.getElementById("totalPrice").textContent = "0");

  const inD = new Date(inStr),
    outD = new Date(outStr);
  if (outD <= inD)
    return void (document.getElementById("totalPrice").textContent = "0");

  document.getElementById("totalPrice").textContent = calculatePrice(inD, outD);
}
function calculatePrice(checkin, checkout) {
  const nights = Math.ceil((checkout - checkin) / 864e5);
  return nights * parseFloat(currentCampground.price ?? 0);
}

function formatDate(str) {
  return new Date(str).toLocaleDateString("ro-RO", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function openImageModal(url) {
  const modal = document.createElement("div");
  modal.className = "image-modal";
  modal.innerHTML = `<div class="image-modal-content">
       <span class="image-modal-close">&times;</span>
       <img src="${url}" alt="${currentCampground.name}">
     </div>`;
  modal.addEventListener("click", (e) => {
    if (e.target === modal || e.target.classList.contains("image-modal-close"))
      document.body.removeChild(modal);
  });
  document.body.appendChild(modal);
}

/*
  submit review 
 */
async function submitReview() {
  if (!currentUser) {
    alert("Trebuie să fii conectat pentru a lăsa o recenzie!");
    window.location.href = "login.html";
    return;
  }
  if (currentUser.role !== "member" && currentUser.role !== "admin") {
    alert("Nu ai dreptul să postezi recenzii.");
    return;
  }
  if (!selectedRating) {
    alert("Te rog să selectezi un rating!");
    return;
  }

  const comment = document.getElementById("reviewComment").value;
  const files = document.getElementById("reviewImages").files;
  const media = Array.from(files)
    .slice(0, 3)
    .map(() => currentCampground.image_url || "https://placehold.co/400");

  try {
    const r = await fetch(`/api/camps/${currentCampground.id}/reviews`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: currentUser.id,
        rating: selectedRating,
        comment: comment || null,
        mediaUrls: media,
      }),
    });
    if (r.status === 201) {
      alert("Recenzia ta a fost adăugată cu succes!");
      document.getElementById("addReviewForm").reset();
      selectedRating = 0;
      updateStarDisplay();
      await loadReviews();
    } else if (r.status === 409) alert("Ai recenzat deja acest camping!");
    else alert("A apărut o eroare la adăugarea recenziei!");
  } catch (e) {
    console.error("submitReview error:", e);
    alert("A apărut o eroare la adăugarea recenziei!");
  }
}

async function submitBooking() {
  if (!currentUser) {
    alert("Trebuie să fii conectat pentru a face o rezervare!");
    window.location.href = "login.html";
    return;
  }

  const inStr = document.getElementById("checkinDate").value,
    outStr = document.getElementById("checkoutDate").value;
  if (!inStr || !outStr) {
    alert("Te rog să selectezi datele de check-in și check-out!");
    return;
  }

  const inD = new Date(inStr),
    outD = new Date(outStr);
  if (outD < inD) {
    alert("Data de check-out trebuie să fie după data de check-in!");
    return;
  }

  try {
    const r = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: currentUser.id,
        camp_site_id: currentCampground.id,
        start_date: inStr,
        end_date: outStr,
      }),
    });
    if (r.status === 201) {
      alert(
        `Rezervarea ta a fost confirmată! Total: ${calculatePrice(
          inD,
          outD
        )} lei`
      );
      document.getElementById("bookingForm").reset();
      document.getElementById("totalPrice").textContent = "0";
      await loadBookedDates();
      updateCalendar();
    } else if (r.status === 409)
      alert("Una sau mai multe zile nu sunt disponibile!");
    else alert("A apărut o eroare la realizarea rezervării!");
  } catch (e) {
    console.error("submitBooking error:", e);
    alert("A apărut o eroare la realizarea rezervării!");
  }
}

function showError(msg) {
  document.getElementById("loadingSpinner").style.display = "none";
  document.body.innerHTML = `<div style="display:flex;justify-content:center;align-items:center;height:100vh;text-align:center">
       <div>
         <h1>Eroare</h1>
         <p>${msg}</p>
         <a href="camps.html" class="btn btn-primary">Înapoi la camping-uri</a>
       </div>
     </div>`;
}
