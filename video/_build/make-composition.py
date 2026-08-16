#!/usr/bin/env python3
"""Assemble a hyperframes composition from a scene spec + the shared brand head.

Usage: python3 video/_build/make-composition.py <project-dir>

Reads `scenes.json` in the project dir:
{
  "scenes": [
    {"dur": 7.5, "comment": "hook", "html": "<div class=\"eyebrow s1a\">…</div>", "anim": ["enter('.s1a', 0.25, {y:20})"]}
  ],
  "captions": ["line 0", "line 1", ...]
}

Scene `data-start` values are DERIVED from the running sum of `dur`, so a scene can be
re-timed by editing one number — nothing else needs to move. Animation offsets inside
`anim` are RELATIVE to their scene start and are shifted here, which is what makes
re-timing safe: the explainer's absolute offsets had to be hand-shifted every time a
slot changed, and that is exactly how a timeline silently desyncs.

`anim` entries are JS expressions with `enter`, `tl`, `shimmer`, `flash` in scope, and
`T` bound to the scene's absolute start time. Write offsets as `T + 0.5`.
"""
import json
import os
import sys

proj = sys.argv[1]
here = os.path.dirname(os.path.abspath(__file__))
spec = json.load(open(os.path.join(proj, "scenes.json")))
scenes, captions = spec["scenes"], spec["captions"]
if len(scenes) != len(captions):
    sys.exit(f"{len(scenes)} scenes but {len(captions)} captions — they must pair 1:1")

starts, t = [], 0.0
for s in scenes:
    starts.append(round(t, 3))
    t = round(t + float(s["dur"]), 3)
total = round(t, 3)

head = open(os.path.join(here, "_head.html")).read()

body = [
    f'  <body>\n    <div id="root" data-composition-id="main" data-start="0" '
    f'data-duration="{total}" data-width="1920" data-height="1080">\n'
]
for i, (s, st) in enumerate(zip(scenes, starts), 1):
    body.append(f'\n      <!-- SCENE {i} — {s.get("comment","")} ({st}–{round(st + s["dur"],3)}) -->')
    body.append(
        f'\n      <div class="scene clip" data-start="{st}" data-duration="{s["dur"]}" data-track-index="1">'
    )
    body.append("\n" + s["html"].rstrip())
    body.append("\n      </div>\n")

body.append('\n      <div id="cap">')
for i, c in enumerate(captions):
    body.append(f'\n        <div class="cap-line" data-i="{i}">{c}</div>')
body.append('\n      </div>\n\n      <div id="hf-vignette"></div>\n      <div id="flash"></div>\n    </div>\n')

anim_js = []
for i, (s, st) in enumerate(zip(scenes, starts), 1):
    anim_js.append(f"\n      // S{i} — {s.get('comment','')}")
    anim_js.append(f"\n      {{ const T = {st};")
    if i > 1:
        anim_js.append("\n        flash(T);")
    for a in s.get("anim", []):
        anim_js.append(f"\n        {a};")
    anim_js.append("\n      }")

script = f"""    <script>
      document.querySelectorAll(".shimmer-sweep-target").forEach((el) => {{
        if (!el.querySelector(".shimmer-mask")) {{ const m = document.createElement("div"); m.className = "shimmer-mask"; el.appendChild(m); }}
      }});

      window.__timelines = window.__timelines || {{}};
      const tl = gsap.timeline({{ paused: true }});
      const EXPO = "expo.out";
      const enter = (sel, at, opts = {{}}) => tl.from(sel, Object.assign({{ opacity: 0, y: 44, duration: 0.7, ease: EXPO }}, opts), at);
      const shimmer = (sel, at) => tl.fromTo(sel, {{ "--shimmer-pos": "-20%" }}, {{ "--shimmer-pos": "120%", duration: 1.2, ease: "power2.inOut" }}, at);
      const flash = (at) => tl.fromTo("#flash", {{ opacity: 0 }}, {{ opacity: 0.55, duration: 0.12, ease: "power2.out" }}, at).to("#flash", {{ opacity: 0, duration: 0.5, ease: "power2.in" }}, at + 0.12);

      const STARTS = {json.dumps(starts)};
      const DURS = {json.dumps([s["dur"] for s in scenes])};
      STARTS.forEach((s, i) => {{
        const sel = `.cap-line[data-i="${{i}}"]`;
        const end = s + DURS[i];
        tl.set(sel, {{ visibility: "visible" }}, s + 0.35);
        tl.fromTo(sel, {{ clipPath: "inset(0 100% 0 0)" }}, {{ clipPath: "inset(0 0% 0 0)", duration: 0.45, ease: "power2.out" }}, s + 0.35);
        tl.to(sel, {{ clipPath: "inset(0 0 0 100%)", duration: 0.3, ease: "power2.in" }}, end - 0.45);
        tl.set(sel, {{ visibility: "hidden" }}, end - 0.12);
      }});
{''.join(anim_js)}

      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
"""

out = head + "  </head>\n" + "".join(body) + "\n" + script
open(os.path.join(proj, "index.html"), "w").write(out)

print(f"{proj}/index.html — {len(scenes)} scenes, {total}s")
for i, (s, st) in enumerate(zip(scenes, starts), 1):
    print(f"   S{i}  {st:6.2f} → {round(st + s['dur'],2):6.2f}  ({s['dur']}s)  {s.get('comment','')}")
print(f"   slots for vo.json: {[s['dur'] for s in scenes]}")
