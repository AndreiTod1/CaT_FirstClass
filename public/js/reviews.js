// js/reviews.js
document.addEventListener("DOMContentLoaded", () => {
  const list = document.getElementById("reviewsList");
  const filterButtons = [...document.querySelectorAll(".review-filter")];

  //helpers DOM
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  //steluta svg
  const svgStar = () => {
    const ns = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(ns, "svg");
    svg.setAttribute("width", 16);
    svg.setAttribute("height", 16);
    svg.setAttribute("viewBox", "0 0 24 24");
    const poly = document.createElementNS(ns, "polygon");
    poly.setAttribute(
      "points",
      "12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"
    );
    svg.appendChild(poly);
    return svg;
  };

  function addReviewPhoto(box, url) {
    const img = el("img", "review-photo");
    img.src = url;
    box.appendChild(img);
  }

  function createCard(review, camp) {
    const card = el("div", "review-card");

    // header
    const header = el("div", "review-header");

    // author
    const author = el("div", "review-author");
    const avatar = el("img", "author-avatar");
    // daca nu folosim avatar real
    avatar.src = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(
      review.author
    )}`;
    author.appendChild(avatar);

    const aInfo = el("div", "author-info");
    aInfo.appendChild(el("h3", null, review.author));
    // numar recenzii pt user
    aInfo.appendChild(el("p", null, `${review.totalReviews} recenzii`));
    author.appendChild(aInfo);
    header.appendChild(author);

    // meta
    const meta = el("div", "review-meta");

    const ratingBox = el("div", "review-rating");
    ratingBox.appendChild(el("span", null, review.rating.toFixed(1)));
    ratingBox.appendChild(svgStar());
    meta.appendChild(ratingBox);

    const date = new Date(review.created_at);
    meta.appendChild(
      el(
        "div",
        "review-date",
        date.toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      )
    );
    header.appendChild(meta);

    card.appendChild(header);

    // camping info
    const campBox = el("div", "review-camping");
    if (camp?.image_url && camp.image_url.trim()) {
      const cImg = el("img", "camping-thumbnail");
      cImg.src = camp.image_url;
      cImg.alt = camp.name;
      campBox.appendChild(cImg);
    }

    const cInfo = el("div", "camping-info");
    cInfo.appendChild(el("h3", null, camp?.name || "Camping"));
    cInfo.appendChild(el("p", null, camp?.region || ""));
    campBox.appendChild(cInfo);
    card.appendChild(campBox);

    // text
    if (review.comment) {
      const content = el("div", "review-content");
      content.appendChild(el("p", null, review.comment));
      card.appendChild(content);
    }

    // photos
    if (Array.isArray(review.media_urls) && review.media_urls.length > 0) {
      const photos = el("div", "review-photos");
      review.media_urls.forEach((u, i) => addReviewPhoto(photos, u));
      card.appendChild(photos);
    }

    /// footer
    const footer = el("div", "review-footer");

    const actions = el("div", "review-actions");

    // like box
    const likeBox = el("button", "review-action"); // <button> → accesibil
    const likeIcon = svgThumb(review.liked); // îl umplem dacă userul a mai dat like
    const likeCount = el("span", null, `${review.likes || 0} aprecieri`);
    likeBox.appendChild(likeIcon);
    likeBox.appendChild(likeCount);
    if (review.liked) likeBox.disabled = true;

    likeBox.dataset.id = review.id; // tinem id recenzie
    likeBox.addEventListener("click", onLikeClick);
    actions.appendChild(likeBox);

    footer.appendChild(actions);

    if (Array.isArray(review.media_urls) && review.media_urls.length > 0) {
      const btn = el("a", "btn btn-sm btn-outline", "Vezi toate fotografiile");
      btn.href = "#";
      footer.appendChild(btn);
    }

    card.appendChild(footer);

    return card;
  }

  // fetch helpers
  const fetchJSON = (url) =>
    fetch(url).then((r) => (r.ok ? r.json() : Promise.reject(r.status)));

  //state
  let reviews = [];
  let camps = [];

  //render
  function render(filter = "all") {
    list.replaceChildren(); //golim containerul

    let data = [...reviews]; // slice

    switch (filter) {
      case "recent":
        data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        break;
      case "top":
        data.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case "five":
        data = data.filter((r) => r.rating === 5);
        break;
      case "photos":
        data = data.filter(
          (r) => Array.isArray(r.media_urls) && r.media_urls.length
        );
        break;
      default:
        break;
    }

    const campMap = Object.fromEntries(camps.map((c) => [c.id, c]));

    data.forEach((r) => {
      const camp = campMap[r.camp_site_id];
      list.appendChild(createCard(r, camp));
    });
  }

  //init
  Promise.all([fetchJSON("/api/reviews"), fetchJSON("/api/camps")])
    .then(([rev, camp]) => {
      // nr. recenzii per autor
      const countByAuthor = rev.reduce(
        (m, r) => ((m[r.author] = (m[r.author] || 0) + 1), m),
        {}
      );
      reviews = rev.map((r) => ({
        ...r,
        totalReviews: countByAuthor[r.author],
      }));
      camps = camp;
      render(); // default 'all'
    })
    .catch((err) => {
      console.error("Nu pot încărca recenziile", err);
      list.appendChild(el("p", "error", "Nu s-au putut încărca recenziile."));
    });

  //filtre
  filterButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      filterButtons.forEach((b) => b.classList.toggle("active", b === btn));
      render(btn.dataset.filter);
    });
  });

  async function onLikeClick(e) {
    const btn = e.currentTarget;
    const icon = btn.querySelector("svg");
    const span = btn.querySelector("span");
    const id = btn.dataset.id;

    if (btn.disabled || btn.dataset.liked === "true") return;
    btn.disabled = true;

    try {
      const res = await fetch(`/api/reviews/${id}/likes`, {
        method: "POST",
        credentials: "same-origin",
      });

      if (res.status === 409) {
        // doar marcam butonul ca liked
        btn.dataset.liked = "true";
        return;
      }
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }

      const { likes: srvLikes } = await res.json();
      span.textContent = `${srvLikes} aprecieri`;

      // semnalam ca e liked
      icon.replaceWith(svgThumb(true));
      btn.dataset.liked = "true";
    } catch (err) {
      console.error("Eroare la like:", err);
      btn.disabled = false;
    }
  }

  //svg pt emoji de like
  function svgThumb(fill = false) {
    const ns = "http://www.w3.org/2000/svg";
    const s = document.createElementNS(ns, "svg");
    s.setAttribute("width", 16);
    s.setAttribute("height", 16);
    s.setAttribute("viewBox", "0 0 24 24");
    if (fill) s.style.fill = "currentColor";
    const p = document.createElementNS(ns, "path");
    p.setAttribute(
      "d",
      "M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"
    );
    s.appendChild(p);
    return s;
  }
});
