// Google Analytics 4 Tracking Code
// Initialize Google Analytics with measurement ID G-YMG0NST2G1
(function (i, s, o, g, r, a, m) {
  i["GoogleAnalyticsObject"] = r;
  (i[r] =
    i[r] ||
    function () {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(
  window,
  document,
  "script",
  "https://www.google-analytics.com/analytics.js",
  "ga"
);

ga("create", "G-YMG0NST2G1", "auto");
ga("send", "pageview");

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
  "images/oyster-cuts-album-cover.jpg",
  "images/fish.png",
  "images/oyster.png",
];

let loadedImages = 0;
const totalImages = imagesToPreload.length;
const progressBar = document.getElementById("progress-bar");
const loadingScreen = document.querySelector(".loading-screen");
const loadingProgress = document.querySelector(".loading-progress");

// Debug: Check if elements are found
console.log("Progress bar found:", progressBar);
console.log("Loading screen found:", loadingScreen);

let progressBarShown = false;
let allImagesLoaded = false;

function showProgressBar() {
  if (!progressBarShown && !allImagesLoaded) {
    progressBarShown = true;
    if (loadingProgress) {
      loadingProgress.style.opacity = "1";
      console.log("Progress bar now visible");
    }
  }
}

function updateProgress() {
  const percentage = (loadedImages / totalImages) * 100;
  if (progressBar && progressBarShown) {
    progressBar.style.width = percentage + "%";
    console.log(`Progress: ${percentage}%`);
  }
}

function imageLoaded() {
  loadedImages++;
  updateProgress();

  if (loadedImages >= totalImages) {
    allImagesLoaded = true;
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
  // Hide progress bar initially
  if (loadingProgress) {
    loadingProgress.style.opacity = "0";
    loadingProgress.style.transition = "opacity 0.3s ease";
  }

  // Show progress bar after 1 second if images are still loading
  const showProgressTimeout = setTimeout(() => {
    showProgressBar();
  }, 1000);

  imagesToPreload.forEach((src) => {
    const img = new Image();

    img.onload = () => {
      imageLoaded();
      // If all images loaded before 1 second, clear the timeout
      if (loadedImages >= totalImages) {
        clearTimeout(showProgressTimeout);
      }
    };
    img.onerror = () => {
      imageLoaded();
      // If all images loaded before 1 second, clear the timeout
      if (loadedImages >= totalImages) {
        clearTimeout(showProgressTimeout);
      }
    };

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
