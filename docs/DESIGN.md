# AMD Screening Demo: Design (living doc, DRAFT for review)

> Status: **brainstorm / review**. Nothing is built or run yet.
> Origin: poster *"CNNs (ResNet-18) for Predicting AMD Using Fundus Images"* (EAI 6080, Roux Institute).
> Framing: **research/educational demo, not a medical device, not for diagnosis.**

## 1. What the poster established
| Item | Poster |
|---|---|
| Model | ResNet-18 (ImageNet), binary Normal vs AMD |
| Data | HYAMD (PhysioNet) + AMDNet23 for generalization |
| Training | 224 px, 80/20 **image-level** split, weighted CE (1.0/1.5), 5 epochs, Adam |
| Results | 83% acc, 80% AMD recall, 89% Normal precision, F1 0.76 |
| Interpretability | Grad-CAM |

## 2. Findings from research (must address)
1. **Patient leakage.** HYAMD averages ~4.8 images per patient across both eyes. An image-level split puts the same patient in train and test, so the true performance is likely lower. Fix: patient-grouped splits.
2. **Dataset numbers.** PhysioNet lists HYAMD v1.0.0 as **1,560** images (1,028 / 108 early / 424 late), not 2,122. The confusion matrix sums to 425, but the text says 424.
3. **Label definition.** Was "early AMD" (class 1) merged into AMD? The dataset authors use 0 vs 2.
4. **Licensing.** HYAMD is under a *restricted* DUA: no redistribution, no public display, no cloud AI APIs. It's unclear whether weights trained on it may be published.
5. **Context from the literature.** HYAMD is the hardest external benchmark (foundation-model AUROC ~0.78-0.81). Small ImageNet CNNs match retina foundation models, so ResNet-18 is a defensible choice.

## 3. Proposed architecture
```
 [Mac M5 Max: training lab]  PyTorch (MPS) + MLflow (local)
   patient-grouped CV -> calibrate -> pick threshold -> export ONNX (logits + layer4 features)
          |  model.onnx + model_card.json  ->  HF Hub / GitHub Release
          v
 [Render free: inference API]  FastAPI + onnxruntime + numpy CAM   (~24 MB, fits 512 MB)
   quality/OOD gate -> calibrated probability -> CAM heatmap; image processed in memory only
          |
 [Neon: metadata only]  model_versions, predictions (no images), feedback
          ^
 [Vercel: Next.js]  upload (client resize + EXIF strip) -> result + heatmap overlay
                    model card (ROC/PR, calibration, CIs) -> experiments comparison
```
**CAM trick:** ResNet ends in GAP + FC, so Grad-CAM on layer4 equals classic CAM up to scale. That lets us compute it in numpy with no gradients and no PyTorch on the server.

## 4. Database (Neon), draft
- `model_versions`: name, backbone, input size, threshold, temperature, metrics JSON (with CIs), data card, artifact URL/sha
- `predictions`: model_version, calibrated prob, label, quality score, latency ms, created_at (**no image, no PHI**)
- `feedback` (optional): prediction id, user-reported label, note
- `experiments`: run summaries synced from MLflow for the comparison page

## 5. Frontend pages, draft
1. **Screen:** drag-drop upload, quality check, probability gauge, heatmap with opacity slider, disclaimer.
2. **Model card:** metrics with 95% CIs, ROC/PR curves, calibration plot, confusion matrix at the chosen threshold, datasets, limitations.
3. **Experiments:** poster baseline vs improvements (patient split, resolution, calibration, backbones).
4. **About:** poster, methods, credits (Abhishek Santhoshkumar Jha, Dr. Mimoza Dimodugno).

## 6. Decisions
- **Goal (2026-10-26): portfolio demo.** Polish, a live deploy, and an honest model card come first. Research-grade rigor (patient-grouped CV, CIs, calibration) stays in, but only as much as the model card needs to be truthful. No paper-level ablations.

- **24 h demo decisions (2026-10-26):**
  - **Inference runs in the browser** (onnxruntime-web + CAM in JS). No Render or Neon for v1. Images never leave the visitor's device.
  - **Data:** train on AMDNet23 Normal+AMD (CC BY 4.0). Evaluate on the RFMiD official test split (ARMD vs normal), excluding any images AMDNet23 copied from RFMiD. Sample images come from RFMiD, with attribution. HYAMD never ships.
  - **Visual style:** clinical, clean, "healing" (calm, soft, trustworthy).
  - **Repo:** a new public repo `armandoolizamaa/amd-screening`.
  - **Poster weights:** the user has them. Used only as a private comparison; never deployed.
  - **Model hosting:** the GitHub Release is the source of truth. GitHub release assets send no CORS headers (tested 2026-10-26), so the Vercel build fetches the model into `public/` and checks its sha256. Browsers download it on first visit and cache it.
  - **Pages:** Hero, Screen (upload + samples, quality check, probability, heatmap), Model card, About. The Experiments page waits for v1.1.

## 7. Open decisions
See the brainstorm discussion: goal, data strategy for the public model, orchestration meaning, compute, repo.
