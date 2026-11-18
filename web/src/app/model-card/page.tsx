import type { Metadata } from "next";

export const metadata: Metadata = { title: "Model card" };

const rows: [string, string][] = [
  ["Architecture", "ResNet-18 (ImageNet init), global average pooling + 2-class head"],
  ["Input", "Color fundus photo, center-cropped square, 224×224"],
  ["Output", "Score for AMD vs. normal, plus a 7×7 class-activation map"],
  ["Runs", "In your browser via onnxruntime-web (WASM). No upload."],
  ["Status", "Pending training. The current model is a stand-in and its scores are meaningless."],
];

export default function ModelCardPage() {
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
      <p className="mt-2 text-sm text-muted">
        Not reported yet. Numbers will appear here after training and evaluation on a patient-grouped split and an
        external test set, with confidence intervals and calibration.
      </p>

      <h2 className="mt-10 text-2xl font-medium">Limitations</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Trained on a small number of public datasets; it may not generalize to other cameras or populations.</li>
        <li>It has no out-of-distribution detector. Non-fundus images can still get a confident score.</li>
        <li>The heatmap is coarse and shows model attention, not lesion locations.</li>
        <li>This is an educational demo and not a medical device. It does not diagnose.</li>
      </ul>
    </section>
  );
}
