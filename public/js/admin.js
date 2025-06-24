window.showTab = showTab;
window.resetForm = resetForm;
window.closeModal = closeModal;
window.editCampground = editCampground;
window.toggleCampground = toggleCampground;
window.deleteCampground = deleteCampground;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.logout = logout;
window.updateBookings = updateBookings;

var campgrounds = [];
var users = [];
var bookings = [];

// initializare pe pagina de admin
document.addEventListener("DOMContentLoaded", function () {
  if (!document.querySelector(".admin-content")) return;

  checkAdminAuth()
    .then(function (user) {
      showUser(user);

      var adDesk = document.getElementById("adminMenuDesktop");
      if (adDesk) adDesk.style.display = "inline";
      var adMob = document.getElementById("adminMenuMobile");
      if (adMob) adMob.style.display = "inline";

      Promise.all([loadCampgrounds(), loadUsers(), loadBookings()]).then(
        function () {
          updateStats();
          setupForm();

          var modal = document.getElementById("editModal");
          if (modal) {
            modal.addEventListener("click", function (e) {
              if (e.target === modal) closeModal();
            });
          }
        }
      );
    })
    .catch(function () {});
});

// verificare admin
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

// afisare user in navbar
function showUser(user) {
  var loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.parentNode.removeChild(loginBtn);

  var box = document.getElementById("userBox");
  if (box) {
    var nameEl = box.querySelector("#userName");
    if (nameEl) nameEl.textContent = user.name || user.email;
    box.style.display = "flex";
    var logoutBtn = box.querySelector("#logoutBtn");
    if (logoutBtn) logoutBtn.addEventListener("click", logout);
  }

  var mBox = document.getElementById("mobileUserInfo");
  if (mBox) {
    var mName = mBox.querySelector("#mobileUserName");
    if (mName) mName.textContent = user.name || user.email;
    mBox.style.display = "flex";
    var mLogout = mBox.querySelector("#mobileLogoutBtn");
    if (mLogout) mLogout.addEventListener("click", logout);
  }
}

// logout
function logout() {
  fetch("/api/auth/logout", { method: "POST", credentials: "include" }).finally(
    function () {
      window.location.href = "login.html";
    }
  );
}

// tab-uri
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

// statistici
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

// incarcare + render campgrounds
async function loadCampgrounds() {
  try {
    var res = await fetch("/api/camps", { credentials: "include" });
    campgrounds = res.ok ? await res.json() : [];
  } catch (e) {
    campgrounds = [];
  }
  renderCampgrounds();
  updateStats();
}

