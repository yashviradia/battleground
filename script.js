// Battleground — frontend logic.

// ---------- Views ----------
const views = {
  input: document.getElementById("view-input"),
  loading: document.getElementById("view-loading"),
  result: document.getElementById("view-result"),
  error: document.getElementById("view-error"),
};

// Show exactly one view and hide the other three.
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

// ---------- Fight flow ----------
form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const fighter1 = fighter1Input.value.trim();
  const fighter2 = fighter2Input.value.trim();

  if (!fighter1 || !fighter2) {
    formMessage.textContent = "Both fighters need a name.";
    formMessage.hidden = false;
    return;
  }
  formMessage.hidden = true;

  fightButton.disabled = true;
  showView("loading");

  try {
    const response = await fetch("/api/fight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fighter1, fighter2 }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || "Something went wrong in the arena. Try again.");
    }

    showResult(fighter1, fighter2, data);
  } catch (error) {
    // fetch() itself throws a TypeError when the network is down.
    const message =
      error instanceof TypeError
        ? "Couldn't reach the arena. Check your connection and try again."
        : error.message;
    showError(message);
  } finally {
    fightButton.disabled = false;
  }
});

function showResult(fighter1, fighter2, verdict) {
  winnerNameEl.textContent = verdict.winnerName;
  reasoningEl.textContent = verdict.reasoning;

  portrait1.querySelector("figcaption").textContent = fighter1;
  portrait2.querySelector("figcaption").textContent = fighter2;
  portrait1.classList.toggle("portrait-winner", verdict.winner === "fighter1");
  portrait2.classList.toggle("portrait-winner", verdict.winner === "fighter2");

  showView("result");
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

document.getElementById("try-again-btn").addEventListener("click", () => {
  // Keep the names so the user can retry the same fight.
  showView("input");
  fightButton.focus();
});
