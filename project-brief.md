# Battleground — Project Brief

## 1. What are we actually building? (Scope)

A web app where you type in two fighters and get an AI generated verdict on who'd win, plus AI generated character art for both.

- **Who it's for:** me and friends, and a portfolio piece.
- **Fighters:** fictional characters, real people, and animals are all allowed. A fighter can be a group (e.g. "10 cows vs 10 lions").

## 2. What's the smallest, simplest version worth shipping (MVP)?

Two text inputs, a Fight button, a working verdict with art, a loading state while we wait on the API, and a basic BattleDex saved to localStorage. Type two fighters, get a real result, save it if you want.

- **Verdict:** a winner's card with an animation and humorous reasoning for the win.
- **Art:** one image per fighter, so exactly two images per fight. A group counts as one fighter and gets one image.
- **Art fallback:** the image API may refuse real people or well-known copyrighted characters. When that happens, show a placeholder card so the verdict still works.
- **BattleDex:** saves whole fights (both fighters, the verdict, and the art).
- **Image storage:** downsize images before saving to localStorage to conserve space. The serverless function requests image data as base64 instead of a temporary URL, since OpenAI's URLs expire.

## 3. What are we building this with (tech stack)?

HTML, CSS, and vanilla JS for the frontend. Vercel for hosting and serverless functions. Claude's API for the verdict. OpenAI's image API for the character art (required by the course). localStorage for saving BattleDex.

## 4. What's the long-term vision, beyond just the MVP?

I would eventually like a real backend where saved fights sync across devices instead of just living in localStorage. This would require user accounts. I'd also want a quick re-fight option that lets me pick fighters from fights already saved in the BattleDex, instead of typing two new ones every time.

## Not in the MVP (for now)

- **Rate limiting:** will be added later in the project: 5 requests per minute per IP.
- **Budget:** no specific ceiling for now.
