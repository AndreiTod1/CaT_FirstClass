export class BookingManager {
  constructor() {
    this.bookings = [];
  }

  // render bookings table
  renderBookings(bookings) {
    this.bookings = bookings;
    const container = document.getElementById("bookingsList");
    if (!container) return;

    if (bookings.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><p>Nu există rezervări încă.</p></div>';
      return;
    }

    // sort bookings by start date
    bookings.sort((a, b) => new Date(b.start_date) + new Date(a.start_date));

    const table = document.createElement("table");
    table.className = "data-table";

    // header
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

    // body
    const tbody = document.createElement("tbody");

    bookings.forEach((booking) => {
      const row = document.createElement("tr");

      // id
      const idCell = document.createElement("td");
      idCell.textContent = booking.id;
      row.appendChild(idCell);

      // user id
      const userCell = document.createElement("td");
      userCell.textContent = booking.user_id;
      row.appendChild(userCell);

      // camp site id
      const campCell = document.createElement("td");
      campCell.textContent = booking.camp_site_id;
      row.appendChild(campCell);

      // start date
      const startCell = document.createElement("td");
      startCell.textContent = new Date(booking.start_date).toLocaleDateString(
        "ro-RO"
      );
      row.appendChild(startCell);

      // end date
      const endCell = document.createElement("td");
      endCell.textContent = new Date(booking.end_date).toLocaleDateString(
        "ro-RO"
      );
      row.appendChild(endCell);

      // status
      const statusCell = document.createElement("td");
      const statusBadge = document.createElement("span");
      statusBadge.className = `status-badge ${this.getStatusClass(
        booking.status
      )}`;
      statusBadge.textContent = this.getStatusText(booking.status);
      statusCell.appendChild(statusBadge);
      row.appendChild(statusCell);

      // buttons
      const actionsCell = document.createElement("td");
      const deleteBtn = document.createElement("button");
      deleteBtn.className = "action-btn btn-delete";
      deleteBtn.textContent = "Șterge";
      deleteBtn.onclick = () => this.deleteBooking(booking.id);
      actionsCell.appendChild(deleteBtn);
      if (booking.status === "confirmed") {
        row.appendChild(actionsCell);
      }

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.innerHTML = "";
    container.appendChild(table);
  }

  // Get status CSS class
  getStatusClass(status) {
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

  // Get status display text
  getStatusText(status) {
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

  // delete booking
  async deleteBooking(id) {
    if (!confirm("Ești sigur că vrei să ștergi această rezervare?")) {
      return;
    }

    try {
      const response = await fetch(`/api/bookings/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        alert("Rezervarea a fost ștearsă cu succes!");
        // trigger reload via global function
        window.updateBookings();
      } else {
        throw new Error("Failed to delete booking");
      }
    } catch (error) {
      console.error("Error deleting booking:", error);
      alert("Eroare la ștergerea rezervării!");
    }
  }
}
