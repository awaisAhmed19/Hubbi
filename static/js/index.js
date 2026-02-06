import html2canvas from "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/+esm";

const no_btn = document.getElementById("no-btn");
const yes_btn = document.getElementById("yes-btn");
const main = document.querySelector("main");

let offsetX = 0;
let offsetY = 0;

// ---- SNAPSHOT FUNCTION ----
async function snapshotDOM() {
  const canvas = await html2canvas(main);
  window.__DOM_TEXTURE__ = canvas;
}

// ---- YES FLOW ----
yes_btn.addEventListener("click", async () => {
  anime.remove("*");

  // Hide buttons
  no_btn.style.display = "none";
  yes_btn.style.display = "none";

  // Celebration message
  const msg = document.createElement("h1");
  msg.textContent = "YAYYYYY 🎉💖";
  msg.style.textAlign = "center";
  msg.style.fontSize = "3rem";
  msg.style.opacity = 0;

  main.appendChild(msg);

  anime({
    targets: msg,
    opacity: [0, 1],
    scale: [0.3, 1.2, 1],
    rotate: [-10, 10, 0],
    duration: 900,
    easing: "easeOutElastic(1, .8)",
  });

  confettiBurst();

  // ⏱️ Give humans time to feel joy
  setTimeout(async () => {
    // 1️⃣ Capture DOM
    await snapshotDOM();

    // 2️⃣ Trigger htmx swap
    htmx.trigger(yes_btn, "manual");

    // 3️⃣ Three.js will start from swapped template
  }, 1000);
});

// ---- CONFETTI ----
function confettiBurst() {
  for (let i = 0; i < 25; i++) {
    const dot = document.createElement("div");
    dot.style.position = "fixed";
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "50%";
    dot.style.background = `hsl(${Math.random() * 360}, 100%, 60%)`;
    dot.style.left = "50%";
    dot.style.top = "50%";
    dot.style.pointerEvents = "none";

    document.body.appendChild(dot);

    anime({
      targets: dot,
      translateX: () => anime.random(-300, 300),
      translateY: () => anime.random(-300, 300),
      scale: [1, 0],
      opacity: [1, 0],
      duration: anime.random(800, 1400),
      easing: "easeOutExpo",
      complete: () => dot.remove(),
    });
  }
}

// ---- NO BUTTON RUNAWAY (unchanged, still evil) ----
document.addEventListener("mousemove", (e) => {
  const rect = no_btn.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;

  const dx = e.clientX - cx;
  const dy = e.clientY - cy;
  const distance = Math.hypot(dx, dy);

  if (distance < 100) runAway(dx, dy);
});

function runAway(dx, dy) {
  anime.remove(no_btn);

  const angle = Math.atan2(dy, dx);
  const step = 15;

  let nextX = offsetX - Math.cos(angle) * step;
  let nextY = offsetY - Math.sin(angle) * step;

  const rect = no_btn.getBoundingClientRect();
  const minX = -rect.left;
  const maxX = window.innerWidth - rect.right;
  const minY = -rect.top;
  const maxY = window.innerHeight - rect.bottom;

  offsetX = Math.min(Math.max(nextX, minX), maxX);
  offsetY = Math.min(Math.max(nextY, minY), maxY);

  anime({
    targets: no_btn,
    translateX: offsetX,
    translateY: offsetY,
    rotate: [-10, 10, 0],
    duration: 300,
    easing: "easeOutExpo",
  });
}
