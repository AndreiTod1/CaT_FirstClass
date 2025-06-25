export const CalendarModule = {
  currentCampground: null,
  currentMonth: new Date().getMonth(),
  currentYear: new Date().getFullYear(),
  bookedDates: [],

  init(campground) {
    this.currentCampground = campground;
    this.loadBookedDates().then(() => {
      this.updateCalendar();
      this.setupEventListeners();
    });
  },

  async loadBookedDates() {
    try {
      const r = await fetch(
        `/api/bookings?campId=${this.currentCampground.id}`
      );
      this.bookedDates = r.ok ? await r.json() : [];
    } catch (e) {
      console.error("loadBookedDates error:", e);
      this.bookedDates = [];
    }
  },

  setupEventListeners() {
    document.getElementById("prevMonth").addEventListener("click", () => {
      this.currentMonth === 0
        ? ((this.currentMonth = 11), this.currentYear--)
        : this.currentMonth--;
      this.updateCalendar();
    });

    document.getElementById("nextMonth").addEventListener("click", () => {
      this.currentMonth === 11
        ? ((this.currentMonth = 0), this.currentYear++)
        : this.currentMonth++;
      this.updateCalendar();
    });
  },

  updateCalendar() {
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

    document.getElementById("currentMonthYear").textContent = `${
      months[this.currentMonth]
    } ${this.currentYear}`;

    const cal = document.getElementById("availabilityCalendar");
    cal.innerHTML = "";
    cal.appendChild(
      this.createMonthCalendar(new Date(this.currentYear, this.currentMonth))
    );
  },

  createMonthCalendar(date) {
    const y = date.getFullYear();
    const m = date.getMonth();
    const grid = document.createElement("div");
    grid.className = "days-grid";

    // add day headers
    ["L", "M", "M", "J", "V", "S", "D"].forEach((d) => {
      const h = document.createElement("div");
      h.className = "day-header";
      h.textContent = d;
      grid.appendChild(h);
    });

    // add empty cells for padding
    const firstDay = new Date(y, m, 1);
    const lastDay = new Date(y, m + 1, 0);
    const pad = (firstDay.getDay() + 6) % 7;

    for (let i = 0; i < pad; i++) {
      grid.appendChild(
        Object.assign(document.createElement("div"), {
          className: "day-cell empty",
        })
      );
    }

    // add day cells
    for (let d = 1; d <= lastDay.getDate(); d++) {
      const cell = document.createElement("div");
      cell.className = "day-cell";
      cell.textContent = d;

      const iso = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(
        2,
        "0"
      )}`;
      const past = new Date(y, m, d) <= new Date().setHours(0, 0, 0, 0);

      if (this.bookedDates.includes(iso)) {
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
  },
};
