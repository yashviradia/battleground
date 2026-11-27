// Battleground — main page (index.html): the fight flow and saving to the BattleDex.
// The BattleDex itself lives on battledex.html (see battledex.js).

import { loadFights, storeFights, saveRecentFight, loadRecentFight } from "./storage.js";

// ---------- Views ----------
const views = {
  input: document.getElementById("view-input"),
  loading: document.getElementById("view-loading"),
  result: document.getElementById("view-result"),
  error: document.getElementById("view-error"),
};

// Show exactly one view and hide all the others.
function showView(name) {
  for (const [key, el] of Object.entries(views)) {
    el.hidden = key !== name;
  }
}

// ---------- Elements ----------
const form = document.getElementById("fight-form");
const fighter1Input = document.getElementById("fighter-1");
const fighter2Input = document.getElementById("fighter-2");
const formMessage = document.getElementById("form-message");
const fightButton = form.querySelector(".btn-fight");

const winnerNameEl = document.getElementById("result-title");
const reasoningEl = document.getElementById("result-reasoning");
const portrait1 = document.getElementById("portrait-1");
const portrait2 = document.getElementById("portrait-2");
const errorMessageEl = document.getElementById("error-message");

const saveButton = document.getElementById("save-btn");
const saveMessage = document.getElementById("save-message");
const battledexCount = document.getElementById("battledex-count");

// The most recent successful fight. Also copied to sessionStorage so the
// BattleDex page can link back to it ("Back to recent fight").
let currentFight = null;

// ---------- Fight flow ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fighter1 = fighter1Input.value.trim();
  const fighter2 = fighter2Input.value.trim();

  if (!fighter1 || !fighter2) {
    formMessage.textContent = "Hold up! It takes two to brawl. Both fighters need a name before they step into the ring!";
    formMessage.hidden = false;
    return;
  }
  formMessage.hidden = true;

  fightButton.disabled = true;
  document.getElementById("loading-name-1").textContent = fighter1;
  document.getElementById("loading-name-2").textContent = fighter2;
  showView("loading");
  startLoadingMessages();

  try {
    const response = await fetch("/api/fight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fighter1, fighter2 }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Somebody tripped over the arena's power cord! Dust yourself off and try again.");
    }

    showResult(fighter1, fighter2, data);
  } catch (error) {
    // fetch() itself throws a TypeError when the network is down.
    const message =
      error instanceof TypeError
        ? "The signal to the arena got knocked out cold! Check your connection and climb back in."
        : error.message;
    showError(message);
  } finally {
    stopLoadingMessages();
    fightButton.disabled = false;
  }
});

// ---------- Rotating loading messages ----------
const LOADING_MESSAGES = [
  "Sharpening claws…",
  "Consulting the ancient scrolls…",
  "Taping up the gloves…",
  "Polishing the championship belt…",
  "Bribing the referee with snacks…",
  "Warming up the crowd…",
  "Oiling the arena gates…",
  "Cueing the dramatic entrance music…",
  "Sketching the contenders…",
  "Stretching the hamstrings…",
  "Arguing over the rulebook…",
  "Rolling the dice of destiny…",
  "Sweeping up the last fight's debris…",
  "Measuring the trash talk…",
];
const LOADING_INTERVAL_MS = 2500;
const loadingMessageEl = document.getElementById("loading-message");
let loadingTimer = null;
let lastLoadingIndex = -1;

function pickLoadingMessage() {
  // Random, but never the same phrase twice in a row.
  let index;
  do {
    index = Math.floor(Math.random() * LOADING_MESSAGES.length);
  } while (index === lastLoadingIndex);
  lastLoadingIndex = index;
  return LOADING_MESSAGES[index];
}

function startLoadingMessages() {
  stopLoadingMessages();
  loadingMessageEl.textContent = pickLoadingMessage();
  loadingMessageEl.classList.remove("is-fading");

  loadingTimer = setInterval(() => {
    // Fade out, swap the text, fade back in (see .loading-message in style.css).
    loadingMessageEl.classList.add("is-fading");
    setTimeout(() => {
      loadingMessageEl.textContent = pickLoadingMessage();
      loadingMessageEl.classList.remove("is-fading");
    }, 200);
  }, LOADING_INTERVAL_MS);
}

function stopLoadingMessages() {
  clearInterval(loadingTimer);
  loadingTimer = null;
}

function showResult(fighter1, fighter2, verdict) {
  currentFight = {
    fighter1,
    fighter2,
    winner: verdict.winner,
    winnerName: verdict.winnerName,
    reasoning: verdict.reasoning,
    imageA: verdict.imageA,
    imageB: verdict.imageB,
    saved: verdict.saved === true,
  };
  saveRecentFight(currentFight);

  // A new fight can be saved; a restored fight that was already saved can't be saved twice.
  saveButton.disabled = currentFight.saved;
  saveButton.textContent = currentFight.saved ? "Saved ✓" : "Save to BattleDex";
  saveMessage.hidden = true;

  winnerNameEl.textContent = verdict.winnerName;
  reasoningEl.textContent = verdict.reasoning;

  portrait1.querySelector(".portrait-name").textContent = fighter1;
  portrait2.querySelector(".portrait-name").textContent = fighter2;
  renderPortraitImage(portrait1, verdict.imageA, fighter1);
  renderPortraitImage(portrait2, verdict.imageB, fighter2);
  // Winner gets the gold frame, glow, crown and ribbon; loser gets the K.O. stamp (see style.css).
  portrait1.classList.toggle("portrait-winner", verdict.winner === "fighter1");
  portrait2.classList.toggle("portrait-winner", verdict.winner === "fighter2");
  portrait1.classList.toggle("portrait-loser", verdict.winner !== "fighter1");
  portrait2.classList.toggle("portrait-loser", verdict.winner !== "fighter2");

  showView("result");
}

