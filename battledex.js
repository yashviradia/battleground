// Battleground — BattleDex page (battledex.html): lists saved fights as trading cards.

import { loadFights, storeFights, loadRecentFight } from "./storage.js";

const list = document.getElementById("battledex-list");
const emptyMessage = document.getElementById("battledex-empty");
const countBadge = document.getElementById("battledex-count");
const backToFightLink = document.getElementById("back-to-fight-btn");

// One fighter as a mini trading card: image on top, name below. Display only, not clickable.
function createFighterCard(name, image, isWinner) {
  const card = document.createElement("div");
  card.className = "fighter-card" + (isWinner ? " is-winner" : "");

  const art = document.createElement("div");
  art.className = "fighter-card-art";
  if (image?.status === "ok" && image.src) {
    const img = document.createElement("img");
    img.src = image.src;
    img.alt = `Art of ${name}`;
    img.loading = "lazy";
    art.append(img);
  } else {
    art.classList.add("is-placeholder");
    art.textContent = image?.status === "moderation_blocked" ? "Artist refused" : "No art";
  }

  const label = document.createElement("p");
  label.className = "fighter-card-name";
  label.textContent = name;

  card.append(art, label);
  return card;
}

function formatDate(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function renderBattledex() {
  const fights = loadFights();
  list.replaceChildren();
  emptyMessage.hidden = fights.length > 0;
  countBadge.textContent = String(fights.length);

  for (const fight of fights) {
    const entry = document.createElement("li");
    entry.className = "battledex-entry";

    const meta = document.createElement("div");
    meta.className = "battledex-meta";

    const summary = document.createElement("p");
    summary.className = "battledex-summary";
    const winnerName =
      fight.winnerName ?? (fight.winner === "fighter1" ? fight.fighter1 : fight.fighter2);
    summary.textContent = `${winnerName} wins`;

    const date = document.createElement("span");
    date.className = "muted battledex-date";
    date.textContent = formatDate(fight.savedAt);
    summary.append(" ", date);

    const deleteButton = document.createElement("button");
    deleteButton.type = "button";
    deleteButton.className = "btn btn-secondary btn-small";
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute("aria-label", `Delete ${fight.fighter1} vs ${fight.fighter2}`);
    deleteButton.addEventListener("click", () => deleteFight(fight.id));

    meta.append(summary, deleteButton);

    const cards = document.createElement("div");
    cards.className = "fighter-cards";
    const vs = document.createElement("span");
    vs.className = "versus versus-small";
    vs.setAttribute("aria-hidden", "true");
    vs.textContent = "VS";
    cards.append(
      createFighterCard(fight.fighter1, fight.imageA, fight.winner === "fighter1"),
      vs,
      createFighterCard(fight.fighter2, fight.imageB, fight.winner === "fighter2")
    );

    entry.append(meta, cards);
    list.append(entry);
  }
}

function deleteFight(id) {
  storeFights(loadFights().filter((fight) => fight.id !== id));
  renderBattledex();
}

// Only offer "Back to recent fight" when this tab has a recent fight to return to.
backToFightLink.hidden = loadRecentFight() === null;

renderBattledex();
