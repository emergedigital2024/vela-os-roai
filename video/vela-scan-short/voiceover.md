# Vela Scan short — voiceover

Voice **`en-US-Chirp3-HD-Aoede`** (Google Cloud TTS), same as the Vela OS explainer.
Runtime **53.0s**, 6 segments, VO muxed after render.

## Read the explainer's voiceover.md first
The two hard-won constraints there apply verbatim to this project:
1. **Chirp 3 HD is NON-DETERMINISTIC** — identical text returns a different duration every call
   (measured ±0.7s). A shorter script does not guarantee it fits its slot.
2. **`-af apad -t <slot>` truncates as well as pads** — an over-long take is chopped mid-word while
   `vo.wav` still measures exactly 53.0s and every downstream check passes.
   **Gate on `duration + lead <= slot - 0.05` before padding. Re-synth on FAIL.**
3. Hyperframes truncates in-render audio ~10s → the VO is muxed after the render, never via `<audio>`.

## Script (6 segments — order must match build-vo)
1. Answer engines are reading your site right now. Vela Scan tells you what they actually see.
2. Four signals, checked live: robots rules for A I crawlers, l l m s dot t x t, a payments manifest, and M C P hints.
3. One call. You post a U R L, and everything is fetched live — no cache, no crawl queue.
4. Here's a real store. Robots reachable. L L M S dot t x t present. But agent payments: missing. And no M C P hints at all.
5. Then it caught what a checklist would miss. Three crawlers are told both allow and disallow. Two more are blocked outright, including Google's.
6. Two of four signals. Five cents a call. Vela Scan.

> Claim discipline: every number spoken here is read from a live `vela-agent-scan` response against
> `https://aquora.ae`, captured to `video/_capture/vela-scan-aquora.json`. Nothing is illustrative.
> If the store's robots.txt is fixed, this footage becomes stale — re-scan before re-cutting.

## ⚠️ Segment 2 is the tight one
Spelled-out letters ("A I", "l l m s dot t x t", "M C P") dominate duration — Chirp3-HD reads them
slowly with pauses, so trimming *prose* barely helps. Segment 2 measured 9.6–11.0s across takes even
after shortening. Its slot was widened to 11.0s (taken from scenes 3 and 5, total held at 53.0s)
rather than mangling the line. If you re-cut it, re-check this segment first.

## Build
```bash
cd video/vela-scan-short && npm install      # bin/ffmpeg + bin/ffprobe are gitignored symlinks
export PATH="$PWD/bin:$PATH"

slots=(7.5 11.0 6.5 11.0 10.5 6.5)   # = scene data-durations; seg1 gets a 0.3s lead (adelay)
# ⚠️ zsh arrays are 1-INDEXED: ${slots[$i]}, never ${slots[$((i-1))]}
# 1) synth each segment -> assets/seg/sN.wav (LINEAR16 @ 24000)
# 2) GATE each: duration + lead <= slot - 0.05, else re-synth
# 3) pad: ffmpeg -i sN.wav -af apad -t <slot> pN.wav   (seg1: -af "adelay=300:all=1,apad")
# 4) concat RE-ENCODING (never -c copy): -c:a pcm_s16le -ar 24000 -ac 1 -> assets/vo.wav (53.0s)
npm run check && npm run render
ffmpeg -y -i renders/<latest>.mp4 -i assets/vo.wav -map 0:v:0 -map 1:a:0 \
  -c:v copy -c:a aac -b:a 192k -ar 48000 renders/vela-scan-short-vo.mp4
cd ../.. && PATH="video/vela-scan-short/bin:$PATH" \
  node scripts/publish-video.mjs vela-scan-short Vela-Scan-Short.mp4 vela-scan-short-vo.mp4
```
Verify: both streams ≈53.0s, `volumedetect` mean ≈ −23 dB (≈ −91 dB = the silent render shipped).
