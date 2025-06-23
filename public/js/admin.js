window.showTab = showTab;
window.resetForm = resetForm;
window.closeModal = closeModal;
window.editCampground = editCampground;
window.toggleCampground = toggleCampground;
window.deleteCampground = deleteCampground;
window.updateUserRole = updateUserRole;
window.deleteUser = deleteUser;
window.logout = logout;

var campgrounds = [];
var users = [];

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

      Promise.all([loadCampgrounds(), loadUsers()]).then(function () {
        updateStats();
        setupForm();

        var modal = document.getElementById("editModal");
        if (modal) {
          modal.addEventListener("click", function (e) {
            if (e.target === modal) closeModal();
          });
        }
      });
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
}

// statistici
function updateStats() {
  var tC = document.getElementById("totalCampgrounds");
  if (tC) tC.textContent = campgrounds.length;

  var aC = document.getElementById("activeCampgrounds");
  if (aC) {
    var cnt = 0;
    for (var i = 0; i < campgrounds.length; i++) {
      if (campgrounds[i].active) cnt++;
    }
    aC.textContent = cnt;
  }

  var tU = document.getElementById("totalUsers");
  if (tU) tU.textContent = users.length;

  var avgEl = document.getElementById("avgRating");
  if (avgEl) {
    var sum = 0;
    for (var i = 0; i < campgrounds.length; i++) {
      sum += campgrounds[i].rating;
    }
    var avg = "0.0";
    if (campgrounds.length > 0) avg = (sum / campgrounds.length).toFixed(1);
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
  ["Nume", "Locatie", "Pret", "Rating", "Status", "Actiuni"].forEach(function (
    h
  ) {
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

    var td2 = document.createElement("td");
    td2.textContent = c.location;
    tr.appendChild(td2);

    var td3 = document.createElement("td");
    td3.textContent = c.price + " lei/noapte";
    tr.appendChild(td3);

    var td4 = document.createElement("td");
    td4.textContent = c.rating + " ⭐";
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
    bt.className = "action-btn btn-toggle";
    bt.textContent = c.status ? "dezactiveaza" : "activeaza";
    bt.addEventListener("click", function () {
      toggleCampground(c.id);
    });
    td6.appendChild(bt);

    var bd = document.createElement("button");
    bd.className = "action-btn btn-delete btn-toggle";
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
    bd.className = "action-btn btn-delete btn-toggle";
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
    var payload = {
      name: form.campgroundName.value,
      location: form.campgroundLocation.value,
      region: form.campgroundRegion.value,
      type: form.campgroundType.value,
      price: parseFloat(form.campgroundPrice.value),
      rating: 0,
      description: form.campgroundDescription.value,
      image: form.campgroundImage.value,
      facilities: [],
    };
    var boxes = form.querySelectorAll(".facility-checkbox input:checked");
    for (var i = 0; i < boxes.length; i++) {
      payload.facilities.push(boxes[i].value);
    }
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
  // găsești camping-ul
  var c = campgrounds.find((x) => x.id === id);
  if (!c) return;

  var btn = document.querySelector(".admin-tab[onclick*=\"'add-campground'\"]");
  if (btn) showTab("add-campground", btn);

  document.getElementById("campgroundId").value = c.id;
  document.getElementById("campgroundName").value = c.name;
  document.getElementById("campgroundLocation").value = c.location;
  document.getElementById("campgroundRegion").value = c.region;
  document.getElementById("campgroundType").value = c.type;
  document.getElementById("campgroundPrice").value = c.price;
  document.getElementById("campgroundRating").value = c.rating;
  document.getElementById("campgroundDescription").value = c.description;
  document.getElementById("campgroundImage").value = c.image || "";

  document.querySelectorAll(".facility-checkbox input").forEach((cb) => {
    cb.checked = c.facilities.includes(cb.value);
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

// reset form & close modal
function resetForm() {
  var f = document.getElementById("campgroundForm");
  if (!f) return;
  f.reset();
  var i = document.getElementById("campgroundId");
  if (i) i.value = "";
  var s = document.getElementById("submitBtn");
  if (s) s.textContent = "adauga camping";
}

function closeModal() {
  var m = document.getElementById("editModal");
  if (m) m.classList.remove("active");
}
