# KinvoxAI — Project Handoff

Last updated: 2026-06-18 · Branch: `main` · Latest commit: `3209e7e`

## What this project is

A web app that takes a short prompt + style + duration and produces a short-form
video script package: a Turkish story, a voiceover script, per-scene narration
(Turkish + English), and one illustration per scene. Target use case: faceless
TikTok/YouTube horror/adventure/comedy/drama/sci-fi content, generated end-to-end
by AI.

Stack: Next.js 14 frontend (`frontend/`), Express + TypeScript backend
(`backend/`), SQLite (via `better-sqlite3`) for persistence, an in-process
polling "queue" (no Redis/BullMQ — see `backend/src/config/queue.ts`).

## Current pipeline (as implemented)

```
User prompt + style + duration
        │
        ▼
POST /api/generate ── enqueues a job row in SQLite, returns jobId immediately
        │
        ▼
storyWorker.ts polls the jobs table every 2s, picks up "queued" jobs
        │
        ▼
claude.ts: generateStory() → Anthropic Claude (claude-haiku-4-5-20251001)
        │   Returns: baslik, hikaye, seslendirme, sahneler_tr[], sahneler_en[],
        │            visual_style_guide{}
        ▼
Saved to `stories` table (job marked "completed")
        │
        ▼
Frontend polls GET /api/status/:jobId, on completion auto-calls:
        │
        ▼
POST /api/generate-images { jobId, scenes: sahneler_en }
        │
        ▼
replicate.ts: generateImage() per scene (parallel) → Replicate stability-ai/sdxl
        │   Falls back to /images/placeholder.svg per scene on failure
        ▼
Images saved to backend/public/images/[jobId]/scene-[1-6].png
image_paths column updated on the stories row
        │
        ▼
Frontend renders: Visual Style Guide card (collapsible) + 6-image grid + story text
```

No video assembly, no TTS/voiceover audio generation, and no posting/scheduling
exist yet — this only produces the script + scene illustrations.

## Brick-by-brick history (what shipped, in order)

1. **Boilerplate** (`a202db0`) — Next.js + Express scaffolding, originally
   Postgres/Redis/Docker, later simplified to SQLite + in-memory queue
   (`82a38fe`) — there is no Docker/Redis dependency despite what early
   commits suggest.
2. **i18n** (`7e9d125`) — Turkish/English UI toggle via `next-intl`,
   `frontend/src/translations/{en,tr}.json`.
3. **Claude story generation** (`0a57b9b` → `c152b94`) — `backend/src/services/claude.ts`.
   Several commits just chasing the correct current Claude model id; landed on
   `claude-haiku-4-5-20251001` (overridable via `CLAUDE_MODEL` env var).
4. **Turkish story + scenes + voiceover** (`c330c33`) — added `sahneler_tr`/`sahneler_en`
   dual-language scene arrays and `seslendirme` (voiceover script text — **script
   only, not audio**).
5. **"Brick 3": image generation** (`69a9620`) — found half-built and uncommitted
   at session start; finished, tested live, fixed a real bug along the way: the
   `stories.image_paths` column was missing from the already-existing local DB
   because `CREATE TABLE IF NOT EXISTS` doesn't alter existing tables — added a
   startup migration (see `database.ts`). Originally used OpenAI; switched
   `dall-e-3` → `gpt-image-1` mid-session because `dall-e-3` wasn't available on
   the account's API key.
6. **Visual style guide** (`4acd82f`) — Claude now also emits a `visual_style_guide`
   JSON object (main character description, setting, 5-color palette, mood
   progression, NOT_TO_DO list) and prefixes every English scene prompt with a
   one-line summary of it, to try to keep scenes visually coherent. Added a
   collapsible UI card on `/generate` to show it (color swatches, checklist).
   **This did not fully solve character consistency** — see Known Issues below.
7. **Cost correction #1** (`902b687`) — discovered $3.13 had been spent on 19
   requests because testing used `gpt-image-1` at `quality: "high"` (~$0.17/image,
   the most expensive tier of the most expensive model). Switched to `dall-e-2`
   (~$0.02/image) as a quick fix.
