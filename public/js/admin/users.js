export class UserManager {
  constructor() {
    this.users = [];
  }

  // render users table
  renderUsers(users) {
    this.users = users;
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
    users.forEach((u) => {
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
      sel.addEventListener("change", () => {
        window.updateUserRole(u.id, sel.value);
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
      bd.addEventListener("click", () => {
        window.deleteUser(u.id);
      });
      td5.appendChild(bd);
      tr.appendChild(td5);

      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // update user role
  async updateUserRole(id, newRole) {
    try {
      var res = await fetch("/api/users/" + id, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: newRole }),
      });
      if (!res.ok) throw new Error();
    } catch (err) {
      alert("eroare la actualizare rol");
    }
  }

  // delete user
  async deleteUser(id) {
    if (!confirm("esti sigur?")) return;
    try {
      await fetch("/api/users/" + id, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (err) {
      alert("eroare la stergere");
    }
  }
}
