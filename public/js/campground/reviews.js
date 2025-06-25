export const ReviewsModule = {
  currentUser: null,
  currentCampground: null,
  selectedRating: 0,

  init(user, campground) {
    this.currentUser = user;
    this.currentCampground = campground;
    this.loadReviews();
    this.setupEventListeners();
  },

  async loadReviews() {
    try {
      const r = await fetch(`/api/camps/${this.currentCampground.id}/reviews`);
      const reviews = r.ok ? await r.json() : [];
      this.populateReviews(reviews);
    } catch (e) {
      console.error("loadReviews error:", e);
      this.populateReviews([]);
    }
  },

  setupEventListeners() {
    // star rating
    const stars = document.querySelectorAll(".star");
    stars.forEach((s) => {
      s.addEventListener("click", () => {
        this.selectedRating = +s.dataset.rating;
        this.updateStarDisplay();
      });
      s.addEventListener("mouseover", () =>
        this.highlightStars(+s.dataset.rating)
      );
    });

    document
      .querySelector(".star-rating")
      .addEventListener("mouseleave", () => this.updateStarDisplay());

    // Review form
    document.getElementById("addReviewForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.submit();
    });
  },

  populateReviews(revs) {
    const cont = document.getElementById("reviewsContainer");
    cont.innerHTML = "";

    if (!revs.length) {
      cont.textContent =
        "Nu există recenzii încă. Fii primul care lasă o recenzie!";
      return;
    }

    revs.forEach((r) => cont.appendChild(this.createReviewElement(r)));
  },

  createReviewElement(r) {
    const card = document.createElement("div");
    card.className = "review-card";

    const rating = "★".repeat(r.rating) + "☆".repeat(5 - r.rating);

    // Header
    const header = document.createElement("div");
    header.className = "review-header";

    const userInfo = document.createElement("div");
    userInfo.className = "review-user-info";

    const avatar = document.createElement("div");
    avatar.className = "review-avatar";
    const avatarSpan = document.createElement("span");
    avatarSpan.textContent = (r.author || "U")[0].toUpperCase();
    avatar.appendChild(avatarSpan);

    const userDetails = document.createElement("div");
    userDetails.className = "review-user-details";

    const userName = document.createElement("h4");
    userName.className = "review-user";
    userName.textContent = r.author || "Utilizator anonim";

    const ratingDiv = document.createElement("div");
    ratingDiv.className = "review-rating";
    ratingDiv.textContent = rating;

    userDetails.appendChild(userName);
    userDetails.appendChild(ratingDiv);
    userInfo.appendChild(avatar);
    userInfo.appendChild(userDetails);

    const dateSpan = document.createElement("span");
    dateSpan.className = "review-date";
    dateSpan.textContent = this.formatDate(r.created_at);

    header.appendChild(userInfo);
    header.appendChild(dateSpan);

    // Content
    const content = document.createElement("div");
    content.className = "review-content";

    if (r.comment) {
      const commentP = document.createElement("p");
      commentP.className = "review-comment";
      commentP.textContent = r.comment;
      content.appendChild(commentP);
    }

    // Media
    if (r.media_urls && r.media_urls.length > 0) {
      const mediaWrapper = document.createElement("div");
      mediaWrapper.className = "review-image-wrapper";

      r.media_urls.forEach((u) => {
        if (this.isVideo(u)) {
          const video = document.createElement("video");
          video.src = u;
          video.controls = true;
          video.preload = "metadata";
          video.className = "review-video video";
          mediaWrapper.appendChild(video);
        } else {
          const img = document.createElement("img");
          img.src = u;
          img.alt = "Imagine";
          img.className = "review-image image";
          img.addEventListener("click", () => window.openImageModal(img.src));
          mediaWrapper.appendChild(img);
        }
      });

      content.appendChild(mediaWrapper);
    }

    card.appendChild(header);
    card.appendChild(content);

    return card;
  },

  updateStarDisplay() {
    document.querySelectorAll(".star").forEach((s, i) => {
      if (i < this.selectedRating) {
        s.textContent = "★";
        s.classList.add("selected");
      } else {
        s.textContent = "☆";
        s.classList.remove("selected");
      }
    });
  },

  highlightStars(rate) {
    document
      .querySelectorAll(".star")
      .forEach((s, i) => (s.textContent = i < rate ? "★" : "☆"));
  },

  async submit() {
    if (!this.currentUser) {
      alert("Trebuie să fii conectat pentru a lăsa o recenzie!");
      location.href = "login.html";
      return;
    }

    if (!["member", "admin"].includes(this.currentUser.role)) {
      alert("Nu ai dreptul să postezi recenzii.");
      return;
    }

    if (!this.selectedRating) {
      alert("Te rog să selectezi un rating!");
      return;
    }

    const comment = document.getElementById("reviewComment").value.trim();
    const filesInput = document.getElementById("reviewMedia");
    const files = Array.from(filesInput.files).slice(0, 3);

    let options;

    if (files.length) {
      const fd = new FormData();
      fd.append(
        "payload",
        JSON.stringify({
          userId: this.currentUser.id,
          rating: this.selectedRating,
          comment: comment || null,
        })
      );
      files.forEach((f) => fd.append("media", f));
      options = { method: "POST", body: fd };
    } else {
      const mediaUrls = this.currentCampground.image_url
        ? [this.currentCampground.image_url]
        : [];
      options = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: this.currentUser.id,
          rating: this.selectedRating,
          comment: comment || null,
          mediaUrls,
        }),
      };
    }

    try {
      const r = await fetch(
        `/api/camps/${this.currentCampground.id}/reviews`,
        options
      );

      switch (r.status) {
        case 201:
          alert("Recenzia ta a fost adăugată cu succes!");
          document.getElementById("addReviewForm").reset();
          this.selectedRating = 0;
          this.updateStarDisplay();
          await this.loadReviews();
          break;
        case 409:
          alert("Ai recenzat deja acest camping!");
          break;
        default:
          alert("A apărut o eroare la adăugarea recenziei!");
      }
    } catch (err) {
      console.error("submitReview error:", err);
      alert("A apărut o eroare la adăugarea recenziei!");
    }
  },

  isVideo(url) {
    const ext = url.split("?")[0].split(".").pop().toLowerCase();
    return ["mp4", "webm", "ogg"].includes(ext);
  },

  formatDate(str) {
    return new Date(str).toLocaleDateString("ro-RO", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  },
};
