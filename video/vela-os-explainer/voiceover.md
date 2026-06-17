# Vela OS explainer — voiceover

Status: **script ready; synth pending `gcloud auth login`** (token expired 2026-06-17). Once GCP auth is restored and Text-to-Speech is enabled, synthesize → drop `assets/vo.mp3` in → re-render. Voice direction: calm, confident, specific (per Emerge brand voice — not breathless). ~120 words ≈ the 45s timeline.

## Script (per scene, for sync)
1. **0–5** · "Vela OS. Return on AI Investment — measured. Built by Emerge Digital, powered by FPT CX Services."
2. **5–10** · "The operating system for AI-first customer experience — one platform that runs the whole portfolio, and shows every client their outcomes."
3. **10–15.5** · "Every engagement is measured in ROAI: value delivered, divided by AI cost. Four dollars of value for every dollar spent."
4. **15.5–21** · "Two modes — an agency command center for the team, and a customer portal that proves the value, account by account."
5. **21–27** · "Twenty-four productized services across six CX pillars, powered by the ON.Ecosystem — from answer-engine optimization to agentic commerce."
6. **27–32.5** · "Billing is usage-based, wired to Metronome — priced to the unit, from seat plans to enterprise commitments."
7. **32.5–39.5** · "And it's proven: two hundred percent more click-throughs, an MVP in two months instead of ten — backed by FPT."
8. **39.5–45** · "Vela OS. Return on AI Investment, measured. Book a discovery call."

> Proof discipline: this is the canonical proof only (no demo-dashboard client metrics, no financials beyond FPT's public parent figures).

## Synthesize (Google Cloud Text-to-Speech / Vertex) — run after `gcloud auth login`
Recommended voice: `en-US-Studio-O` (warm female) or `en-US-Chirp3-HD-Charon` (newer). Enable once: `gcloud services enable texttospeech.googleapis.com`.

```bash
# SSML keeps the VO aligned to scene boundaries via <break>. Save as assets/vo.ssml then:
TOKEN=$(gcloud auth print-access-token)
PROJECT=$(gcloud config get-value project)
curl -s -X POST "https://texttospeech.googleapis.com/v1/text:synthesize" \
  -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT" \
  -H "Content-Type: application/json" -d @- <<'JSON' | python3 -c "import sys,json,base64;open('assets/vo.mp3','wb').write(base64.b64decode(json.load(sys.stdin)['audioContent']))"
{
  "input": { "ssml": "<speak>Vela O S. Return on A I Investment — measured. Built by Emerge Digital, powered by F P T C X Services. <break time=\"700ms\"/> The operating system for A I-first customer experience — one platform that runs the whole portfolio, and shows every client their outcomes. <break time=\"600ms\"/> Every engagement is measured in ROAI: value delivered, divided by A I cost. Four dollars of value for every dollar spent. <break time=\"500ms\"/> Two modes — an agency command center for the team, and a customer portal that proves the value, account by account. <break time=\"500ms\"/> Twenty-four productized services across six C X pillars, powered by the ON Ecosystem — from answer-engine optimization to agentic commerce. <break time=\"500ms\"/> Billing is usage-based, wired to Metronome — priced to the unit, from seat plans to enterprise commitments. <break time=\"500ms\"/> And it's proven: two hundred percent more click-throughs, an M V P in two months instead of ten — backed by F P T. <break time=\"500ms\"/> Vela O S. Return on A I Investment, measured. Book a discovery call.</speak>" },
  "voice": { "languageCode": "en-US", "name": "en-US-Studio-O" },
  "audioConfig": { "audioEncoding": "MP3", "speakingRate": 1.0, "sampleRateHertz": 44100 }
}
JSON
# probe the resulting length and (if needed) nudge speakingRate so it lands ~44s:
ffprobe -i assets/vo.mp3 -show_entries format=duration -v quiet -of csv="p=0"
```

## Wire into the composition + re-render
Add inside `#root` (a track below the scenes), then re-render:
```html
<audio class="clip" src="assets/vo.mp3" data-start="0" data-duration="45" data-track-index="0" data-has-audio="true"></audio>
```
```bash
npm run check
PATH="$PWD/bin:$PATH" npm run render   # ffmpeg muxes the audio track
```
Then copy the new MP4 to `../../public/downloads/Vela-OS-Explainer.mp4` and re-commit. (If the VO total ≠ 45s, adjust scene `data-duration`s or `speakingRate` so audio and motion land together.)