// Show the fighter's art, or a placeholder explaining why there isn't any.
// image is { status: "ok", src } | { status: "moderation_blocked" } | { status: "failed" }
function renderPortraitImage(portrait, image, fighterName) {
  const frame = portrait.querySelector(".portrait-img");
  frame.replaceChildren();
  frame.classList.remove("is-placeholder");

  if (image?.status === "ok" && image.src) {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = `Art of ${fighterName}`;
    frame.append(img);
    return;
  }

  frame.classList.add("is-placeholder");
  frame.textContent =
    image?.status === "moderation_blocked"
      ? "The artist took one look, dropped the brush, and refused to draw this one!"
      : "This fighter's portrait got lost on the way to the arena!";
}

function showError(message) {
  errorMessageEl.textContent = message;
  showView("error");
}

// ---------- Back to the form ----------
document.getElementById("new-fight-btn").addEventListener("click", () => {
  form.reset();
  showView("input");
  fighter1Input.focus();
});

// ---------- Example matchups ----------
// Clicking a suggestion fills both names; the user still presses Fight.
for (const chip of document.querySelectorAll(".chip")) {
  chip.addEventListener("click", () => {
    fighter1Input.value = chip.dataset.fighter1;
    fighter2Input.value = chip.dataset.fighter2;
    formMessage.hidden = true;
    fightButton.focus();
  });
}

document.getElementById("try-again-btn").addEventListener("click", () => {
  // Keep the names so the user can retry the same fight.
  showView("input");
  fightButton.focus();
});

// =====================================================================
// Saving to the BattleDex (storage helpers live in storage.js)
// =====================================================================

const THUMBNAIL_SIZE = 256;

// Shrink a data-URL image to fit THUMBNAIL_SIZE x THUMBNAIL_SIZE to save storage space.
function downsizeImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, THUMBNAIL_SIZE / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

      // Prefer WebP; browsers that can't encode WebP fall back to PNG, so use JPEG instead.
      let thumb = canvas.toDataURL("image/webp", 0.8);
      if (!thumb.startsWith("data:image/webp")) {
        thumb = canvas.toDataURL("image/jpeg", 0.8);
      }
      resolve(thumb);
    };
    img.onerror = () => reject(new Error("Could not load image to downsize."));
    img.src = src;
  });
}

async function shrinkForStorage(image) {
  if (image?.status !== "ok" || !image.src) {
    return { status: image?.status === "moderation_blocked" ? "moderation_blocked" : "failed" };
  }
  try {
    return { status: "ok", src: await downsizeImage(image.src) };
  } catch {
    return { status: "failed" };
  }
}

function showSaveMessage(text) {
  saveMessage.textContent = text;
  saveMessage.hidden = false;
}

saveButton.addEventListener("click", async () => {
  if (!currentFight) return;

  saveButton.disabled = true;
  saveButton.textContent = "Saving…";

  const fightToSave = currentFight;
  const [imageA, imageB] = await Promise.all([
    shrinkForStorage(fightToSave.imageA),
    shrinkForStorage(fightToSave.imageB),
  ]);

  const saved = {
    id: crypto.randomUUID?.() ?? String(Date.now()),
    savedAt: new Date().toISOString(),
    fighter1: fightToSave.fighter1,
    fighter2: fightToSave.fighter2,
    winner: fightToSave.winner,
    winnerName: fightToSave.winnerName,
    reasoning: fightToSave.reasoning,
    imageA,
    imageB,
  };

  const result = storeFights([saved, ...loadFights()]);

  if (result === "ok") {
    fightToSave.saved = true;
    saveRecentFight(fightToSave);
    saveButton.textContent = "Saved ✓";
    showSaveMessage("Into the BattleDex it goes! A legend is preserved.");
    updateBattledexCount();
  } else {
    saveButton.disabled = false;
    saveButton.textContent = "Save to BattleDex";
    showSaveMessage(
      result === "full"
        ? "The BattleDex is stuffed to the rafters! Retire some old fights to make room for new legends."
        : "This browser has locked the BattleDex vault! The fight couldn't be saved."
    );
  }
});

function updateBattledexCount() {
  battledexCount.textContent = String(loadFights().length);
}

// ---------- Restore the recent fight (linked from the BattleDex page) ----------
// battledex.html links to index.html#recent to jump back into the last fight.
if (location.hash === "#recent") {
  const recent = loadRecentFight();
  if (recent) {
    showResult(recent.fighter1, recent.fighter2, recent);
  }
  history.replaceState(null, "", location.pathname);
}

updateBattledexCount();
