#!/usr/bin/env python3
"""Build a hyperframes project's voiceover: synth -> GATE -> pad -> concat.

Usage:  python3 ../_build/build-vo.py            # run from inside the video project dir
        python3 video/_build/build-vo.py <project-dir>

Reads `vo.json` in the project dir:
    { "slots": [7.5, 11.0, ...], "lead": 0.3, "segments": ["line 1", "line 2", ...] }

`lead` is the adelay applied to segment 1 only (seconds).

WHY THE GATE EXISTS — do not remove it:
Google Cloud TTS `en-US-Chirp3-HD-*` is NON-DETERMINISTIC. The same text returns a
different duration on every call (measured spread ±0.7s, and up to 1.4s on lines with
many spelled-out letters). `ffmpeg -af apad -t <slot>` TRUNCATES as well as pads, so an
over-long take is silently chopped mid-word while vo.wav still measures exactly the
target length and every downstream check passes. The gate + retry is the only defence.

Spelled-out letters ("A I", "l l m s dot t x t", "M C P") dominate duration — Chirp3-HD
reads them slowly with pauses. If a segment will not fit after MAX_TAKES, shorten the
line or widen its slot; trimming ordinary prose barely helps.
"""
import base64
import json
import os
import subprocess
import sys

VOICE = "en-US-Chirp3-HD-Aoede"
PROJECT_GCP = "emerge-digital-web-7034"
MAX_TAKES = 6
MIN_HEADROOM = 0.05

proj = sys.argv[1] if len(sys.argv) > 1 else "."
os.chdir(proj)

FFPROBE = os.path.join("bin", "ffprobe")
FFMPEG = os.path.join("bin", "ffmpeg")
for b in (FFPROBE, FFMPEG):
    if not os.path.exists(b):
        sys.exit(f"{b} missing — run `npm install` in this project first (bin/ are gitignored symlinks)")

spec = json.load(open("vo.json"))
segments, slots = spec["segments"], spec["slots"]
lead0 = float(spec.get("lead", 0.3))
if len(segments) != len(slots):
    sys.exit(f"vo.json mismatch: {len(segments)} segments vs {len(slots)} slots")

token = subprocess.run(
    ["gcloud", "auth", "print-access-token"],
    capture_output=True, text=True,
    env={**os.environ, "CLOUDSDK_CORE_ACCOUNT": "rami@emergedigital.com"},
).stdout.strip()
if not token:
    sys.exit("no gcloud access token — run `gcloud auth login`")


def duration(path: str) -> float:
    out = subprocess.run(
        [FFPROBE, "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path],
        capture_output=True, text=True,
    ).stdout.strip()
    return float(out)


def synth(text: str, path: str) -> None:
    req = json.dumps({
        "input": {"text": text},
        "voice": {"languageCode": "en-US", "name": VOICE},
        "audioConfig": {"audioEncoding": "LINEAR16", "sampleRateHertz": 24000},
    })
    r = subprocess.run([
        "curl", "-sS", "-X", "POST", "https://texttospeech.googleapis.com/v1/text:synthesize",
        "-H", f"Authorization: Bearer {token}",
        "-H", f"x-goog-user-project: {PROJECT_GCP}",
        "-H", "Content-Type: application/json; charset=utf-8",
        "--data-binary", req,
    ], capture_output=True, text=True)
    d = json.loads(r.stdout)
    if "audioContent" not in d:
        sys.exit(f"TTS error: {json.dumps(d)[:300]}")
    blob = base64.b64decode(d["audioContent"])
    # a failed auth writes a JSON error body; refuse to carry on with a non-WAV
    if blob[:4] != b"RIFF":
        sys.exit(f"TTS returned non-RIFF payload for {path}")
    open(path, "wb").write(blob)


os.makedirs(os.path.join("assets", "seg"), exist_ok=True)
failed = []

force = os.environ.get("FORCE") == "1"

for i, (text, slot) in enumerate(zip(segments, slots), 1):
    lead = lead0 if i == 1 else 0.0
    raw = os.path.join("assets", "seg", f"s{i}.wav")
    # Re-use a take that already fits. Re-timing a scene is common and each synth is a
    # fresh roll of a non-deterministic dice — re-rolling a good take can only lose.
    # FORCE=1 to re-synth anyway (e.g. after editing the line).
    if not force and os.path.exists(raw):
        d = duration(raw)
        head = slot - lead - d
        if head >= MIN_HEADROOM:
            print(f"  s{i}  {d:6.3f}s  slot {slot:5.1f}  headroom {head:+6.3f}  reused")
            continue
    for take in range(1, MAX_TAKES + 1):
        synth(text, raw)
        d = duration(raw)
        head = slot - lead - d
        if head >= MIN_HEADROOM:
            print(f"  s{i}  {d:6.3f}s  slot {slot:5.1f}  headroom {head:+6.3f}  OK (take {take})")
            break
        print(f"  s{i}  {d:6.3f}s  slot {slot:5.1f}  headroom {head:+6.3f}  over — retrying")
    else:
        print(f"  s{i}  FAILED after {MAX_TAKES} takes — shorten the line or widen the slot")
        failed.append(i)

if failed:
    sys.exit(f"segments {failed} do not fit; refusing to pad (apad -t would truncate them mid-word)")

# pad each segment to its slot, then concat
lines = []
for i, slot in enumerate(slots, 1):
    af = f"adelay={int(lead0*1000)}:all=1,apad" if i == 1 else "apad"
    subprocess.run([
        FFMPEG, "-y", "-v", "error", "-i", os.path.join("assets", "seg", f"s{i}.wav"),
        "-af", af, "-t", str(slot),
        "-c:a", "pcm_s16le", "-ar", "24000", "-ac", "1",
        os.path.join("assets", "seg", f"p{i}.wav"),
    ], check=True)
    lines.append(f"file 'p{i}.wav'")

open(os.path.join("assets", "seg", "list.txt"), "w").write("\n".join(lines) + "\n")

# RE-ENCODE on concat: `-c copy` embeds WAV headers mid-stream and truncates the result
subprocess.run([
    FFMPEG, "-y", "-v", "error", "-f", "concat", "-safe", "0",
    "-i", os.path.join("assets", "seg", "list.txt"),
    "-c:a", "pcm_s16le", "-ar", "24000", "-ac", "1",
    os.path.join("assets", "vo.wav"),
], check=True)

total = duration(os.path.join("assets", "vo.wav"))
expected = sum(slots)
print(f"\n  vo.wav = {total:.3f}s (expected {expected:.3f}s)")
if abs(total - expected) > 0.02:
    sys.exit(f"vo.wav length {total} != sum(slots) {expected} — a pad slot is wrong")
print("  OK")
