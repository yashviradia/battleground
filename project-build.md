# Battleground — Build Plan

Built in small stages from [project-brief.md](project-brief.md). Finish each stage and check its "Done when" before moving on. Each stage should leave the app in a working state.

---

## Stage 0 — Project setup

**Goal:** an empty project that runs locally and is ready for Vercel.

- Create the folder structure: `index.html`, `style.css`, `script.js`, and an `api/` folder for serverless functions.
- Set up git and make a first commit.
- Install the Vercel CLI and confirm `vercel dev` serves the page locally.
- Get a Claude API key and an OpenAI API key. Store them in a `.env` file and add `.env` to `.gitignore`.

**Done when:** `vercel dev` shows a blank page in the browser, and the API keys are not in git.

---

## Stage 1 — Static page (no JavaScript)

**Goal:** the page looks like the app, even though nothing works yet.

- Build four separate views on one page, each in its own container:
  - **Input form:** two text inputs (Fighter 1, Fighter 2) and a Fight button.
  - **Loading view:** where the loading state will appear.
  - **Result view:** where the winner's card will appear.
  - **Error view:** where error messages will appear.
- Views are never stacked on the same screen. Only one is shown at a time, using the `hidden` attribute (JavaScript will toggle it from Stage 2 on).
- For now, only the input form is visible. The loading, result and error views have `hidden` set in the HTML.
- Basic styling so it looks intentional on desktop and phone.

**Done when:** only the input form shows, it looks right on both screen sizes, and removing `hidden` from any other view in dev tools shows that view's placeholder content.

---

## Stage 2 — Fake fight flow

**Goal:** the full user flow works with made-up data, so the UI is done before any API is involved.

- Write one small function that shows a single view and sets `hidden` on the other three.
- Clicking Fight reads both inputs. Show a message if either is empty.
- Switch to the loading view for about 2 seconds (use a fake delay).
- Switch to the result view with a hard-coded winner and reasoning on the winner's card.
- A button on the result view goes back to the input form for a new fight.

**Done when:** you can type two names, click Fight, see the loading view, then the result view with a fake winner's card, and get back to the input form.

---

## Stage 3 — Verdict API (Claude)

**Goal:** a serverless function that returns a real verdict.

- Create `api/verdict.js`. It takes two fighter names and calls Claude's API using the key from `.env`.
- Write a prompt asking for a funny verdict in a fixed JSON shape, for example `{ "winner": "...", "reasoning": "..." }`.
- Handle errors: a missing fighter name, an API failure, or a response that isn't valid JSON.
- Test it on its own, with a browser URL or `curl`, before touching the frontend.

**Done when:** calling `/api/verdict` with two fighters returns a winner and humorous reasoning every time.

---

## Stage 4 — Connect the verdict to the page

**Goal:** replace the fake verdict with the real one.

- `script.js` calls `/api/verdict` instead of using the fake data.
- The loading state lasts for as long as the real request takes.
- Show a friendly error message if the request fails.

**Done when:** typing two fighters shows a real, funny verdict on the winner's card.

---

## Stage 5 — Image API (OpenAI)

**Goal:** a serverless function that returns art for one fighter.

- Create `api/image.js`. It takes one fighter name and calls OpenAI's image API.
- Request the image as **base64**, not as a URL, because OpenAI's URLs expire.
- Write the prompt so a group (e.g. "10 cows") comes back as one image of the whole group.
- When the API refuses (common for real people and copyrighted characters), return a clear "refused" response instead of crashing.
- Test it on its own with an animal, a fictional character, and a real person.

**Done when:** `/api/image` returns an image for allowed fighters and a clean "refused" result otherwise.

---

## Stage 6 — Connect images to the page

**Goal:** each fight shows art for both fighters.

- Request the verdict and both images **at the same time** (`Promise.allSettled`) so the fight isn't three times slower.
- Show both images on the winner's card.
- If an image fails or is refused, show a placeholder card for that fighter. The verdict still shows.

**Done when:** a full fight shows the verdict plus two images. A refused image shows a placeholder and nothing breaks.

---

## Stage 7 — Winner's card animation

**Goal:** make the result fun to watch.

- Add an entrance animation to the winner's card (CSS animations or transitions).
- Make the winner stand out visually from the loser.
- Polish the loading state so the wait feels part of the experience, since images can take 10–30 seconds.

**Done when:** the result appears with an animation and the winner is obvious at a glance.

---

## Stage 8 — BattleDex (save fights)

**Goal:** save fights and view them later, all in localStorage.

- Add a "Save to BattleDex" button on the winner's card.
- Before saving, downsize both images (draw them on a `<canvas>` at about 256px and export as JPEG or WebP).
- Save the whole fight: both fighter names, winner, reasoning, both images, and the date.
- Add a BattleDex view that lists saved fights, with a way to delete one.
- Handle localStorage being full by showing a message instead of failing silently.

**Done when:** a saved fight still shows its verdict and art after a page reload.

---

## Stage 9 — Deploy

**Goal:** a live link to share with friends and put in your portfolio.

- Deploy to Vercel and add both API keys as environment variables in the Vercel dashboard.
- Test a full fight and a BattleDex save on the live site, on both desktop and phone.
- Optional but recommended: set a spending cap on both API accounts, since the link will be public.

**Done when:** the live URL works end to end.

---

## Later — after the MVP

Not part of the first version. Tackle these one at a time, after Stage 9.

### Rate limiting — 5 requests per minute per IP
- Limit `/api/verdict` and `/api/image` to 5 requests per minute per IP.
- Note: serverless functions don't share memory between requests, so the counter needs a small shared store (e.g. a Redis-style key-value service that works with Vercel).

### Quick re-fight
- Let people pick fighters from fights already saved in the BattleDex, instead of typing new names.

### Real backend and sync across devices
- Add user accounts so each person has their own BattleDex.
- Move saved fights and images from localStorage into a database and file storage, so they sync across devices.
