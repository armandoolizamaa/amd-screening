# Handoff (2026-10-26): resume here

Read first: docs/DESIGN.md §6, docs/BUILD_PLAN.md, ../.claude/agent-context/amd-research.md.

## Done (local, uncommitted except docs)
- training/: .venv (python3.13 from anaconda; torch 2.14.1, MPS ok, onnxruntime 1.31), common.py (CamResNet: outputs logits [1,2] + cam [1,7,7] = (w_amd - w_normal)·layer4), export.py (--dummy works, parity PASS). out/model.onnx is a stand-in.
- web/ (Next 16.4.3, Tailwind 4, pnpm): scripts/prepare-assets.mjs (copies ORT to public/ort, model to public/model, sha256 verify), model_manifest.json (dev, no sha yet),
  src/lib/{infer,preprocess,cam,quality}.ts, globals.css design system (paper/mist/sage/teal, Fraunces + Inter), layout + Chrome.tsx (disclaimer bar, header, footer), RetinaArt.tsx, app/page.tsx (home), app/screen/page.tsx.
- ORT is loaded via `import(/* webpackIgnore: true */ "/ort/ort.wasm.min.mjs")`, numThreads=1.

## Next (Lead)
1. src/components/ScreenTool.tsx ('use client'): dropzone + sample gallery (public/samples/samples.json, empty until RFMiD), quality warnings, ResultCard (probability bar, "flagged for review" / "not flagged", threshold), HeatmapViewer (opacity slider + side-by-side).
2. app/model-card/page.tsx (reads src/data/model_card.json, "pending training" state), app/about/page.tsx (poster story, credits: Abhishek Santhoshkumar Jha, Dr. Mimoza Dimodugno, dataset attributions).
3. next.config.ts Cache-Control headers for /model/* and /ort/*; `pnpm build && pnpm start` and test inference with the stand-in model.
4. Then Track A: prep.py (pHash dedupe) -> train.py -> evaluate.py -> export real model.

## Blocked on user
- Create the GitHub repo: `gh repo create armandoolizamaa/amd-screening --public --source=. --remote=origin --push` (classifier blocked Lead). Then do the Vercel import, root `web/`.
- Downloads: AMDNet23 (Kaggle orvile/macular-degeneration-disease-dataset) -> data/raw/amdnet23/. RFMiD (IEEE DataPort) -> data/raw/rfmid/. Check the RFMiD license.
- Location of the poster's trained weights (optional, private comparison only).
- Optional: move .poster/ (HYAMD images) out of the repo folder.
- "Macula" is a placeholder brand name, so confirm or rename it.
