document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".camping-grid");

  // helper pentru creare elemente
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  // construieste card-ul unui camping
  function createCard(c) {
    const card = el("div", "camping-card");

    // imagine
    const imgBox = el("div", "camping-image");
    const img = el("img");
    img.src = c.image_url || "images/placeholder.jpg";
    img.alt = "img";
    imgBox.appendChild(img);
    card.appendChild(imgBox);

    // header cu nume/regiune si rating
    const header = el("div", "camping-header");
    const left = el("div");
    left.appendChild(el("h3", "camping-name", c.name));
    left.appendChild(el("p", "camping-location", c.region));
    header.appendChild(left);
    header.appendChild(el("div", "camping-rating", (+c.avg_rating).toFixed(1)));
    card.appendChild(header);

    // continut
    const content = el("div", "camping-content");
    content.appendChild(el("p", "camping-description", c.description));
    card.appendChild(content);

    // footer cu pret si buton
    const foot = el("div", "camping-footer");
    const price = el("div", "camping-price", `${c.price} `);
    price.insertAdjacentHTML("beforeend", "<span>lei/noapte</span>");
    foot.appendChild(price);
    const btn = el("a", "btn btn-sm btn-outline", "Vezi detalii");
    btn.href = `/campground.html?id=${c.id}`;
    foot.appendChild(btn);
    card.appendChild(foot);

    return card;
  }

  //liste de campinguri in grid
  function renderGrid(camps) {
    grid.innerHTML = "";
    camps.forEach((c) => grid.appendChild(createCard(c)));
  }

  // load + filter >4.5
  fetch("/api/camps")
    .then((res) => {
      if (!res.ok) throw new Error("Eroare la încărcarea camping-urilor");
      return res.json();
    })
    .then((camps) => camps.filter((c) => Number(c.avg_rating) > 4.5))
    .then(renderGrid)
    .catch((err) => {
      console.error(err);
      grid.innerHTML =
        "<p class='error'>Nu am găsit camping-uri cu rating peste 4.5.</p>";
    });
});
