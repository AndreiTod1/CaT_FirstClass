document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("current-year").textContent =
    new Date().getFullYear();
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn");
  const closeMenuBtn = document.querySelector(".close-menu");
  const mobileMenu = document.getElementById("mobile-menu");

  if (mobileMenuBtn && closeMenuBtn && mobileMenu) {
    mobileMenuBtn.addEventListener("click", function () {
      mobileMenu.classList.add("active");
    });

    closeMenuBtn.addEventListener("click", function () {
      mobileMenu.classList.remove("active");
    });
  }

  const fadeElements = document.querySelectorAll(".fade-in");
  function checkFade() {
    fadeElements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top;
      const elementBottom = element.getBoundingClientRect().bottom;

      if (elementTop < window.innerHeight && elementBottom > 0) {
        element.classList.add("visible");
      }
    });
  }
  checkFade();
  fetchUserAndRender();

  console.log("base DOM fully loaded");
});

async function fetchUserAndRender() {
  try {
    const resp = await fetch("/api/auth/me", { credentials: "include" });

    if (resp.status === 401) {
      console.log("No user session, skipping render.");
      return;
    }

    const data = await resp.json();
    if (data.ok && data.user) {
      console.log("User logat:", data.user);
      renderUserBox(data.user);
    }
  } catch (err) {
    console.warn("Eroare la fetchUserAndRender:", err);
  }
}

function renderUserBox(user) {
  const loginBtn = document.querySelector(".header-actions a.btn-primary");
  if (loginBtn) loginBtn.remove();

  const container = document.querySelector(".header-content");
  if (!container) return;

  const box = document.createElement("div");
  box.className = "user-box";
  box.innerHTML = `
    <span class="user-name">Bun venit, ${
      user.name || user.email.split("@")[0]
    }</span>
    <button id="logout-btn" class="btn-logout">Ieșire</button>
  `;
  container.appendChild(box);

  document.getElementById("logout-btn").addEventListener("click", async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });

    window.location.reload();
  });
}
