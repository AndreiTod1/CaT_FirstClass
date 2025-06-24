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
      // nu e logat → lăsăm loginBtn vizibil, restul ascunse implicit
      return;
    }
    const data = await resp.json();
    if (data.ok && data.user) {
      showUser(data.user);
      console.log("User fetched and rendered:", data.user);
    }
  } catch (err) {
    console.warn("Eroare la fetchUserAndRender:", err);
  }
}

function showUser(user) {
  const loginBtn = document.getElementById("loginBtn");
  if (loginBtn) loginBtn.style.display = "none";

  const userBox = document.getElementById("userBox");
  const userName = document.getElementById("userName");
  const logoutBtn = document.getElementById("logoutBtn");
  if (userBox && userName && logoutBtn) {
    userName.textContent = user.name || user.email.split("@")[0];
    userBox.style.display = "flex";
    logoutBtn.addEventListener("click", doLogout);
  }

  const mobileInfo = document.getElementById("mobileUserInfo");
  const mobileName = document.getElementById("mobileUserName");
  const mobileLogout = document.getElementById("mobileLogoutBtn");
  if (mobileInfo && mobileName && mobileLogout) {
    mobileName.textContent = user.name || user.email.split("@")[0];
    mobileInfo.style.display = "flex";
    mobileLogout.addEventListener("click", doLogout);
  }

  if (user.role == "admin") {
    console.log("User is admin, showing admin menu");
    const adminDesk = document.getElementById("adminMenuDesktop");
    const adminMobile = document.getElementById("adminMenuMobile");
    if (adminDesk) adminDesk.style.display = "inline-block";
    if (adminMobile) adminMobile.style.display = "block";
  }

  const start = document.getElementById("start");
  if (start) {
    start.style.display = "none";
  }
}

function doLogout() {
  fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
  }).then(() => window.location.reload());
}
