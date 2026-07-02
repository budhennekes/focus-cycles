# Pomodoro Mac App — Plan

## DECISIONS LOCKED
- Path: **B — single-file PWA**, install via Safari "Add to Dock"
- Backgrounds: Unsplash photos (curated set of landscapes, swap-in via URL list)
- Menu bar quick-start: skipped (not available on path B)

---

## Core features (both paths)

- [ ] Timer, massive typography, center stage
- [ ] Cycle selector: 1 sprint / 3 / 5 / 7 / custom (1–12)
- [ ] Adjustable focus + break duration
- [ ] Projected end time ("Ends at 12:08 am")
- [ ] Clock (top-left)
- [ ] Quote overlay, rotates each session
- [ ] Weather (top-right, opt-in)
- [ ] Rotating Ghibli-style background with soft crossfade
- [ ] Cut: scratch pad

## History / Review — the differentiator

Every cycle saved locally with:
- Start time, duration, focus/break, completed vs. abandoned
- One-line "what did you work on?" prompt after each focus cycle (optional, skippable with Enter)

Review screen shows:
- [ ] Today's focus time + cycles completed
- [ ] Last 7 / 30 days totals
- [ ] Current streak (consecutive days with ≥1 completed cycle)
- [ ] Best time of day to focus (derived from your completion data)
- [ ] Completion rate
- [ ] Simple list of recent sessions with your notes
- [ ] Export CSV button

## Ghibli backgrounds — reality check

Actual Ghibli art is copyrighted. "Ghibli-style" means AI-generated or similar aesthetic. Plan:
- I'll ship 6–8 free/public-domain nature landscape photos as placeholders (soft hills, clouds, sunsets — the closest to the vibe).
- You can drop your own Ghibli-style AI-generated images in an `Images/` folder anytime. The app will pick them up automatically.
- If you want me to generate a few with an AI tool first, tell me and I'll describe the prompts you can use.

## Weather

wttr.in (free, no API key, no account). Shows condition + temp in a small pill, top-right. Opt-in button on first launch, same as the reference.

## Build order

1. [ ] Scaffold project in `/Users/bud/Documents/pomodoro-app/`
2. [ ] Timer engine + cycle logic (pause/resume/skip)
3. [ ] Main screen UI (Ghibli background, timer, cycle selector)
4. [ ] Local storage for session history
5. [ ] Cycle-end prompt ("what did you work on?")
6. [ ] Review / history screen
7. [ ] Weather integration
8. [ ] Quotes + background rotation polish
9. [ ] Sound + notifications (gentle chime when cycle ends)
10. [ ] Menu bar icon (optional, Swift path only) — quick-start from anywhere
11. [ ] Walk you through building/installing the .app

## Out of scope (explicitly)

