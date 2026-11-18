// Runs before `next dev` / `next build`.
// 1. Copies the onnxruntime-web wasm runtime into public/ort/ (served same-origin, never bundled).
// 2. Puts the model into public/model/: local training output if its sha matches, else downloads
//    the GitHub Release asset named in model_manifest.json and verifies sha256 (fails the build on mismatch).
//    Release assets have no CORS headers, so the browser must never fetch them directly.
import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const pub = path.join(root, "public");
const ORT_FILES = ["ort.wasm.min.mjs", "ort-wasm-simd-threaded.mjs", "ort-wasm-simd-threaded.wasm"];

const exists = (p) => access(p).then(() => true, () => false);
const sha256 = (buf) => createHash("sha256").update(buf).digest("hex");

async function copyOrt() {
  const src = path.join(root, "node_modules", "onnxruntime-web", "dist");
  await mkdir(path.join(pub, "ort"), { recursive: true });
  for (const f of ORT_FILES) await copyFile(path.join(src, f), path.join(pub, "ort", f));
  console.log(`[assets] ort runtime -> public/ort (${ORT_FILES.length} files)`);
}

async function download(url, attempts = 3) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(url, { redirect: "follow" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      console.warn(`[assets] download attempt ${i} failed: ${err.message}`);
      if (i === attempts) throw err;
      await new Promise((r) => setTimeout(r, 1000 * i));
    }
  }
}

async function prepareModel() {
  const m = JSON.parse(await readFile(path.join(root, "model_manifest.json"), "utf8"));
  const dest = path.join(pub, "model", m.file);
  const local = path.join(root, "..", "training", "out", m.file);
  await mkdir(path.dirname(dest), { recursive: true });

  if (!m.sha256) {
    // Dev stage: no released model yet. Use the local export if present.
    if (await exists(local)) {
      await copyFile(local, dest);
      console.log(`[assets] dev model copied from training/out (unverified, manifest has no sha256)`);
    } else {
      console.warn("[assets] no model yet: the UI will show 'model unavailable'");
    }
    return;
  }
  if ((await exists(dest)) && sha256(await readFile(dest)) === m.sha256) {
    console.log("[assets] model already present, sha256 ok");
    return;
  }
  let buf = (await exists(local)) ? await readFile(local) : null;
  if (!buf || sha256(buf) !== m.sha256) {
    if (!m.url) throw new Error("manifest has sha256 but no url");
    console.log(`[assets] downloading ${m.url}`);
    buf = await download(m.url);
  }
  const got = sha256(buf);
  if (got !== m.sha256) throw new Error(`model sha256 mismatch: expected ${m.sha256}, got ${got}`);
  await writeFile(dest, buf);
  console.log(`[assets] model ok (${(buf.length / 1e6).toFixed(1)} MB, sha256 verified)`);
}

await copyOrt();
await prepareModel();
