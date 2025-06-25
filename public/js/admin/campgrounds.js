export class CampgroundManager {
  constructor() {
    this.campgrounds = [];
  }

  // Helper functions
  getElementValue(id, defaultValue = "") {
    var element = document.getElementById(id);
    return element ? element.value.trim() : defaultValue;
  }

  getCheckboxValue(selector) {
    var checkbox = document.querySelector(selector);
    return checkbox ? checkbox.checked : false;
  }

  // Render campgrounds table
  renderCampgrounds(campgrounds) {
    this.campgrounds = campgrounds;
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
    campgrounds.forEach((c) => {
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
      be.addEventListener("click", () => {
        window.editCampground(c.id);
      });
      td6.appendChild(be);

      var bt = document.createElement("button");
      bt.className = "action-btn";
      bt.textContent = c.status ? "dezactiveaza" : "activeaza";
      bt.addEventListener("click", () => {
        window.toggleCampground(c.id);
      });
      td6.appendChild(bt);

      var bd = document.createElement("button");
      bd.className = "action-btn btn-delete";
      bd.textContent = "sterge";
      bd.addEventListener("click", () => {
        window.deleteCampground(c.id);
      });
      td6.appendChild(bd);

      tr.appendChild(td6);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    container.appendChild(table);
  }

  // Setup form for adding/updating campgrounds
  setupForm() {
    const form = document.getElementById("campgroundForm");
    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // campuri text/numerice
      const idField = this.getElementValue("campgroundId");
      const name = this.getElementValue("campgroundName");
      const region = this.getElementValue("campgroundRegion");
      const type = this.getElementValue("campgroundType");
      const price = this.getElementValue("campgroundPrice");
      const description = this.getElementValue("campgroundDescription");
      const latitude = this.getElementValue("campgroundLatitude");
      const longitude = this.getElementValue("campgroundLongitude");

      // Validate required fields
      if (!name) return alert("Numele camping-ului este obligatoriu!");
      if (!type) return alert("Tipul camping-ului este obligatoriu!");
      if (!price || isNaN(parseFloat(price)))
        return alert("Prețul trebuie să fie un număr valid!");

      const latVal = latitude ? parseFloat(latitude) : null;
      const lngVal = longitude ? parseFloat(longitude) : null;
      const priceVal = parseFloat(price);

      if (latitude && (isNaN(latVal) || latVal < -90 || latVal > 90))
        return alert("Latitudinea trebuie să fie între -90 și 90!");
      if (longitude && (isNaN(lngVal) || lngVal < -180 || lngVal > 180))
        return alert("Longitudinea trebuie să fie între -180 și 180!");

      const payload = {
        name,
        latitude: latVal,
        longitude: lngVal,
        region: region || null,
        type,
        price: priceVal,
        description: description || null,
        wifi: this.getCheckboxValue('input[value="wifi"]'),
        shower: this.getCheckboxValue('input[value="showers"]'),
        barbecue: this.getCheckboxValue(
          'input[name="facilities"][value="barbecue"]'
        ),
        parking: this.getCheckboxValue('input[value="parking"]'),
        capacity: 0,
      };

      // fisiere media
      const fileInput = document.getElementById("campgroundMedia");
      const filesArray =
        fileInput && fileInput.files ? Array.from(fileInput.files) : [];
      const hasFiles = filesArray.length > 0;

      // fetch
      const method = idField ? "PUT" : "POST";
      const url = idField ? `/api/camps/${idField}` : "/api/camps";

      let fetchOptions;
      if (hasFiles) {
        const fd = new FormData();
        fd.append("payload", JSON.stringify(payload)); // backend-ul asteapta „payload”
        filesArray.forEach((f) => fd.append("media", f));

        fetchOptions = {
          method,
          credentials: "include",
          body: fd,
        };
      } else {
        fetchOptions = {
          method,
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        };
      }

      try {
        const res = await fetch(url, fetchOptions);
        if (!res.ok) {
          const errorData = await res.text();
          throw new Error("Server error: " + errorData);
        }

        alert(
          idField
            ? "Camping actualizat cu succes!"
            : "Camping adăugat cu succes!"
        );
        this.resetForm();

        if (window.loadCampgrounds) await window.loadCampgrounds();

        // revenim la tab-ul „campgrounds”
        const btn = document.querySelector(
          ".admin-tab[onclick*=\"'campgrounds'\"]"
        );
        if (btn) window.showTab("campgrounds", btn);
      } catch (err) {
        console.error("Error saving campground:", err);
        alert("Eroare la salvarea camping-ului: " + err.message);
      }
    });
  }

  // Edit campground
  editCampground(id, campgrounds) {
    var c = campgrounds.find((x) => x.id === id);
    if (!c) return alert("Camping-ul nu a fost găsit.");

    // Switch to add tab
    var addBtn = Array.from(document.querySelectorAll(".admin-tab")).find((t) =>
      t.textContent.toLowerCase().includes("adaugă")
    );
    if (addBtn) window.showTab("add-campground", addBtn);

    // Fill form safely
    var idField = document.getElementById("campgroundId");
    if (idField) idField.value = c.id || "";

    var nameField = document.getElementById("campgroundName");
    if (nameField) nameField.value = c.name || "";

    var latField = document.getElementById("campgroundLatitude");
    if (latField) latField.value = c.latitude || "";

    var lngField = document.getElementById("campgroundLongitude");
    if (lngField) lngField.value = c.longitude || "";

    var regionField = document.getElementById("campgroundRegion");
    if (regionField) regionField.value = c.region || "";

    var typeField = document.getElementById("campgroundType");
    if (typeField) typeField.value = c.type || "";

    var priceField = document.getElementById("campgroundPrice");
    if (priceField) priceField.value = c.price || "";

    var descField = document.getElementById("campgroundDescription");
    if (descField) descField.value = c.description || "";

    // Set checkboxes safely
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

    var submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.textContent = "Actualizează camping";
  }

  // Toggle campground status
  async toggleCampground(id, campgrounds) {
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
    } catch (err) {
      alert("eroare la actualizare status");
    }
  }

  // Delete campground
  async deleteCampground(id) {
    if (!confirm("esti sigur?")) return;
    try {
      await fetch("/api/camps/" + id, {
        method: "DELETE",
        credentials: "include",
      });
    } catch (err) {
      alert("eroare la stergere");
    }
  }

  // Reset form
  resetForm() {
    var f = document.getElementById("campgroundForm");
    if (!f) return;
    f.reset();

    var latField = document.getElementById("campgroundLatitude");
    if (latField) latField.value = "";

    var lngField = document.getElementById("campgroundLongitude");
    if (lngField) lngField.value = "";

    var idField = document.getElementById("campgroundId");
    if (idField) idField.value = "";

    var submitBtn = document.getElementById("submitBtn");
    if (submitBtn) submitBtn.textContent = "Adaugă camping";

    const mediaField = document.getElementById("campgroundMedia");
    if (mediaField) mediaField.value = "";
  }
}
