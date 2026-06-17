# Vela OS explainer — voiceover

**Status: DONE + deployed.** Voice **`en-US-Chirp3-HD-Aoede`** (Google Cloud TTS / Vertex) — natural, warm. The video is **66.6s** with the VO synced scene-by-scene.

## Why the build is segment-based + muxed (important)
1. **Chirp 3 HD voices ignore SSML `<break>`** (text-only), so a single synth gives no reliable inter-topic boundaries to sync scenes to.
2. **Hyperframes truncates in-render audio by ~10s** (the `<audio>` element renders ~10s short regardless of file/format — MP3 *and* WAV both lost ~10s). So the production audio is **muxed in with ffmpeg after the render**, not via the in-render `<audio>` track.

So: synth each of the 8 segments separately → pad each to its scene slot (bakes in ~0.5s topic pauses) → concat (re-encode) into one `assets/vo.wav` (66.6s) whose segment offsets match the scene `data-start`s → render the video → **ffmpeg-mux `vo.wav` over the rendered video**.

## Script (8 segments — must match the order in build-vo)
1. Vela O S. Return on A I Investment — measured. Built by Emerge Digital, powered by F P T C X Services.
2. The operating system for A I-first customer experience: one platform that runs the whole portfolio, and shows every client their outcomes.
3. Every engagement is measured in ROAI — value delivered, divided by A I cost. Four dollars of value for every dollar spent.
4. Two modes. An agency command center for the team, and a customer portal that proves the value, account by account.
5. Twenty-four productized services across six C X pillars, powered by the ON Ecosystem — from answer-engine optimization to agentic commerce.
6. Billing is usage-based, wired to Metronome, and priced to the unit — from seat plans to enterprise commitments.
7. And it's proven. Two hundred percent more click-throughs. An M V P in two months instead of ten. Backed by F P T.
8. Vela O S. Return on A I Investment, measured. Book a discovery call.

> Proof discipline: canonical proof only (no demo-dashboard client metrics, no financials beyond FPT's public parent figures).

## Rebuild (after `gcloud auth login`)
```bash
# 1) synth each segment → assets/seg/sN.wav (en-US-Chirp3-HD-Aoede, LINEAR16), print durations
#    (python: POST texttospeech.googleapis.com/v1/text:synthesize with input.text; one call per segment)
# 2) pad each segment to its scene slot and concat (RE-ENCODE, not -c copy — copy embeds WAV headers mid-stream → truncation):
slots=(8.5 9.5 9.3 7.7 10.2 7.2 7.6 6.6)   # = scene data-durations; seg1 gets a 0.3s lead (adelay)
#    ffmpeg -i sN.wav -af apad -t <slot> pN.wav   (seg1: -af "adelay=300:all=1,apad")
#    ffmpeg -f concat -safe 0 -i list.txt -c:a pcm_s16le -ar 24000 -ac 1 assets/vo.wav
# 3) render video, then mux the full VO over it:
PATH="$PWD/bin:$PATH" npm run render
ffmpeg -y -i renders/<latest>.mp4 -i assets/vo.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 192k -ar 48000 \
  ../../public/downloads/Vela-OS-Explainer.mp4
```
Verify (no `-loglevel error` — it hides detector output): `ffmpeg -i out.mp4 -af volumedetect -f null -` (mean ≈ −22 dB) and stream durations both ≈ 66.6s. Scene `data-start`s in `index.html` must equal the cumulative `slots`. To change voice: swap the `name` in the synth call (any `en-US-Chirp3-HD-*`).
