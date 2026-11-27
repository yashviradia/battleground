// Battleground — BattleDex page (battledex.html): the hall of saved bouts, as trading cards.

import { loadFights, storeFights, loadRecentFight } from "./storage.js";

const list = document.getElementById("battledex-list");
const emptyMessage = document.getElementById("battledex-empty");
const noMatchMessage = document.getElementById("battledex-no-match");
const countEl = document.getElementById("battledex-count");
const backToFightLink = document.getElementById("back-to-fight-btn");
const searchInput = document.getElementById("dex-search");
const sortButtons = document.querySelectorAll(".sort-btn");

let sortMode = "newest"; // "newest" | "az" | "oldest"

const SVG_NS = "http://www.w3.org/2000/svg";

// Build a small stroke icon from SVG path strings.
function createIcon(paths, size = 14) {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "2");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  for (const d of paths) {
    const path = document.createElementNS(SVG_NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

const LAUREL = [
  "M12 21C6 20 3 15 3 8M12 21c6-1 9-6 9-13",
  "M5 15l-2-1M4 11l-2-2M7 18l-2 0M19 15l2-1M20 11l2-2M17 18l2 0",
];
const TRASH = ["M3 6h18", "M8 6V4h8v2", "M6 6l1 14h10l1-14", "M10 10v6M14 10v6"];

// First letter of the name, skipping a leading count ("100 ducks" -> "D").
function initialOf(name) {
  return (name.replace(/^[0-9\s]+/, "").charAt(0) || name.charAt(0)).toUpperCase();
}

// One fighter's mini portrait: the saved art, or their initial when there is none.
function createMini(name, image, colorClass, isWinner) {
  const mini = document.createElement("div");
  mini.className = `mini ${colorClass} ${isWinner ? "is-winner" : "is-loser"}`;

  if (image?.status === "ok" && image.src) {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = "";
    img.loading = "lazy";
    mini.append(img);
  } else {
    mini.textContent = initialOf(name);
    mini.title = image?.status === "moderation_blocked" ? "The painter refused!" : "Portrait lost!";
  }
  return mini;
}

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function winnerNameOf(fight) {
  return fight.winnerName ?? (fight.winner === "fighter1" ? fight.fighter1 : fight.fighter2);
}

// A saved bout as a trading card. Display only, not clickable.
function createCard(fight) {
  const card = document.createElement("li");
  card.className = "dex-card";

  const minis = document.createElement("div");
  minis.className = "dex-minis";
  minis.setAttribute("aria-hidden", "true");
  const vs = document.createElement("span");
  vs.className = "mini-vs bronze";
  vs.textContent = "VS";
  minis.append(
    createMini(fight.fighter1, fight.imageA, "mini-red", fight.winner === "fighter1"),
    vs,
    createMini(fight.fighter2, fight.imageB, "mini-blue", fight.winner === "fighter2")
  );

  const names = document.createElement("div");
  names.className = "dex-names";
  const nameA = document.createElement("p");
  nameA.className = "dex-name-a";
  nameA.textContent = fight.fighter1;
  const nameB = document.createElement("p");
  nameB.className = "dex-name-b";
  nameB.textContent = `vs ${fight.fighter2}`;
  const date = document.createElement("p");
  date.className = "dex-date";
  date.textContent = formatDate(fight.savedAt);
  names.append(nameA, nameB, date);

  const foot = document.createElement("div");
  foot.className = "dex-foot";
  const winner = document.createElement("span");
  winner.className = "dex-winner";
  winner.textContent = winnerNameOf(fight);
  winner.title = `${winnerNameOf(fight)} wins`;

  const deleteButton = document.createElement("button");
  deleteButton.type = "button";
  deleteButton.className = "dex-delete";
  deleteButton.setAttribute("aria-label", `Delete ${fight.fighter1} vs ${fight.fighter2}`);
  deleteButton.append(createIcon(TRASH, 18));
  deleteButton.addEventListener("click", () => deleteFight(fight.id));

  foot.append(createIcon(LAUREL), winner, deleteButton);

  card.append(minis, names, foot);
  return card;
}

function sortFights(fights) {
  const sorted = [...fights];
  if (sortMode === "az") {
    sorted.sort((a, b) => a.fighter1.localeCompare(b.fighter1, undefined, { sensitivity: "base" }));
  } else {
    // Saved fights are stored newest first.
    sorted.sort((a, b) => String(b.savedAt).localeCompare(String(a.savedAt)));
    if (sortMode === "oldest") sorted.reverse();
  }
  return sorted;
}

function matchesSearch(fight, query) {
  if (!query) return true;
  return [fight.fighter1, fight.fighter2, winnerNameOf(fight)].some((name) =>
    String(name).toLowerCase().includes(query)
  );
}

function renderBattledex() {
  const fights = loadFights();
  countEl.textContent = String(fights.length);
  emptyMessage.hidden = fights.length > 0;

  const query = searchInput.value.trim().toLowerCase();
  const shown = sortFights(fights).filter((fight) => matchesSearch(fight, query));
  noMatchMessage.hidden = fights.length === 0 || shown.length > 0;

  list.replaceChildren(...shown.map(createCard));
}

function deleteFight(id) {
  storeFights(loadFights().filter((fight) => fight.id !== id));
  renderBattledex();
}

searchInput.addEventListener("input", renderBattledex);

for (const button of sortButtons) {
  button.addEventListener("click", () => {
    sortMode = button.dataset.sort;
    for (const other of sortButtons) {
      other.setAttribute("aria-pressed", String(other === button));
    }
    renderBattledex();
  });
}

// Only offer "Back to recent bout" when this tab has a recent fight to return to.
backToFightLink.hidden = loadRecentFight() === null;

renderBattledex();
