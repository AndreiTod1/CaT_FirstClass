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

  console.log("base DOM fully loaded");
});
