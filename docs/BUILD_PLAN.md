# 24 h Build Plan (2026-10-26)

Tracks run in parallel after Block 0: **A** = data/training (Python on the Mac), **B** = web (Next.js, built against a placeholder model).

| Block | Hours | Task | Owner | Done when |
|---|---|---|---|---|
| 0 | 0–1 | Kaggle token + downloads (AMDNet23 `orvile/macular-degeneration-disease-dataset`; RFMiD via IEEE DataPort DOI 10.21227/s3g7-st65) into `data/raw/` | User | Class folders + RFMiD CSVs present |
| 0 | 0–1 | Create GitHub repo, import into Vercel (root `web/`) | User | Empty preview builds |
| 0 | 0–1 | Scaffold `web/` (Next 16) + `training/` venv | Lead | `pnpm build` passes, MPS available |
| A | 1–3 | `prep.py` + `common.py`: index, pHash dedupe vs RFMiD, splits | Lead | `splits.csv`, dedupe count reported |
| A | 3–5 | `train.py`: 5–10 ResNet-18 runs, temperature, threshold | Lead | `calib.json` |
| A | 5–6 | `evaluate.py`: deduped RFMiD test, bootstrap CIs, ROC | Lead | `web/public/model_card.json` |
| A | 6–8 | `export.py`: ONNX (logits + features), parity, fp16/int8 try, sha256 | Lead | Parity PASS, manifest |
| A | 8 | `gh release create v1.0.0` with the model | User | sha256 matches manifest |
| A | 8–9 | (optional, private) poster-weights comparison | Lead | Numbers only, nothing committed |
| B | 1–4 | Design system (soft teal/sage, off-white, serif + sans), layout, Hero, disclaimer | Lead | 4 routes, disclaimer everywhere |
| B | 4–8 | `fetch-model.mjs`, `infer.ts`, `preprocess.ts`, `cam.ts` on a dummy model | Lead | Heatmap renders in the browser |
| B | 8–12 | Screen page: dropzone, samples, quality check, result, heatmap viewer | Lead | Works in Chrome + Safari |
| B | 12–15 | Model card + About | Lead | No placeholder text |
| Int | 14–20 | Python↔browser parity, swap in real model, deploy | Lead + User | Prod URL works on a fresh profile |
| Int | 20–23 | Polish, a11y, README, HYAMD leak scan, e2e screenshots | Lead | Acceptance checklist passes |
| — | 23–24 | Buffer | | |

**Cut order if behind:** poster comparison → WebGPU → fp16/int8 → side-by-side view → calibration/PR plots → 4 samples & short About → 3–5 runs → quality check = size+blur → TS CLAHE (retrain without it). Never cut: dedupe, disclaimer, honest model card.

**Acceptance:** sample and upload both give a probability, verdict and heatmap in production; the sha256 is verified at build; parity passes; `git ls-files` has no HYAMD/poster/.onnx/.pt; model card numbers come from the deduped RFMiD test set with CIs and n; attributions and credits are on About and in the README.
