// Google Analytics 4 Tracking Code
// Initialize Google Analytics with measurement ID G-YMG0NST2G1
window.dataLayer = window.dataLayer || [];
function gtag() {
  dataLayer.push(arguments);
}
gtag("js", new Date());
gtag("config", "G-YMG0NST2G1");
// End Google Analytics 4 Tracking Code

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

// Parallax effect for background images
window.addEventListener("scroll", () => {
  const scrolled = window.pageYOffset;
  const body = document.body;

  // Apply parallax effect to the background image
  // Move the background at 50% of the scroll speed for a subtle effect
  const parallaxRate = scrolled * 0.5;

  // Use CSS custom property for smooth performance
  body.style.setProperty("--parallax-y", `${parallaxRate}px`);
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

// Open lightbox function with proper image loading and fade effects
function openLightbox(imageSrc) {
  // Ensure the lightbox is hidden and image is transparent initially
  lightbox.style.display = "block";
  lightbox.style.opacity = "0";
  lightboxImg.style.opacity = "0";

  // Clear any previous image source to prevent showing old image
  lightboxImg.src = "";

  // Prevent scrolling
  document.body.style.overflow = "hidden";

  // Fade in the lightbox background first
  setTimeout(() => {
    lightbox.style.opacity = "1";
  }, 10);

  // Create a new image object to preload
  const newImage = new Image();

  // Once the new image is loaded, set it as source and fade it in
  newImage.onload = function () {
    lightboxImg.src = imageSrc;
    // Fade in the new image once it's loaded
    setTimeout(() => {
      lightboxImg.style.opacity = "1";
    }, 50);
  };

  // Handle image load errors
  newImage.onerror = function () {
    console.error("Failed to load image:", imageSrc);
    lightboxImg.style.opacity = "1"; // Still show the lightbox even if image fails
  };

  // Start loading the new image
  newImage.src = imageSrc;
}

// Open lightbox when band photos are clicked
document.addEventListener("click", function (e) {
  if (e.target.classList.contains("band-photo")) {
    openLightbox(e.target.src);
  }
});

// Close lightbox when clicking the close button or outside the image
lightbox.addEventListener("click", function (e) {
  if (e.target === lightbox || e.target === lightboxClose) {
    // Fade out the image first
    lightboxImg.style.opacity = "0";

    // Then fade out the lightbox background
    setTimeout(() => {
      lightbox.style.opacity = "0";
      setTimeout(() => {
        lightbox.style.display = "none";
        lightbox.style.opacity = "0"; // Keep opacity at 0 for next open
        document.body.style.overflow = "auto"; // Restore scrolling
      }, 400);
    }, 100);
  }
});

// Close lightbox with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape" && lightbox.style.display === "block") {
    // Fade out the image first
    lightboxImg.style.opacity = "0";

    // Then fade out the lightbox background
    setTimeout(() => {
      lightbox.style.opacity = "0";
      setTimeout(() => {
        lightbox.style.display = "none";
        lightbox.style.opacity = "0"; // Keep opacity at 0 for next open
        document.body.style.overflow = "auto";
      }, 400);
    }, 100);
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
