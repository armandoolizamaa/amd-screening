// In-browser inference with onnxruntime-web. The runtime is loaded at runtime from /ort/ (copied by
// scripts/prepare-assets.mjs) and never bundled. Single-threaded wasm: no COOP/COEP headers needed.
import manifest from "../../model_manifest.json";

type Ort = typeof import("onnxruntime-web");
type Session = import("onnxruntime-web").InferenceSession;

export type Prediction = {
  probability: number; // model score: Platt-calibrated on the validation mix, NOT a population risk
  flagged: boolean; // probability >= threshold
  cam: Float32Array; // 7x7 raw class-activation map (AMD-vs-normal evidence)
  camSize: number;
  ms: number;
};

export const THRESHOLD: number = manifest.threshold;
const MODEL_URL = `/model/${manifest.file}?v=${(manifest.sha256 ?? manifest.version).slice(0, 12)}`;

let ortPromise: Promise<Ort> | null = null;
let sessionPromise: Promise<Session> | null = null;

function loadOrt(): Promise<Ort> {
  ortPromise ??= import(/* webpackIgnore: true */ "/ort/ort.wasm.min.mjs" as string).then((mod: Ort) => {
    mod.env.wasm.wasmPaths = "/ort/";
    mod.env.wasm.numThreads = 1;
    return mod;
  });
  return ortPromise;
}

async function fetchWithProgress(url: string, onProgress?: (f: number) => void): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(res.status === 404 ? "model-unavailable" : `HTTP ${res.status}`);
  const total = Number(res.headers.get("content-length")) || manifest.bytes || 0;
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let got = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    got += value.length;
    if (total) onProgress?.(Math.min(got / total, 1));
  }
  const out = new Uint8Array(got);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  onProgress?.(1);
  return out;
}

export function loadModel(onProgress?: (f: number) => void): Promise<Session> {
  sessionPromise ??= (async () => {
    const [ort, bytes] = await Promise.all([loadOrt(), fetchWithProgress(MODEL_URL, onProgress)]);
    return ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  })().catch((err) => {
    sessionPromise = null; // allow retry
    throw err;
  });
  return sessionPromise;
}

export async function predict(tensor: Float32Array): Promise<Prediction> {
  const [ort, session] = await Promise.all([loadOrt(), loadModel()]);
  const t0 = performance.now();
  const size = manifest.input.size;
  const out = await session.run({ image: new ort.Tensor("float32", tensor, [1, 3, size, size]) });
  const logits = out.logits.data as Float32Array;
  const cal = (manifest as { calibration?: { a: number; b: number } }).calibration ?? { a: 1, b: 0 };
  const margin = logits[1] - logits[0]; // AMD logit minus normal logit
  const probability = 1 / (1 + Math.exp(-(cal.a * margin + cal.b))); // Platt scaling fitted on validation
  return {
    probability,
    flagged: probability >= THRESHOLD,
    cam: out.cam.data as Float32Array,
    camSize: out.cam.dims[1],
    ms: performance.now() - t0,
  };
}
