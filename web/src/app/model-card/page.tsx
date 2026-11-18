import type { Metadata } from "next";
import card from "../../data/model_card.json";

export const metadata: Metadata = { title: "Model card" };

type Result = {
  test_set: string; is_external: boolean; n: number; n_pos: number;
  auroc: number; auroc_lo: number; auroc_hi: number;
  sensitivity: number; sens_lo: number; sens_hi: number;
  specificity: number; spec_lo: number; spec_hi: number;
  brier: number; ece: number; ece_raw: number | null; note: string | null;
};
type Model = {
  version: string; architecture: string; sha256: string; release_url: string; threshold: number;
  trained_at: string; calib_a: number | null; calib_b: number | null; other_disease_false_flag_rate: number | null;
} | null;

const LABELS: Record<string, string> = {
  external_rfmid_pos_vs_healthy: "RFMiD (external): AMD vs healthy",
  external_rfmid_pos_vs_all_nonAMD: "RFMiD (external): AMD vs all non-AMD",
  internal_test_odir: "Internal test: ODIR only",
  internal_test_amdnet23: "Internal test: AMDNet23 only",
  internal_test: "Internal test: pooled (inflated)",
};
const ORDER = Object.keys(LABELS);
const pct = (x: number) => `${Math.round(x * 100)}%`;
const ci = (v: number, lo: number, hi: number) => `${v.toFixed(3)} (${lo.toFixed(3)}–${hi.toFixed(3)})`;

export default function ModelCardPage() {
  const model = card.model as unknown as Model;
  const results = (card.results as unknown as Result[]).slice().sort((a, b) => ORDER.indexOf(a.test_set) - ORDER.indexOf(b.test_set));
  const rows: [string, string][] = [
    ["Architecture", "ResNet-18 (ImageNet init), global average pooling + 2-class head"],
    ["Input", "Color fundus photo, center-cropped square, 224×224"],
    ["Output", "Model score for AMD vs. normal, plus a 7×7 class-activation map"],
    ["Runs", "In your browser via onnxruntime-web (WASM). No upload."],
    ["Version", model ? `${model.version} (trained ${String(model.trained_at).slice(0, 10)})` : "No evaluated model yet"],
    ["Flag threshold", model ? `${Math.round(model.threshold * 100)}%, chosen on validation data only` : "n/a"],
    ["Training data", "ODIR-5K and AMDNet23 (patient/duplicate-grouped splits). RFMiD is held out as an external test set."],
  ];
  return (
    <section className="mx-auto max-w-3xl px-6 pt-12 pb-16">
      <p className="eyebrow">Model card</p>
      <h1 className="mt-3 text-4xl font-medium">What this model is, and is not</h1>
      <dl className="card mt-8 divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="grid gap-1 p-4 sm:grid-cols-[10rem_1fr]">
            <dt className="text-sm font-semibold">{k}</dt>
            <dd className="text-sm text-muted">{v}</dd>
          </div>
        ))}
      </dl>

      <h2 className="mt-10 text-2xl font-medium">Performance</h2>
      {results.length === 0 ? (
        <p className="mt-2 text-sm text-muted">Results are not available in this build.</p>
      ) : (
        <>
          <p className="mt-2 text-sm text-muted">
            The headline is the first row: images from a dataset the model never saw in training, threshold selection or
            calibration. Ranges are 95% bootstrap confidence intervals. AUROC: 0.5 is chance, 1.0 is perfect.
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-muted">
                <tr><th className="py-2 pr-3">Test set</th><th className="pr-3">n (AMD)</th><th className="pr-3">AUROC</th><th className="pr-3">Sensitivity</th><th>Specificity</th></tr>
              </thead>
              <tbody className="divide-y divide-line">
                {results.map((r) => (
                  <tr key={r.test_set} className={r.is_external ? "font-medium" : ""}>
                    <td className="py-2 pr-3">{LABELS[r.test_set] ?? r.test_set}</td>
                    <td className="pr-3">{r.n} ({r.n_pos})</td>
                    <td className="pr-3">{ci(r.auroc, r.auroc_lo, r.auroc_hi)}</td>
                    <td className="pr-3">{pct(r.sensitivity)}</td>
                    <td>{pct(r.specificity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {model?.other_disease_false_flag_rate != null && (
            <p className="mt-3 text-sm text-muted">
              About {pct(model.other_disease_false_flag_rate)} of external images showing other eye diseases are wrongly
              flagged as AMD.
            </p>
          )}
          <h3 className="mt-6 text-lg font-medium">Calibration</h3>
          <p className="mt-1 text-sm text-muted">
            The displayed percentage is a <em>model score</em>, adjusted (Platt scaling) on held-out validation data so
            that it tracks observed frequency there. It is not a personal risk and does not transfer to other
            populations, where AMD prevalence differs. Calibration error (ECE) before → after:{" "}
            {results.filter((r) => r.ece_raw != null).slice(0, 3).map((r) => `${(LABELS[r.test_set] ?? r.test_set).split(":")[0]} ${r.ece_raw!.toFixed(2)}→${r.ece.toFixed(2)}`).join("; ")}.
          </p>
        </>
      )}

      <h2 className="mt-10 text-2xl font-medium">Limitations</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Trained on a small number of public datasets; it may not generalize to other cameras or populations.</li>
        <li>AMD makes up very different shares of the datasets (about 26% of AMDNet23 vs about 4% of ODIR), so the pooled internal score is inflated; judge it by the external row.</li>
        <li>Duplicate images across datasets were removed with an image-hash and vessel-pattern check, which may miss re-cropped copies.</li>
        <li>It has no out-of-distribution detector. Non-fundus images can still get a confident score.</li>
        <li>The heatmap is coarse and shows model attention, not lesion locations.</li>
        <li>This is an educational demo and not a medical device. It does not diagnose.</li>
      </ul>

      <h2 className="mt-10 text-2xl font-medium">Data and credits</h2>
      <p className="mt-2 text-sm text-muted">
        RFMiD: Pachade et al. (2021), <em>Data</em> 6(2), 14, CC BY 4.0. ODIR-5K and AMDNet23 are used for training; see the
        project repository for full references. Restricted datasets (HYAMD) are not used.
      </p>
    </section>
  );
}
