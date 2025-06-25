import { CampgroundManager } from "./campgrounds.js";
import { BookingManager } from "./bookings.js";
import { UserManager } from "./users.js";

var campgrounds = [];
var users = [];
var bookings = [];

// global functions
window.showTab = showTab;
window.resetForm = resetForm;
window.editCampground = editCampground;
window.toggleCampground = toggleCampground;
window.deleteCampground = deleteCampground;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.updateBookings = updateBookings;
window.downloadStatisticsPDF = downloadStatisticsPDF;

const campgroundManager = new CampgroundManager();
const bookingManager = new BookingManager();
const userManager = new UserManager();

// main initialization
document.addEventListener("DOMContentLoaded", function () {
  if (!document.querySelector(".admin-content")) return;

  checkAdminAuth()
    .then(function (user) {
      var adDesk = document.getElementById("adminMenuDesktop");
      if (adDesk) adDesk.style.display = "inline";
      var adMob = document.getElementById("adminMenuMobile");
      if (adMob) adMob.style.display = "inline";

      Promise.all([loadCampgrounds(), loadUsers(), loadBookings()]).then(
        function () {
          updateStats();
          campgroundManager.setupForm();
        }
      );
    })
    .catch(function () {});
});

// admin auth check
async function checkAdminAuth() {
  var res = await fetch("/api/auth/me", { credentials: "include" });
  var data = await res.json();
  if (!res.ok || !data.ok || data.user.role !== "admin") {
    alert("acces neautorizat. vei fi redirectionat");
    window.location.href = "login.html";
    throw new Error();
  }
  return data.user;
}

// tab management
function showTab(tabName, btn) {
  var tabs = document.querySelectorAll(".admin-tab");
  for (var i = 0; i < tabs.length; i++) tabs[i].classList.remove("active");

  var secs = document.querySelectorAll(".admin-section");
  for (var i = 0; i < secs.length; i++) secs[i].classList.remove("active");

  btn.classList.add("active");
  var section = document.getElementById(tabName + "-section");
  if (section) section.classList.add("active");

  if (tabName === "campgrounds") loadCampgrounds();
  if (tabName === "users") loadUsers();
  if (tabName === "add-campground") resetForm();
  if (tabName === "bookings") updateBookings();
}

// statistics update
function updateStats() {
  var tC = document.getElementById("totalCampgrounds");
  if (tC) tC.textContent = campgrounds.length;

  var aC = document.getElementById("activeCampgrounds");
  if (aC) {
    var cnt = 0;
    for (var i = 0; i < campgrounds.length; i++) {
      if (campgrounds[i].status) cnt++;
    }
    aC.textContent = cnt;
  }

  var tU = document.getElementById("totalUsers");
  if (tU) tU.textContent = users.length;

  var avgEl = document.getElementById("avgRating");
  if (avgEl) {
    var sum = 0;
    var count = 0;

    campgrounds.forEach((c) => {
      const r = Number(c.avg_rating);
      if (!isNaN(r) && r > 0) {
        sum += r;
        count++;
      }
    });

    const avg = count > 0 ? (sum / count).toFixed(1) : "0.0";
    avgEl.textContent = avg;
  }
}

// data loading functions
async function loadCampgrounds() {
  try {
    var res = await fetch("/api/camps", { credentials: "include" });
    campgrounds = res.ok ? await res.json() : [];
  } catch (e) {
    campgrounds = [];
  }
  campgroundManager.renderCampgrounds(campgrounds);
  updateStats();
}

async function loadUsers() {
  try {
    var res = await fetch("/api/users", { credentials: "include" });
    users = res.ok ? await res.json() : [];
  } catch (e) {
    users = [];
  }
  userManager.renderUsers(users);
  updateStats();
}

async function loadBookings() {
  try {
    const response = await fetch("/api/bookings", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to fetch bookings");
    }
    bookings = await response.json();
  } catch (error) {
    console.error("Error loading bookings:", error);
    bookings = [];
  }
  bookingManager.renderBookings(bookings);
}

function downloadStatisticsPDF() {
  fetch("/api/reports/daily", {
    method: "GET",
    headers: {
      credentials: "include",
      Accept: "application/pdf",
    },
  })
    .then((response) => {
      if (!response.ok) throw new Error("Eroare la descărcarea PDF-ului");
      return response.blob();
    })
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      window.open(url, "_blank");
      // Opțional: eliberezi blob-ul după ceva timp
      setTimeout(() => window.URL.revokeObjectURL(url), 10000);
    })
    .catch((error) => {
      alert("A apărut o eroare la generarea PDF-ului.");
      console.error(error);
    });
}

// wrapper functions for module methods
function editCampground(id) {
  campgroundManager.editCampground(id, campgrounds);
}

async function toggleCampground(id) {
  await campgroundManager.toggleCampground(id, campgrounds);
  await loadCampgrounds();
}

async function deleteCampground(id) {
  await campgroundManager.deleteCampground(id);
  await loadCampgrounds();
  updateStats();
}

async function updateUserRole(id, newRole) {
  await userManager.updateUserRole(id, newRole);
  await loadUsers();
}

async function deleteUser(id) {
  await userManager.deleteUser(id);
  await loadUsers();
  updateStats();
}

function updateBookings() {
  return loadBookings();
}

// util
function resetForm() {
  campgroundManager.resetForm();
}
