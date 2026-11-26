// Battleground — shared storage, used by both index.html and battledex.html.

// ---------- BattleDex: saved fights (localStorage, kept across visits) ----------
const STORAGE_KEY = "battleground.battledex.v1";

// Saved fight shape:
// { id, savedAt, fighter1, fighter2, winner, winnerName, reasoning, imageA, imageB }
// where imageA / imageB are { status: "ok", src } | { status: "moderation_blocked" } | { status: "failed" }

export function loadFights() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const fights = raw ? JSON.parse(raw) : [];
    return Array.isArray(fights) ? fights : [];
  } catch {
    // Storage blocked (e.g. some private modes) or corrupted data: start empty.
    return [];
  }
}

// Returns "ok", "full" (quota exceeded) or "unavailable".
export function storeFights(fights) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fights));
    return "ok";
  } catch (error) {
    const isQuota =
      error instanceof DOMException &&
      (error.name === "QuotaExceededError" || error.name === "NS_ERROR_DOM_QUOTA_REACHED");
    return isQuota ? "full" : "unavailable";
  }
}

// ---------- Recent fight (sessionStorage, this browser tab only) ----------
// Lets the BattleDex page link back to the last fight's result.
const RECENT_KEY = "battleground.recentFight.v1";

export function saveRecentFight(fight) {
  try {
    sessionStorage.setItem(RECENT_KEY, JSON.stringify(fight));
  } catch {
    // Too big or storage blocked: "Back to recent fight" just won't be offered.
  }
}

export function loadRecentFight() {
  try {
    const raw = sessionStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
