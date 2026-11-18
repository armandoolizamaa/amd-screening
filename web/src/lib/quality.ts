// Cheap heuristics only. This is NOT an out-of-distribution detector.

export type QualityIssue = "too-small" | "too-dark" | "too-bright" | "blurry" | "not-fundus";
export type Quality = { ok: boolean; issues: QualityIssue[] };

export const ISSUE_TEXT: Record<QualityIssue, string> = {
  "too-small": "The image is small (under 256 px), so fine detail may be lost.",
  "too-dark": "The image looks very dark.",
  "too-bright": "The image looks overexposed.",
  blurry: "The image looks blurry.",
  "not-fundus": "This may not be a retinal fundus photo. The model only knows fundus images.",
};

export function checkQuality(px: ImageData, source: { width: number; height: number }): Quality {
  const { data, width: W, height: H } = px;
  const issues: QualityIssue[] = [];
  if (Math.min(source.width, source.height) < 256) issues.push("too-small");

  const gray = new Float32Array(W * H);
  let r = 0, g = 0, b = 0, inside = 0, sum = 0, cornerDark = 0, corners = 0;
  const cx = W / 2, cy = H / 2, rad = W * 0.35;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      const l = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      gray[y * W + x] = l;
      const d = Math.hypot(x - cx, y - cy);
      if (d < rad) {
        r += data[i]; g += data[i + 1]; b += data[i + 2]; sum += l; inside++;
      } else if (d > W * 0.68) {
        corners++;
        if (l < 30) cornerDark++;
      }
    }
  }
  const mean = sum / inside;
  if (mean < 35) issues.push("too-dark");
  if (mean > 215) issues.push("too-bright");

  // Laplacian variance on the central region (blur)
  let lapSum = 0, lapSq = 0, n = 0;
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      if (Math.hypot(x - cx, y - cy) > rad) continue;
      const k = y * W + x;
      const v = 4 * gray[k] - gray[k - 1] - gray[k + 1] - gray[k - W] - gray[k + W];
      lapSum += v; lapSq += v * v; n++;
    }
  }
  const lapVar = lapSq / n - (lapSum / n) ** 2;
  if (lapVar < 4) issues.push("blurry");

  // Fundus look: red-dominant disk and mostly dark corners
  const redDominant = r > g && g >= b * 0.9;
  const darkCorners = corners > 0 && cornerDark / corners > 0.5;
  if (!(redDominant && darkCorners)) issues.push("not-fundus");

  return { ok: issues.length === 0, issues };
}