function renderCampgrounds() {
  var container = document.getElementById("campgroundsList");
  if (!container) return;
  container.textContent = "";

  if (campgrounds.length === 0) {
    var d = document.createElement("div");
    d.className = "empty-state";
    var p = document.createElement("p");
    p.textContent = "nu exista camping-uri.";
    d.appendChild(p);
    container.appendChild(d);
    return;
  }

  var table = document.createElement("table");
  table.className = "data-table";

  var thead = document.createElement("thead");
  var hr = document.createElement("tr");
  ["Nume", "Pret", "Rating", "Status", "Actiuni"].forEach(function (h) {
    var th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  campgrounds.forEach(function (c) {
    var tr = document.createElement("tr");

    var td1 = document.createElement("td");
    var st = document.createElement("strong");
    st.textContent = c.name;
    var br = document.createElement("br");
    var sm = document.createElement("small");
    sm.textContent = c.region;
    td1.append(st, br, sm);
    tr.appendChild(td1);

    var td3 = document.createElement("td");
    td3.textContent = c.price + " lei/noapte";
    tr.appendChild(td3);

    var td4 = document.createElement("td");
    td4.textContent = c.avg_rating + " ⭐";
    tr.appendChild(td4);

    var td5 = document.createElement("td");
    var sp = document.createElement("span");
    sp.className =
      "status-badge " + (c.status ? "status-active" : "status-inactive");
    sp.textContent = c.status ? "activ" : "inactiv";
    td5.appendChild(sp);
    tr.appendChild(td5);

    var td6 = document.createElement("td");
    var be = document.createElement("button");
    be.className = "action-btn btn-edit";
    be.textContent = "editeaza";
    be.addEventListener("click", function () {
      editCampground(c.id);
    });
    td6.appendChild(be);

    var bt = document.createElement("button");
    bt.className = "action-btn";
    bt.textContent = c.status ? "dezactiveaza" : "activeaza";
    bt.addEventListener("click", function () {
      toggleCampground(c.id);
    });
    td6.appendChild(bt);

    var bd = document.createElement("button");
    bd.className = "action-btn btn-delete";
    bd.textContent = "sterge";
    bd.addEventListener("click", function () {
      deleteCampground(c.id);
    });
    td6.appendChild(bd);

    tr.appendChild(td6);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// incarcare + render utilizatori
async function loadUsers() {
  try {
    var res = await fetch("/api/users", { credentials: "include" });
    users = res.ok ? await res.json() : [];
  } catch (e) {
    users = [];
  }
  renderUsers();
  updateStats();
}

function renderUsers() {
  var container = document.getElementById("usersList");
  if (!container) return;
  container.textContent = "";

  if (users.length === 0) {
    var d = document.createElement("div");
    d.className = "empty-state";
    var p = document.createElement("p");
    p.textContent = "nu exista utilizatori.";
    d.appendChild(p);
    container.appendChild(d);
    return;
  }

  var table = document.createElement("table");
  table.className = "data-table";

  var thead = document.createElement("thead");
  var hr = document.createElement("tr");
  ["Nume", "Email", "Rol", "Data inregistrarii", "Actiuni"].forEach(function (
    h
  ) {
    var th = document.createElement("th");
    th.textContent = h;
    hr.appendChild(th);
  });
  thead.appendChild(hr);
  table.appendChild(thead);

  var tbody = document.createElement("tbody");
  users.forEach(function (u) {
    var tr = document.createElement("tr");

    var td1 = document.createElement("td");
    td1.textContent = u.name;
    tr.appendChild(td1);

    var td2 = document.createElement("td");
    td2.textContent = u.email;
    tr.appendChild(td2);

    var td3 = document.createElement("td");
    var sel = document.createElement("select");
    var optU = document.createElement("option");
    optU.value = "member";
    optU.textContent = "member";
    var optA = document.createElement("option");
    optA.value = "admin";
    optA.textContent = "admin";
    sel.append(optU, optA);
    sel.value = u.role === "admin" ? "admin" : "member";
    sel.addEventListener("change", function () {
      updateUserRole(u.id, sel.value);
    });
    td3.appendChild(sel);
    tr.appendChild(td3);

    var td4 = document.createElement("td");
    td4.textContent = new Date(u.created_at).toLocaleDateString("ro-RO");
    tr.appendChild(td4);

    var td5 = document.createElement("td");
    var bd = document.createElement("button");
    bd.className = "action-btn btn-delete";
    bd.textContent = "sterge";
    bd.addEventListener("click", function () {
      deleteUser(u.id);
    });
    td5.appendChild(bd);
    tr.appendChild(td5);

    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  container.appendChild(table);
}

// setup form adauga/actualizeaza camping
function setupForm() {
  var form = document.getElementById("campgroundForm");
  if (!form) return;
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    var idField = document.getElementById("campgroundId").value;

    // grab by ID:
    var latVal = parseFloat(
      document.getElementById("campgroundLatitude").value
    );
    var lngVal = parseFloat(
      document.getElementById("campgroundLongitude").value
    );

    var payload = {
      name: form.campgroundName.value,
      latitude: isNaN(latVal) ? null : latVal,
      longitude: isNaN(lngVal) ? null : lngVal,
      region: form.campgroundRegion.value,
      type: form.campgroundType.value,
      price: parseFloat(form.campgroundPrice.value),
      description: form.campgroundDescription.value,
      image_url: form.campgroundImage.value,
      wifi: document.querySelector('input[value="wifi"]').checked,
      shower: document.querySelector('input[value="showers"]').checked,
      barbecue: document.querySelector(
        'input[name="facilities"][value="barbecue"]'
      ).checked,
      parking: document.querySelector('input[value="parking"]').checked,
      capacity: 0, // not used
    };

    var method = idField ? "PUT" : "POST";
    var url = idField ? "/api/camps/" + idField : "/api/camps";

    try {
      var res = await fetch(url, {
        method: method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      alert(idField ? "camping actualizat" : "camping adaugat");
      resetForm();
      await loadCampgrounds();
      var btn = document.querySelector(
        ".admin-tab[onclick*=\"'campgrounds'\"]"
      );
      if (btn) showTab("campgrounds", btn);
    } catch (err) {
      alert("eroare la salvare camping-ului");
    }
  });
}

// edit / toggle / delete camping-uri
function editCampground(id) {
  var c = campgrounds.find((x) => x.id === id);
  if (!c) return alert("Camping-ul nu a fost găsit.");

  // 1) open the add tab
  var addBtn = Array.from(document.querySelectorAll(".admin-tab")).find((t) =>
    t.textContent.toLowerCase().includes("adaugă")
  );
  if (addBtn) showTab("add-campground", addBtn);

  // 2) fill the rest
  document.getElementById("campgroundId").value = c.id;
  document.getElementById("campgroundName").value = c.name;
  document.getElementById("campgroundLatitude").value = c.latitude ?? "";
  document.getElementById("campgroundLongitude").value = c.longitude ?? "";
  document.getElementById("campgroundRegion").value = c.region;
  document.getElementById("campgroundType").value = c.type;
  document.getElementById("campgroundPrice").value = c.price;
  document.getElementById("campgroundDescription").value = c.description || "";
  document.getElementById("campgroundImage").value = c.image_url || "";

  document.querySelectorAll(".facility-item input").forEach((cb) => {
    switch (cb.value) {
      case "wifi":
        cb.checked = !!c.wifi;
        break;
      case "showers":
        cb.checked = !!c.shower;
        break;
      case "barbecue":
        cb.checked = !!c.barbecue;
        break;
      case "parking":
        cb.checked = !!c.parking;
        break;
    }
  });

  document.getElementById("submitBtn").textContent = "actualizează camping";
}

async function toggleCampground(id) {
  var c = campgrounds.find(function (x) {
    return x.id === id;
  });
  if (!c) return;
  try {
    await fetch(`/api/camps/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !c.status }),
    });
    await loadCampgrounds();
  } catch (err) {
    alert("eroare la actualizare status");
  }
}

async function deleteCampground(id) {
  if (!confirm("esti sigur?")) return;
  try {
    await fetch("/api/camps/" + id, {
      method: "DELETE",
      credentials: "include",
    });
    await loadCampgrounds();
    updateStats();
  } catch (err) {
    alert("eroare la stergere");
  }
}

// schimbare rol utilizator
async function updateUserRole(id, newRole) {
  try {
    var res = await fetch("/api/users/" + id, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) throw new Error();
    await loadUsers();
  } catch (err) {
    alert("eroare la actualizare rol");
  }
}

// stergere utilizator
async function deleteUser(id) {
  if (!confirm("esti sigur?")) return;
  try {
    await fetch("/api/users/" + id, {
      method: "DELETE",
      credentials: "include",
    });
    await loadUsers();
    updateStats();
  } catch (err) {
    alert("eroare la stergere");
  }
}

// incarcare rezervari
async function loadBookings() {
  try {
    const response = await fetch("/api/bookings", { credentials: "include" });
    if (!response.ok) {
      throw new Error("Failed to fetch bookings");
    }

    bookings = await response.json();
    const container = document.getElementById("bookingsList");

    if (bookings.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>Nu există rezervări încă.</p></div>';
      return;
    }

    // Sort bookings by start date (most recent first)
    bookings.sort((a, b) => new Date(b.start_date) - new Date(a.start_date));

    const table = document.createElement("table");
    table.className = "data-table";

    // Create header
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    const headers = [
      "ID",
      "Utilizator ID",
      "Camping ID",
      "Data Check-in",
      "Data Check-out",
      "Status",
      "Acțiuni",
    ];

    headers.forEach((headerText) => {
      const th = document.createElement("th");
      th.textContent = headerText;
      headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Create body
    const tbody = document.createElement("tbody");

    bookings.forEach((booking) => {
      const row = document.createElement("tr");

      // ID
      const idCell = document.createElement("td");
      idCell.textContent = booking.id;
      row.appendChild(idCell);

      // User ID
      const userCell = document.createElement("td");
      userCell.textContent = booking.user_id;
      row.appendChild(userCell);

      // Camp Site ID
      const campCell = document.createElement("td");
      campCell.textContent = booking.camp_site_id;
      row.appendChild(campCell);

      // Start Date
      const startCell = document.createElement("td");
      startCell.textContent = new Date(booking.start_date).toLocaleDateString(
        "ro-RO"
      );
      row.appendChild(startCell);

      // End Date
      const endCell = document.createElement("td");
      endCell.textContent = new Date(booking.end_date).toLocaleDateString(
        "ro-RO"
      );
      row.appendChild(endCell);

      // Status
      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `status-badge ${getStatusClass(booking.status)}`;
      statusBadge.textContent = getStatusText(booking.status);
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // Actions
      const actionsCell = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "action-btn btn-delete";
      deleteBtn.textContent = "Șterge";
      deleteBtn.onclick = () => deleteBooking(booking.id);
      actionsCell.appendChild(deleteBtn);
      row.appendChild(actionsCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.innerHTML = "";
    container.appendChild(table);
  } catch (error) {
    console.error("Error loading bookings:", error);
    const container = document.getElementById("bookingsList");
    container.innerHTML =
      '<div class="empty-state"><p>Eroare la încărcarea rezervărilor.</p></div>';
  }
}

function updateBookings() {
  return loadBookings();
}

function getStatusClass(status) {
  switch (status) {
    case "confirmed":
      return "status-active";
    case "pending":
      return "status-inactive";
    case "cancelled":
      return "status-inactive";
    default:
      return "status-inactive";
  }
}

function getStatusText(status) {
  switch (status) {
    case "confirmed":
      return "Confirmat";
    case "pending":
      return "În așteptare";
    case "cancelled":
      return "Anulat";
    default:
      return status;
  }
}

async function deleteBooking(id) {
  if (!confirm("Ești sigur că vrei să ștergi această rezervare?")) {
    return;
  }

  try {
    const response = await fetch(`/api/bookings/${id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      alert("Rezervarea a fost ștearsă cu succes!");
      loadBookings();
      updateStats();
    } else {
      throw new Error("Failed to delete booking");
    }
  } catch (error) {
    console.error("Error deleting booking:", error);
    alert("Eroare la ștergerea rezervării!");
  }
}

// reset form & close modal
function resetForm() {
  var f = document.getElementById("campgroundForm");
  if (!f) return;
  f.reset();

  document.getElementById("campgroundLatitude").value = "";
  document.getElementById("campgroundLongitude").value = "";

  document.getElementById("campgroundId").value = "";
  document.getElementById("submitBtn").textContent = "adauga camping";
}

function closeModal() {
  var m = document.getElementById("editModal");
  if (m) m.classList.remove("active");
}
