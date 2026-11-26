// POST /api/fight
// Body: { "fighter1": "Batman", "fighter2": "10 angry geese" }
// Returns:
// {
//   "winner": "fighter1" | "fighter2",
//   "winnerName": "...",
//   "reasoning": "...",
//   "imageA": Image,   // art for fighter 1
//   "imageB": Image    // art for fighter 2
// }
// Image = { "status": "ok", "src": "data:image/webp;base64,..." }
//       | { "status": "moderation_blocked" }   // image API refused on content-policy grounds
//       | { "status": "failed" }               // anything else: network, timeout, outage
//
// The verdict and both images are generated at the same time.
// The verdict is required; each image can fail on its own without breaking the fight.

import Anthropic from "@anthropic-ai/sdk";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import OpenAI from "openai";
import { z } from "zod";
import { JUDGE_PROMPT } from "./judge-prompt.js";

const MAX_NAME_LENGTH = 60;

// ---------- Output shape (enforced by Claude's native structured outputs) ----------
const VerdictSchema = z.object({
  winner: z.enum(["fighter1", "fighter2"]),
  reasoning: z.string(),
});

// ---------- Rate limiting: 5 requests per minute per IP ----------
// In-memory for now. Each running serverless instance keeps its own counter,
// so on live Vercel this is best-effort. Swap for a shared store (e.g. Redis) later.
const RATE_LIMIT = 5;
const WINDOW_MS = 60_000;
const requestLog = new Map(); // ip -> array of request timestamps

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (requestLog.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);

  if (recent.length >= RATE_LIMIT) {
    requestLog.set(ip, recent);
    const retryAfterSec = Math.ceil((WINDOW_MS - (now - recent[0])) / 1000);
    return { allowed: false, retryAfterSec };
  }

  recent.push(now);
  requestLog.set(ip, recent);

  // Drop IPs with no recent requests so the map doesn't grow forever.
  if (requestLog.size > 1000) {
    for (const [key, times] of requestLog) {
      if (times.every((t) => now - t >= WINDOW_MS)) requestLog.delete(key);
    }
  }

  return { allowed: true };
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length > 0) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

function cleanName(value) {
  return typeof value === "string" ? value.trim() : "";
}

// ---------- Shared art style template ----------
// Every image prompt is the fighter name plus this template, so all fighters look like they
// belong to the same game. Change the style here only; never write it inline per request.
const ART_STYLE =
  "Bold flat-color illustration, thick black outlines, dynamic action pose, dramatic lighting, " +
  "video game character art style. Keep it centered, filling most of the frame, isolated on a " +
  "plain solid light grey background with no scenery. Absolutely no text, words, letters, " +
  "numbers, logos, watermarks, UI elements, borders, or frames of any kind. Illustration only, " +
  "nothing else on canvas.";

function buildImagePrompt(fighter) {
  return `${fighter}. ${ART_STYLE}`;
}

// Error codes the image API uses when it blocks a request for content-policy reasons.
const MODERATION_CODES = new Set([
  "moderation_blocked",
  "content_policy_violation",
  "image_content_policy_violation",
]);

// ---------- API clients ----------
// Keys come from the environment (.env locally, Vercel env vars in production).
const client = new Anthropic();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || "missing" });

// Generate art for one fighter. Never throws: always returns an Image object.
async function generateImage(fighter) {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is not set. Add it to .env (local) or Vercel env vars.");
    return { status: "failed" };
  }

  try {
    const result = await openai.images.generate({
      model: "gpt-image-2",
      prompt: buildImagePrompt(fighter),
      size: "1024x1024",
      quality: "low",
      // WebP keeps each image small so both fit in one API response.
      output_format: "webp",
      output_compression: 80,
    });

    const b64 = result.data?.[0]?.b64_json;
    if (!b64) {
      console.error(`Image API returned no image data for "${fighter}".`);
      return { status: "failed" };
    }
    return { status: "ok", src: `data:image/webp;base64,${b64}` };
  } catch (error) {
    if (error instanceof OpenAI.APIError && MODERATION_CODES.has(error.code)) {
      console.warn(`Image for "${fighter}" was blocked by moderation.`);
      return { status: "moderation_blocked" };
    }
    console.error(`Image generation failed for "${fighter}":`, error.message ?? error);
    return { status: "failed" };
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Use POST to start a fight." });
  }

  // 1. Rate limit
  const limit = checkRateLimit(getClientIp(req));
  if (!limit.allowed) {
    res.setHeader("Retry-After", String(limit.retryAfterSec));
    return res.status(429).json({
      error: `Too many fights! Catch your breath and try again in ${limit.retryAfterSec} seconds.`,
    });
  }

  // 2. Validate input
  const fighter1 = cleanName(req.body?.fighter1);
  const fighter2 = cleanName(req.body?.fighter2);

  if (!fighter1 || !fighter2) {
    return res.status(400).json({ error: "Both fighters need a name." });
  }
  if (fighter1.length > MAX_NAME_LENGTH || fighter2.length > MAX_NAME_LENGTH) {
    return res
      .status(400)
      .json({ error: `Fighter names must be ${MAX_NAME_LENGTH} characters or fewer.` });
  }

  // 3. Ask Claude for a verdict
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set. Add it to .env (local) or Vercel env vars.");
    return res.status(500).json({ error: "The arena isn't set up yet (missing API key)." });
  }

  // Start both images now so they run in parallel with the verdict.
  const imagesPromise = Promise.all([generateImage(fighter1), generateImage(fighter2)]);

  try {
    const response = await client.beta.messages.parse({
      model: "claude-sonnet-5-5",
      max_tokens: 2000,
      // If Claude declines on safety grounds, the API retries on a fallback model automatically.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: JUDGE_PROMPT,
      messages: [
        {
          role: "user",
          content: `Fighter 1: ${fighter1}\nFighter 2: ${fighter2}\n\nWho wins?`,
        },
      ],
      output_config: {
        effort: "low",
        format: betaZodOutputFormat(VerdictSchema),
      },
    });

    if (response.stop_reason === "refusal") {
      return res.status(422).json({
        error: "The judges refused to rule on this matchup. Try different fighters.",
      });
    }

    const verdict = response.parsed_output;
    if (!verdict) {
      return res.status(502).json({ error: "The judges mumbled something unreadable. Try again." });
    }

    const [imageA, imageB] = await imagesPromise;

    return res.status(200).json({
      winner: verdict.winner,
      winnerName: verdict.winner === "fighter1" ? fighter1 : fighter2,
      reasoning: verdict.reasoning,
      imageA,
      imageB,
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("Claude API key is missing or invalid. Check ANTHROPIC_API_KEY in .env.");
      return res.status(500).json({ error: "The arena isn't set up yet (missing API key)." });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return res.status(503).json({ error: "The judges are swamped. Try again in a moment." });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`Claude API error ${error.status}:`, error.message);
      return res.status(502).json({ error: "The judges are unavailable right now. Try again." });
    }
    console.error("Unexpected error in /api/fight:", error);
    return res.status(500).json({ error: "Something went wrong in the arena. Try again." });
  }
}