- Scratch pad
- Social / sharing
- Sync across devices (local-only, fast, private)
- Task management / todos (it's a timer, not a planner)

## Review section

_To be filled after build._

---

# v2 — Ultraworking + Ghibli + Light Mode

## Ultraworking framework (from the xlsx)

**Mode split:**
- **Sprint (1 cycle):** one prompt before → timer → one prompt after. Minimal friction.
- **Full session (2+ cycles):** prep → [plan → focus → review → break] × N → debrief.

**Prep (once, before session):**
- What am I trying to accomplish?
- Why is this important and valuable?
- How will I know this is complete?
- Any risks / hazards? (distractions, procrastination)
- Concrete or ambiguous?
- Anything noteworthy?

**Plan (before each cycle):**
- What am I trying to accomplish this cycle?
- How will I get started?
- Any hazards present?
- Energy (1–10)
- Morale (1–10)

**Review (after each cycle):**
- Completed target? (Yes / Partial / No)
- Anything noteworthy?
- Any distractions?
- Things to improve next cycle?

**Debrief (once, after session):**
- What did I get done?
- How did this compare to normal output?
- Did I get bogged down? Where?
- What went well? How to replicate?
- Any other takeaways?

All fields skippable. Press Enter / click Continue to proceed. "Skip all prompts this cycle" option included.

Update default to Ultraworking standards: **30 min focus / 10 min break** (was 30 / 5).

## Dashboard additions
- Energy + morale trend chart (7-day)
- Cycle target completion rate (yes / partial / no breakdown)
- Common hazards + distractions feed (recent text)
- "What went well" wisdom feed
- Link each history row to its full session detail (expand to see prep / plan / review / debrief)

## Ghibli backgrounds
- [ ] Curate 15 brighter, painterly Unsplash landscape URLs (no dark/moody; nature only, no people)
- [ ] Support local folder: `backgrounds/ghibli-01.jpg` through `backgrounds/ghibli-20.jpg` — drop files in, app picks them up automatically
- [ ] Write `ghibli-prompts.md` with 15 specific AI prompts he can paste into ChatGPT/Midjourney/etc. to generate actual Ghibli-style images

## Light / dark mode
- [ ] Auto-detect system preference on first load
- [ ] Manual toggle button in bottom bar (sun/moon)
- [ ] Persist choice to localStorage
- [ ] Light mode: white-translucent panels, dark text, same background images

## Data model (v2)
Each session now stores prep + per-cycle plan/review + debrief, not just flat cycle rows. Old v1 data wiped on upgrade (you had no meaningful data yet).

## Out of scope
- Collaboration / sharing
- Cloud sync
- Image upload UI (local folder approach instead; cleaner)


---

# MVP hardening pass — July 1, 2026

## Shipped
- [x] Help / FAQ screen (6 questions, minimalist, reuses existing panel styles). Help button in bottom bar, "?" key opens it, Esc closes.
- [x] Perf: timer only writes to the DOM and window title when the visible second changes (was 4 writes per second).
- [x] Perf: next background image preloads in the cache, so pressing B swaps instantly.
- [x] Bug fix: Esc now works from prompt screens even when a text field has focus (first Esc blurs the field, second cancels — standard macOS behavior).
- [x] Bug fix: window title countdown resets to "Focus Cycles" when a timer ends instead of freezing on the last time.

## Tested end-to-end in a real browser (acting as a user)
- First-run banner: shows once, dismiss persists across reload
- Today's intent: set, persisted across reload, Edit works
- Sprint flow: goal prompt → timer → skip → review (Yes + note) → saved
- Crash recovery: reload mid-timer resumed at the correct second with toast; reload on prep screen restored prep
- History: stats, 7-day chart, 100% hit ring, session row expands to full detail
- FAQ: renders in both themes, Esc navigation chain works (FAQ → History → Setup)
- Cancel: Esc-Esc from prep cancels with toast
- Console: zero errors across the entire run
- Smoke test: passing

## Known tradeoffs (documented, not bugs)
- History is per-browser (Safari, Chrome, and the Mac app each have their own). Export CSV is the backup path; noted in-app in the History header and FAQ.
- Electron app is ~240MB (normal for Electron).

---

# Final polish pass — July 2, 2026

## Product decisions (per Bud: "decide using best practices")
- No notepad/task list. The per-cycle plan field is the task list. Dedicated tools do the rest.
- Music = built-in WebAudio ambient engine (Rain / Deep / Drift), not YouTube. Zero network, no ads, instant, offline. M key or Music button cycles. Never autoplays on launch.
- FAQ screen removed. Shortcuts live in a ? overlay (hidden until summoned). First-run banner slimmed to one sentence + install hint.

## Speed work (from 32-agent review, adversarially verified)
- Cycle-dot pulse rebuilt as transform/opacity halo (was animating box-shadow = repaint every frame, all session)
- All decorative animations pause when the window loses focus; honor prefers-reduced-motion
- Backdrop blur cut from ~13 surfaces to ~6 hero panels; small chrome now uses pre-blended opaque surfaces; grain layers trimmed the same way
- Background crossfade 1.8s → 0.9s; removed permanent will-change on full-screen layers
- Crash-snapshot heartbeat 4s → 60s (state transitions already force-save)
- Startup background probing 80 requests → 4 when no local pack exists

## Correctness fixes
- timerState cleared when a phase completes — crash-resume on a review screen can no longer re-complete a cycle and corrupt its minutes
- Skip now works while paused (was a silent no-op)
- Paused time excluded from recorded focus minutes (pausedAccumMs tracking)
- Space/S only act on the screens they belong to (Space on history no longer silently started a session)
- Resume-from-paused restores the paused visual state
- Intent pill rolls over at midnight if the app stays open
- localStorage guarded in first-run path

## Mac app (Electron)
- Single-instance lock (second launch focuses the existing window instead of racing localStorage)
- Weather now works in the packaged app: IP-based location fallback (ipapi.co, added to CSP) when native geolocation is unavailable
- Packaging excludes stale dist backups/scratch dirs

## Verified
- Smoke test green, main.js syntax-checked
- Browser walk-through as a user: digits set cycles, ? overlay opens/any-key closes, music cycles Rain→Deep→Drift→off with live AudioContext, sprint flow, pause→skip-while-paused→review, Esc navigation, zero console errors
- Fresh build installed to /Applications and launched

## Follow-up — July 2, 2026 (weather + music feedback)
- Weather root cause: ipapi.co is rate-limited. Now geolocation first (browsers), then ipwho.is → ipapi.co IP fallback (Mac app). ipwho.is verified working + CORS-enabled.
- Music: generated Deep/Drift cut. Now Off → Lofi (Lofi Girl 24/7 stream) → Synthwave (Lofi Girl synthwave stream) → Rain (local, works offline). Streams play in a hidden YouTube player created only while playing, removed when off. CSP + autoplay policy updated in main.js.
- Note: in desktop Chrome, ad-block extensions can block the IP-lookup fallback; the Mac app is unaffected.

## Deep debug pass — July 2, 2026 ("make sure it's working")
Attached a real debugger (CDP) to the running Mac app and traced the music failure to a 4-link chain, all fixed and verified:
1. index.html had its own meta CSP with frame-src 'none' silently vetoing the YouTube frame (and blocking the weather IP fallback via connect-src). Updated to match main.js.
2. main.js stamped our CSP onto EVERY network response, including YouTube's own player page, killing its scripts. Now scoped to file:// documents only.
3. YouTube "Error 153": embeds from file:// send no Referer and YouTube refuses to play. main.js now injects a Referer for YouTube/googlevideo requests.
4. The lofi stream ID from memory was dead ("live stream recording not available"). Pulled the CURRENT live IDs from youtube.com/@LofiGirl/streams and verified isLive: lofi = X4VbdwhkE10 (beats to relax/study to), synth = 4xDzrJKXOOY (synthwave radio). Live streams also ignore autoplay=1, so the app now drives the player through the official JS API (enablejsapi + playVideo/unMute commands).
Verified IN THE INSTALLED APP via debugger: video playing, time advancing, unmuted. Weather verified: chip shows live temp from IP-based coords. Music-off removes the player frame entirely.
If a stream dies in the future: grab the new ID from youtube.com/@LofiGirl/streams and swap it in MUSIC_STREAMS in index.html.
