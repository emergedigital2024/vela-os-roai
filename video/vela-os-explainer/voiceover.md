# Vela OS explainer — voiceover

**Status: DONE + deployed.** Voice **`en-US-Chirp3-HD-Aoede`** (Google Cloud TTS / Vertex) — natural, warm. The video is **66.6s** with the VO synced scene-by-scene.

## Why the build is segment-based + muxed (important)
0. **⚠️ Chirp 3 HD is NON-DETERMINISTIC — the same text returns a different duration every call.**
   Measured 2026-08-16: segment 3's identical text synthesised at **9.640s, 9.040s and 10.400s**
   across three consecutive calls (±0.7s spread). Consequences:
   - You **cannot** assume a re-synth fits its slot just because the wording got shorter. Segment 3
     came back *longer* than its 9.3s slot on the first take despite unchanged text.
   - **Always run the duration gate below before padding**, and re-synth any segment that overruns
     (a retry usually lands shorter — that is how s3 was fixed).
   - A one-off duration comparison against an older take proves nothing about "voice drift". An
     apparent 6.7% speed-up measured this way was pure take-to-take variance.
1. **Chirp 3 HD voices ignore SSML `<break>`** (text-only), so a single synth gives no reliable inter-topic boundaries to sync scenes to.
2. **Hyperframes truncates in-render audio by ~10s** (the `<audio>` element renders ~10s short regardless of file/format — MP3 *and* WAV both lost ~10s). So the production audio is **muxed in with ffmpeg after the render**, not via the in-render `<audio>` track.

So: synth each of the 8 segments separately → pad each to its scene slot (bakes in ~0.5s topic pauses) → concat (re-encode) into one `assets/vo.wav` (66.6s) whose segment offsets match the scene `data-start`s → render the video → **ffmpeg-mux `vo.wav` over the rendered video**.

## Script (8 segments — must match the order in build-vo)
1. Vela O S. Return on A I Investment — measured. Built by Emerge Digital.
2. The operating system for A I-first customer experience: one platform that runs the whole portfolio, and shows every client their outcomes.
3. Every engagement is measured in ROAI — value delivered, divided by A I cost. Four dollars of value for every dollar spent.
4. Two modes. An agency command center for the team, and a customer portal that proves the value, account by account.
5. Twenty-four productized services across six C X pillars, powered by the Vela line — from answer-engine optimization to agentic commerce.
6. Billing is usage-based, wired to Metronome, and priced to the unit — from seat plans to enterprise commitments.
7. And it's proven. Two hundred percent more click-throughs. An M V P in two months instead of ten.
8. Vela O S. Return on A I Investment, measured. Book a discovery call.

> Proof discipline: canonical proof only — no demo-dashboard client metrics, and **no borrowed scale
> figures at all** (the `$2.47B · 80k+` parent-bench tile was removed 2026-08-16 per the site brief's
> ban on borrowed scale). The FPT-delivered outcomes that remain in scene 7 stay only because the
> scene eyebrow attributes them explicitly — "Real FPT outcomes behind the platform".

## Rebuild (after `gcloud auth login`)
```bash
# 1) synth each segment → assets/seg/sN.wav (en-US-Chirp3-HD-Aoede, LINEAR16), print durations
#    (python: POST texttospeech.googleapis.com/v1/text:synthesize with input.text; one call per segment)
# 2) pad each segment to its scene slot and concat (RE-ENCODE, not -c copy — copy embeds WAV headers mid-stream → truncation):
slots=(8.5 9.5 9.3 7.7 10.2 7.2 7.6 6.6)   # = scene data-durations; seg1 gets a 0.3s lead (adelay)
# ⚠️ zsh arrays are 1-INDEXED: use ${slots[$i]} for segment i, never ${slots[$((i-1))]}.
# GATE (mandatory, before padding): for each segment assert  duration + lead <= slot - 0.05.
#   `-af apad -t <slot>` TRUNCATES as well as pads — an over-long take is silently chopped mid-word
#   while vo.wav still measures exactly 66.6s and every downstream check passes. Re-synth on FAIL.
#    ffmpeg -i sN.wav -af apad -t <slot> pN.wav   (seg1: -af "adelay=300:all=1,apad")
#    ffmpeg -f concat -safe 0 -i list.txt -c:a pcm_s16le -ar 24000 -ac 1 assets/vo.wav
# 3) render video, then mux the full VO over it — into renders/, NOT straight to public/downloads:
PATH="$PWD/bin:$PATH" npm run render
ffmpeg -y -i renders/<latest>.mp4 -i assets/vo.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  renders/vela-os-explainer-vo.mp4
# 4) publish explicitly (rendering does NOT publish). Pass the muxed filename — the script otherwise
#    defaults to newest-mp4-in-renders/ and will happily ship the SILENT raw render:
cd ../.. && PATH="video/vela-os-explainer/bin:$PATH" \
  node scripts/publish-video.mjs vela-os-explainer Vela-OS-Explainer.mp4 vela-os-explainer-vo.mp4
```
⚠️ First restore the toolchain — `bin/ffmpeg` / `bin/ffprobe` are symlinks into the gitignored
`node_modules/`, so a fresh clone has them **dangling**. Run `npm install` in this directory first.
Verify (no `-loglevel error` — it hides detector output): `ffmpeg -i out.mp4 -af volumedetect -f null -` (mean ≈ −22 dB) and stream durations both ≈ 66.6s. Scene `data-start`s in `index.html` must equal the cumulative `slots`. To change voice: swap the `name` in the synth call (any `en-US-Chirp3-HD-*`).