8. **Replaced OpenAI entirely with Replicate** (`36aef58`, `4599a3d`, `551d77c`,
   `3209e7e`) — per explicit request to move off DALL-E. `backend/src/services/dalle.ts`
   deleted; `backend/src/services/replicate.ts` created, calling Replicate's REST
   API directly via `fetch` (not the `replicate` npm package — see "Implementation
   quirks" below). Went through three real bugs found by live testing:
   - Used `stability-ai/sdxl` via the "official model" shorthand endpoint
     (`/v1/models/{owner}/{name}/predictions`) → 404, because SDXL isn't one of
     Replicate's official models. Fixed by resolving `latest_version.id` via
     `GET /v1/models/stability-ai/sdxl` and using the general
     `/v1/predictions` endpoint instead.
   - One scene hit a transient 402 "insufficient credit" right after a balance
     top-up (Replicate's billing took a few seconds to catch up). Added a single
     10s-delayed retry on 402.
   - The route's "already generated, skip" check only looked at
     `imagePaths[0]`, so a partial failure (scene 4 broken, others fine) could
     never be retried — the endpoint would keep reporting `already_completed`
     with the broken array forever. Fixed to check all scenes and to only
     regenerate the ones still on `placeholder.svg`.
   - Also did real pricing research (not assumption) before picking a model:
     SD1.5 (`stable-diffusion`) ≈ $0.0023/image, SDXL ≈ $0.0049/image,
     `stable-diffusion-3` ≈ $0.035/image flat. Picked SDXL as the cost/quality
     balance.

## Known issues — unresolved as of this handoff

**Image quality/consistency is bad.** Real test output (6-scene horror story)
showed: scenes rendered as multi-panel grids/blueprint diagrams instead of single
illustrations (classic SDXL failure mode when a prompt crams too many distinct
concepts — our prompts are `"Visual guide: <character+setting+mood>. <scene
description>, cartoon illustration, vibrant colors..."`, ~500 chars, no
`negative_prompt`), and the character's appearance/art style varies wildly scene
to scene because there's no seed-locking or reference-image conditioning — each
of the 6 generations independently samples a different point in the model's
latent space. The `visual_style_guide` text-prompt approach (item 6 above) helps
the model "talk about" consistency but cannot enforce it pixel-wise.

**This is unresolved — no fix has been decided or implemented yet.** Two
candidate directions were scoped but not built:
1. *Cheap*: shorten/restructure prompts, add a `negative_prompt`
   (no panels/grids/text/diagrams), lock a fixed `seed` per job across all 6
   scenes. Zero cost change. Likely kills the grid artifacts and unifies art
   style; does not solve character identity.
2. *Bigger pivot, under live discussion*: the user pointed at
   [FacelessReels](https://www.facelessreels.com/) (a B2B SaaS doing the same
   "AI faceless video" product) as a reference. Research done this session found
   they (and most competitors in this space) generate actual video clips directly
   via image-to-video / text-to-video models (Kling, Hailuo/MiniMax, Seedance,
   Wan, Veo, Runway — not static images animated afterward). On Replicate,
   real per-video pricing (sourced from Replicate's own model-comparison blog
   post): Wan 2.2 i2v ≈ $0.05–0.11/clip, Hailuo 02 Fast ≈ $0.10–0.15/clip,
   Seedance 1 Lite ≈ $0.09–0.72/clip, Kling 2.1 ≈ $0.25–0.90/clip, vs. the
   current SDXL image approach at ≈ $0.005/image. An image-to-video model fed
   the *same* reference character image for every scene would solve identity
   consistency by construction (every clip starts from literally the same source
   pixels) — but this is a real architecture change (per-scene video clips
   instead of static images, no current code for it) and a 10–20x+ per-video
   cost increase (≈ $0.03 today → roughly $0.30–0.66+ for 6 clips). **No decision
   has been made yet on which direction to take; this conversation was still in
   progress at handoff time.**

**Not yet built at all:**
- Voiceover/TTS audio generation (ElevenLabs key exists in `.env.example` but
  no service code exists — `seslendirme` is currently just text)
- Actual video assembly/rendering (combining images/clips + audio + captions
  into a final video file)
- Publishing/scheduling to TikTok/YouTube/Instagram
- Dashboard/history pages are still static placeholder UI (see
  `frontend/src/app/dashboard/page.tsx`) — not wired to real job data
- Settings page (API key management UI) is static placeholder, not functional

## Implementation quirks worth knowing about

- **`replicate.ts` does not import the `replicate` npm package.** It calls
  Replicate's REST API directly via global `fetch`. This was deliberate: the
  user's standing rule is "write code only, no `npm install`, but `tsc --noEmit`
  must pass" — importing an uninstalled package would fail type-checking.
  `package.json` lists `replicate` as a dependency for parity/future use, but
  nothing currently imports it.
- **No live API testing happens unless the user explicitly says so.** Standing
  rule from the user (stated mid-project, see conversation history): write code,
  run `tsc --noEmit`/`npm run build` only, never call Claude/Replicate/OpenAI/
  ElevenLabs, never query live DB data. The user tests manually on localhost and
  reports back errors/screenshots. Do not violate this without a fresh explicit
  go-ahead in the current conversation.
- **`.env` (not `.env.example`) currently holds real, live API keys** —
  `CLAUDE_API_KEY`, `REPLICATE_API_TOKEN`. It's gitignored, never committed.
  Treat any key pasted into chat as already-exposed; don't echo it back
  unnecessarily in future responses.
- **The `stories` table has had two columns bolted on after initial creation**
  (`image_paths`, then `visual_style_guide`) via `ALTER TABLE ... ADD COLUMN`
  migrations in `connectDatabase()`, because `CREATE TABLE IF NOT EXISTS` is a
  no-op against an already-existing local `kinvoxai.db`. Any future schema
  change needs the same migration pattern, not just an edit to the `CREATE
  TABLE` string.
- **Image generation is idempotent per scene, not per job** — `POST
  /api/generate-images` can be called again after a partial failure and will
  only regenerate scenes still on `placeholder.svg`, reusing successful ones.

## Costs actually observed

- ~$3.13 burned in one session testing `gpt-image-1` at `quality: "high"`
  (~$0.17/image) across ~12-13 test images plus a couple of Claude calls — this
  is what triggered the "stop auto-testing" rule and the move to cheaper models.
- Current SDXL image pipeline: ≈ $0.0049/image × 6 scenes ≈ $0.03/video in
  image costs (Claude story generation cost is separate and small —
  claude-haiku is cheap).

## Environment / setup

- `backend/.env` (actually at repo root, `c:\KinvoxAI\.env`) needs:
  `CLAUDE_API_KEY`, `CLAUDE_MODEL` (optional, defaults to
  `claude-haiku-4-5-20251001`), `REPLICATE_API_TOKEN`. `ELEVENLABS_API_KEY` is
  declared but unused (no TTS code yet).
- `backend/package.json` lists `replicate` as a dependency but `npm install`
  hasn't been run against it in this session (see quirks above) — run it before
  relying on anything that might start importing the package directly.
- SQLite DB file lives at repo root (`kinvoxai.db`), WAL mode, no migrations
  tooling beyond the manual `ALTER TABLE` checks in `connectDatabase()`.

## Suggested next steps (not yet agreed with the user — needs their decision)

1. Resolve the image quality/consistency direction (cheap prompt fix vs.
   image-to-video pivot) — this conversation was actively deciding this at
   handoff time, don't assume an answer.
2. Whichever direction wins, get a clean live test run confirmed before
   building further on top of it.
3. TTS/voiceover generation is the next obvious missing piece once images (or
   video clips) are solid.
4. Eventually: actual video assembly + the dashboard/history/settings pages
   need to become real instead of placeholder UI.
