import { CalendarModule } from "./calendar.js";

export const BookingModule = {
  currentUser: null,
  currentCampground: null,

  init(user, campground) {
    this.currentUser = user;
    this.currentCampground = campground;
    this.setupEventListeners();
    this.setMinDates();
  },

  setupEventListeners() {
    document.getElementById("bookingForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit();
    });

    document.getElementById("checkinDate").addEventListener("change", () => {
      this.updateCheckoutMinDate();
      this.calculateTotalPrice();
    });

    ["checkoutDate", "guestsCount"].forEach((id) =>
      document
        .getElementById(id)
        .addEventListener("change", () => this.calculateTotalPrice())
    );
  },

  setMinDates() {
    const tomorrow = new Date(Date.now() + 864e5).toISOString().split("T")[0];
    document.getElementById("checkinDate").min = tomorrow;
    document.getElementById("checkoutDate").min = tomorrow;
  },

  updateCheckoutMinDate() {
    const checkinInput = document.getElementById("checkinDate");
    const checkoutInput = document.getElementById("checkoutDate");

    if (checkinInput.value) {
      const checkinDate = new Date(checkinInput.value);
      checkinDate.setDate(checkinDate.getDate() + 1);
      const minCheckoutDate = checkinDate.toISOString().split("T")[0];
      checkoutInput.min = minCheckoutDate;

      if (checkoutInput.value && checkoutInput.value <= checkinInput.value) {
        checkoutInput.value = "";
      }
    }
  },

  calculateTotalPrice() {
    const inStr = document.getElementById("checkinDate").value;
    const outStr = document.getElementById("checkoutDate").value;

    if (!inStr || !outStr) {
      document.getElementById("totalPrice").textContent = "0";
      return;
    }

    const inD = new Date(inStr);
    const outD = new Date(outStr);

    if (outD <= inD) {
      document.getElementById("totalPrice").textContent = "0";
      return;
    }

    document.getElementById("totalPrice").textContent = this.calculatePrice(
      inD,
      outD
    );
  },

  calculatePrice(checkin, checkout) {
    const nights = Math.ceil((checkout - checkin) / 864e5);
    return nights * parseFloat(this.currentCampground.price ?? 0);
  },

  async submit() {
    if (!this.currentUser) {
      alert("Trebuie să fii conectat pentru a face o rezervare!");
      window.location.href = "login.html";
      return;
    }

    const inStr = document.getElementById("checkinDate").value;
    const outStr = document.getElementById("checkoutDate").value;

    if (!inStr || !outStr) {
      alert("Te rog să selectezi datele de check-in și check-out!");
      return;
    }

    const inD = new Date(inStr);
    const outD = new Date(outStr);

    if (outD <= inD) {
      alert(
        "Data de check-out trebuie să fie cu cel puțin o zi după data de check-in!"
      );
      return;
    }

    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: this.currentUser.id,
          camp_site_id: this.currentCampground.id,
          start_date: inStr,
          end_date: outStr,
        }),
      });

      if (r.status === 201) {
        alert(
          `Rezervarea ta a fost confirmată! Total: ${this.calculatePrice(
            inD,
            outD
          )} lei`
        );
        document.getElementById("bookingForm").reset();
        document.getElementById("totalPrice").textContent = "0";
        await CalendarModule.loadBookedDates();
        CalendarModule.updateCalendar();
      } else if (r.status === 409) {
        alert("Una sau mai multe zile nu sunt disponibile!");
      } else {
        alert("A apărut o eroare la realizarea rezervării!");
      }
    } catch (e) {
      console.error("submitBooking error:", e);
      alert("A apărut o eroare la realizarea rezervării!");
    }
  },
};
