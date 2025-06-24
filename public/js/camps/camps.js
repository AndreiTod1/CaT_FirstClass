document.addEventListener("DOMContentLoaded", () => {
  const grid = document.querySelector(".camping-grid");
  const form = document.getElementById("filtersForm");

  //api helpers

  function buildQuery(params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== "" && v !== false && v != null) qs.append(k, v);
    }
    return qs.toString() ? `?${qs}` : "";
  }

  async function fetchCamps(filters = { status: "true" }) {
    const res = await fetch(`/api/camps${buildQuery(filters)}`);
    if (!res.ok) throw new Error("Eroare la încărcarea camping-urilor");
    return res.json();
  }

  //dom helpers
  const el = (tag, cls, text) => {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  };

  function addTag(parent, text) {
    parent.appendChild(el("span", "tag", text));
  }

  function createCard(c) {
    const card = el("div", "camping-card");

    // imagine
    const imgBox = el("div", "camping-image");
    const img = el("img");
    img.src = c.image_url || "images/placeholder.jpg";
    img.alt = "img";
    imgBox.appendChild(img);
    card.appendChild(imgBox);

    // header
    const header = el("div", "camping-header");
    const left = el("div");
    left.appendChild(el("h3", "camping-name", c.name));
    left.appendChild(el("p", "camping-location", c.region));
    header.appendChild(left);
    header.appendChild(el("div", "camping-rating", (+c.avg_rating).toFixed(1)));
    card.appendChild(header);

    // content
    const content = el("div", "camping-content");
    content.appendChild(el("p", "camping-description", c.description));
    const tags = el("div", "camping-tags");
    if (c.wifi) addTag(tags, "Wi-Fi");
    if (c.shower) addTag(tags, "Dușuri");
    if (c.parking) addTag(tags, "Parcare");
    if (c.barbecue) addTag(tags, "Grătar");
    content.appendChild(tags);
    card.appendChild(content);

    // footer
    const foot = el("div", "camping-footer");
    const price = el("div", "camping-price", `${c.price} `);
    price.insertAdjacentHTML("beforeend", "<span>lei/noapte</span>");
    foot.appendChild(price);

    const btn = el("a", "btn btn-sm btn-outline", "Vezi detalii");
    btn.href = "campground.html?id=" + c.id;
    foot.appendChild(btn);

    card.appendChild(foot);
    return card;
  }

  function renderGrid(camps) {
    grid.innerHTML = ""; // empty grid
    camps.forEach((c) => grid.appendChild(createCard(c)));
  }

  // initial load
  fetchCamps().then(renderGrid).catch(console.error);

  // filtrare
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);

    const priceMap = { budget: 100, mid: 200, premium: 1_000 };
    const filters = {
      region: data.get("region"),
      type: data.get("type"),
      price: priceMap[data.get("price")] ?? "",
      wifi: data.get("wifi") ? "true" : "",
      shower: data.get("shower") ? "true" : "",
      parking: data.get("parking") ? "true" : "",
      barbecue: data.get("barbecue") ? "true" : "",
      status: "true",
    };

    try {
      const camps = await fetchCamps(filters);
      renderGrid(camps);
    } catch (err) {
      console.error(err);
      alert("A apărut o problemă la filtrare. Încearcă din nou!");
    }
  });
});
