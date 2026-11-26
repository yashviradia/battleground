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

### Image rules (apply to every image, once image generation is added)

- **Shared art style template:** every image prompt must include this exact template, so all fighters look like they belong to the same game:

  > Bold flat-color illustration, thick black outlines, dynamic action pose, dramatic lighting, video game character art style. Keep it centered, filling most of the frame, isolated on a plain solid light grey background with no scenery. Absolutely no text, words, letters, numbers, logos, watermarks, UI elements, borders, or frames of any kind. Illustration only, nothing else on canvas.

- Keep the template in one shared place in the code (a single constant), and build every image prompt as the fighter name plus the template. Never write the style inline per request.
- **Moderation-blocked is its own error case.** When the image API blocks a request for content-policy reasons, return a distinct `moderation_blocked` error, separate from a generic image failure (network error, timeout, API outage). The frontend can then tell the user "the artist refused to draw this fighter" instead of "something went wrong", and a generic failure can be retried while a moderation block cannot.

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

## Stage 7 — BattleDex (save fights)

**Goal:** save fights and view them later, all in localStorage.

- Add a "Save to BattleDex" button on the winner's card.
- Before saving, downsize both images (draw them on a `<canvas>` at about 256px and export as JPEG or WebP).
- Save the whole fight: both fighter names, winner, reasoning, both images, and the date.
- Add a BattleDex view that lists saved fights, with a way to delete one.
- **Fighter cards:** each saved fighter displays as a styled card in a mini trading card look, with the image on top and the name below.
  - Cards are display only: they are not clickable and don't open a detail view, since they only hold a name and an image.
  - If a fighter has no art (moderation-blocked or failed), the card shows a placeholder where the image would be.
- **Navigation buttons on the BattleDex view:**
  - **Back to recent fight:** jumps back to the result view of your most recent fight. Hide or disable it when there is no recent fight to return to (for example, after a page reload).
  - **New fight:** goes to the input form to start a new fight.
- Handle localStorage being full by showing a message instead of failing silently.

**Done when:** a saved fight still shows its fighter cards (art and names) after a page reload, the cards can't be clicked, and both buttons take you to the right view.

---

## Stage 8 — Claude redesign

**Goal:** a full visual overhaul of the whole app, not just a polished verdict screen.

Instead of only polishing the verdict UI, this stage hands the entire app to Claude Design for a complete redesign. By now every feature works, so the design can cover the finished app in one pass.

- Give Claude Design every screen: the input form, loading view, result view (winner's card), error view, and the BattleDex.
- Ask for a cohesive look across all of them: layout, colors, typography, buttons, and how the fighter art is framed.
- Include the motion work in the redesign:
  - an entrance animation for the winner's card,
  - making the winner stand out clearly from the loser,
  - a loading view that feels part of the experience, since a fight can take 10–30 seconds.
- Keep the app working while restyling: leave the element IDs, the `hidden`-attribute view switching, and the JavaScript hooks in place, so the redesign changes how things look, not how they work.
- Check the result on desktop and phone, and respect reduced-motion settings for the animations.

**Done when:** every screen has the new design, the winner's card animates in with the winner obvious at a glance, and a full fight plus a BattleDex save still work exactly as before.

---

## Stage 9 — Final QA and deploy to Vercel

**Goal:** a tested app on a live link to share with friends and put in your portfolio.

**QA locally first (`vercel dev`):**
- Fights with an animal, a fictional character, a real person, and a group (e.g. "10 cows").
- A fighter the image API blocks shows the "artist refused" placeholder; a generic image failure shows "Art unavailable"; the verdict still shows in both cases.
- Empty or overly long names show a clear message.
- The 6th fight within a minute is rate limited with a friendly message.
- BattleDex: save, reload the page, view, delete, and the "storage full" message.
- Everything looks right on desktop and phone.

**Deploy to Vercel:**
- Deploy to Vercel and add both API keys as environment variables in the Vercel dashboard.
- Repeat a full fight and a BattleDex save on the live site, on both desktop and phone.
- Optional but recommended: set a spending cap on both API accounts, since the link will be public.

**Done when:** every QA check passes locally, and the live URL works end to end.

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
