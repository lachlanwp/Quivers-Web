// Mobile navigation toggle
const hamburger = document.querySelector(".hamburger");
const navMenu = document.querySelector(".nav-menu");

hamburger.addEventListener("click", () => {
  hamburger.classList.toggle("active");
  navMenu.classList.toggle("active");
});

// Close mobile menu when clicking on a link
document.querySelectorAll(".nav-link").forEach((n) =>
  n.addEventListener("click", () => {
    hamburger.classList.remove("active");
    navMenu.classList.remove("active");
  })
);

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
  anchor.addEventListener("click", function (e) {
    e.preventDefault();
    const target = document.querySelector(this.getAttribute("href"));
    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  });
});

// Add active class to current navigation link
const navLinks = document.querySelectorAll(".nav-link");
const sections = document.querySelectorAll("section");

window.addEventListener("scroll", () => {
  let current = "";
  sections.forEach((section) => {
    const sectionTop = section.offsetTop;
    const sectionHeight = section.clientHeight;
    if (scrollY >= sectionTop - 200) {
      current = section.getAttribute("id");
    }
  });

  navLinks.forEach((link) => {
    link.classList.remove("active");
    if (link.getAttribute("href") === `#${current}`) {
      link.classList.add("active");
    }
  });
});

// Parallax effect for hero content
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const heroContent = document.querySelector(".hero-content");
  if (heroContent) {
    const rate = scrolled * -0.3;
    heroContent.style.transform = `translateY(${rate}px)`;
  }
});

// Fade in animation for elements
const observerOptions = {
  threshold: 0.1,
  rootMargin: "0px 0px -50px 0px",
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}, observerOptions);

// Observe elements for fade-in animation
document.addEventListener("DOMContentLoaded", () => {
  const animatedElements = document.querySelectorAll(
    ".quote-card, .member-card, .video-item, .contact-section"
  );
  animatedElements.forEach((el) => {
    el.style.opacity = "0";
    el.style.transform = "translateY(30px)";
    el.style.transition = "opacity 0.6s ease, transform 0.6s ease";
    observer.observe(el);
  });
});

// Image preloading system
const imagesToPreload = [
  "images/band-logo.png",
  "images/band-photo.jpg",
  "images/band-photo-2.jpg",
  "images/fish.png",
  "images/oyster.png",
];

let loadedImages = 0;
const totalImages = imagesToPreload.length;
const progressBar = document.getElementById("progress-bar");
const loadingScreen = document.querySelector(".loading-screen");

function updateProgress() {
  const percentage = (loadedImages / totalImages) * 100;
  progressBar.style.width = percentage + "%";
}

function imageLoaded() {
  loadedImages++;
  updateProgress();

  if (loadedImages >= totalImages) {
    // All images loaded, fade in the site
    setTimeout(() => {
      document.body.classList.add("loaded");
      loadingScreen.classList.add("hidden");

      // Remove loading screen after fade out
      setTimeout(() => {
        loadingScreen.style.display = "none";
      }, 500);
    }, 500); // Small delay for smooth transition
  }
}

function preloadImages() {
  updateProgress();

  imagesToPreload.forEach((src) => {
    const img = new Image();

    img.onload = imageLoaded;
    img.onerror = imageLoaded; // Count errors as loaded to ensure completion

    img.src = src;
  });
}

// Start preloading when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", preloadImages);
} else {
  preloadImages();
}

// Form validation for contact form (if added later)
function validateForm(form) {
  const inputs = form.querySelectorAll("input[required], textarea[required]");
  let isValid = true;

  inputs.forEach((input) => {
    if (!input.value.trim()) {
      input.classList.add("error");
      isValid = false;
    } else {
      input.classList.remove("error");
    }
  });

  return isValid;
}

// Lightbox functionality
const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const lightboxClose = document.querySelector(".lightbox-close");

// Open lightbox when band photos are clicked
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("band-photo")) {
    lightboxImg.src = e.target.src;
    lightbox.style.display = "block";
    document.body.style.overflow = "hidden"; // Prevent scrolling
  }
});

// Close lightbox when clicking the close button or outside the image
lightbox.addEventListener("click", function (e) {
  if (e.target === lightbox || e.target === lightboxClose) {
    lightbox.style.display = "none";
    document.body.style.overflow = "auto"; // Restore scrolling
  }
});

// Close lightbox with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && lightbox.style.display === "block") {
    lightbox.style.display = "none";
    document.body.style.overflow = "auto";
  }
});

// Add error styles to CSS
const style = document.createElement("style");
style.textContent = `
    .error {
        border-color: #ff6b6b !important;
    }
`;
document.head.appendChild(style);
