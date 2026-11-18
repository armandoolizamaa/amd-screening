// Render a 7x7 CAM as a smooth heatmap over the square-cropped fundus image.

// Calm palette: transparent sage -> amber -> coral as evidence increases.
const STOPS: [number, [number, number, number]][] = [
  [0.0, [94, 170, 150]],
  [0.5, [240, 196, 92]],
  [1.0, [226, 94, 74]],
];

function color(v: number): [number, number, number] {
  for (let i = 1; i < STOPS.length; i++) {
    const [p1, c1] = STOPS[i];
    const [p0, c0] = STOPS[i - 1];
    if (v <= p1) {
      const t = (v - p0) / (p1 - p0);
      return [0, 1, 2].map((k) => Math.round(c0[k] + t * (c1[k] - c0[k]))) as [number, number, number];
    }
  }
  return STOPS[STOPS.length - 1][1];
}

/** ReLU + max-normalize. Returns all zeros if there is no positive evidence. */
export function normalizeCam(cam: Float32Array): Float32Array {
  const out = new Float32Array(cam.length);
  let max = 0;
  for (let i = 0; i < cam.length; i++) max = Math.max(max, cam[i]);
  if (max <= 0) return out;
  for (let i = 0; i < cam.length; i++) out[i] = Math.max(cam[i], 0) / max;
  return out;
}

/** Bilinear-upsampled heatmap canvas (RGBA), masked to the retina (dark border pixels stay clear). */
export function renderHeatmap(cam: Float32Array, camSize: number, base: HTMLCanvasElement): HTMLCanvasElement {
  const n = normalizeCam(cam);
  const W = base.width;
  const H = base.height;
  const basePx = base.getContext("2d")!.getImageData(0, 0, W, H).data;
  const out = document.createElement("canvas");
  out.width = W;
  out.height = H;
  const ctx = out.getContext("2d")!;
  const img = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    // Sample cell centers: pixel center maps to cam coordinate (y+0.5)/H*camSize - 0.5
    const gy = Math.min(Math.max(((y + 0.5) / H) * camSize - 0.5, 0), camSize - 1);
    const y0 = Math.floor(gy);
    const y1 = Math.min(y0 + 1, camSize - 1);
    const ty = gy - y0;
    for (let x = 0; x < W; x++) {
      const gx = Math.min(Math.max(((x + 0.5) / W) * camSize - 0.5, 0), camSize - 1);
      const x0 = Math.floor(gx);
      const x1 = Math.min(x0 + 1, camSize - 1);
      const tx = gx - x0;
      const v =
        n[y0 * camSize + x0] * (1 - tx) * (1 - ty) +
        n[y0 * camSize + x1] * tx * (1 - ty) +
        n[y1 * camSize + x0] * (1 - tx) * ty +
        n[y1 * camSize + x1] * tx * ty;
      const i = (y * W + x) * 4;
      const lum = basePx[i] * 0.299 + basePx[i + 1] * 0.587 + basePx[i + 2] * 0.114;
      const mask = lum < 12 ? 0 : 1; // outside the retina disk
      const [r, g, b] = color(v);
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = Math.round(255 * Math.pow(v, 1.2) * 0.85 * mask);
    }
  }
  ctx.putImageData(img, 0, 0);
  return out;
}
