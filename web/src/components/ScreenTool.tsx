"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadModel, predict, THRESHOLD, type Prediction } from "@/lib/infer";
import { loadBitmap, prepare } from "@/lib/preprocess";
import { checkQuality, ISSUE_TEXT, type Quality } from "@/lib/quality";
import { renderHeatmap } from "@/lib/cam";

type Sample = { src: string; label: string; credit?: string };
type Result = { pred: Prediction; quality: Quality; display: HTMLCanvasElement; heat: HTMLCanvasElement };
type Status =
  | { kind: "idle" }
  | { kind: "loading-model"; progress: number }
  | { kind: "running" }
  | { kind: "error"; message: string }
  | { kind: "done"; result: Result };

function CanvasView({ canvas, className }: { canvas: HTMLCanvasElement; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.width = canvas.width;
    el.height = canvas.height;
    el.getContext("2d")!.drawImage(canvas, 0, 0);
  }, [canvas]);
  return <canvas ref={ref} className={className} />;
}

function ResultCard({ pred }: { pred: Prediction }) {
  const pct = Math.round(pred.probability * 100);
  return (
    <div className="card p-6">
      <p className="eyebrow">Result</p>
      <h2 className="mt-2 text-2xl font-medium">
        {pred.flagged ? "Flagged for review" : "Not flagged"}
      </h2>
      <p className="mt-2 text-sm text-muted">
        {pred.flagged
          ? "The model sees patterns it associates with AMD. This is not a diagnosis; an eye-care professional should look at the photo."
          : "The model did not see enough AMD-like patterns to flag this photo. That does not rule out disease."}
      </p>
      <div className="mt-5">
        <div className="flex justify-between text-xs text-muted">
          <span>Model score for AMD</span>
          <span>{pct}%</span>
        </div>
        <div className="relative mt-1 h-3 rounded-full bg-mist" role="img" aria-label={`Model score ${pct} percent`}>
          <div
            className={`h-3 rounded-full ${pred.flagged ? "bg-coral" : "bg-teal"}`}
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute -top-1 h-5 w-0.5 bg-ink"
            style={{ left: `${THRESHOLD * 100}%` }}
            title={`Flag threshold ${THRESHOLD}`}
          />
        </div>
        <p className="mt-1 text-xs text-muted">
          Flag threshold: {Math.round(THRESHOLD * 100)}%. Ran in {Math.round(pred.ms)} ms in your browser.
        </p>
      </div>
    </div>
  );
}

function HeatmapViewer({ display, heat }: { display: HTMLCanvasElement; heat: HTMLCanvasElement }) {
  const [opacity, setOpacity] = useState(0.8);
  const [side, setSide] = useState(false);
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between">
        <p className="eyebrow">Where the model looked</p>
        <label className="flex items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={side} onChange={(e) => setSide(e.target.checked)} />
          Side by side
        </label>
      </div>
      {side ? (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <CanvasView canvas={display} className="w-full rounded-xl" />
          <div className="relative">
            <CanvasView canvas={display} className="w-full rounded-xl" />
            <CanvasView canvas={heat} className="absolute inset-0 w-full rounded-xl" />
          </div>
        </div>
      ) : (
        <div className="relative mt-4">
          <CanvasView canvas={display} className="w-full rounded-xl" />
          <div className="absolute inset-0" style={{ opacity }}>
            <CanvasView canvas={heat} className="w-full rounded-xl" />
          </div>
        </div>
      )}
      <label className="mt-4 flex items-center gap-3 text-xs text-muted">
        Heatmap
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))}
          className="flex-1"
          aria-label="Heatmap opacity"
        />
      </label>
      <p className="mt-3 text-xs text-muted">
        Warmer areas pushed the score toward AMD. The map is coarse (7×7) and shows model attention, not lesions.
      </p>
    </div>
  );
}

export function ScreenTool() {
  const [status, setStatus] = useState<Status>({ kind: "idle" });
  const [samples, setSamples] = useState<Sample[]>([]);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const runId = useRef(0);

  useEffect(() => {
    fetch("/samples/samples.json")
      .then((r) => (r.ok ? r.json() : []))
      .then((s: Sample[]) => setSamples(Array.isArray(s) ? s : []))
      .catch(() => setSamples([]));
  }, []);

  const run = useCallback(async (src: Blob | string) => {
    const id = ++runId.current;
    try {
      setStatus({ kind: "loading-model", progress: 0 });
      const bmp = await loadBitmap(src);
      const prep = prepare(bmp);
      bmp.close();
      await loadModel((progress) => {
        if (id === runId.current) setStatus({ kind: "loading-model", progress });
      });
      if (id !== runId.current) return;
      setStatus({ kind: "running" });
      const pred = await predict(prep.tensor);
      const quality = checkQuality(prep.pixels224, prep.sourceSize);
      const heat = renderHeatmap(pred.cam, pred.camSize, prep.display);
      if (id === runId.current) setStatus({ kind: "done", result: { pred, quality, display: prep.display, heat } });
    } catch (err) {
      if (id !== runId.current) return;
      const m = err instanceof Error ? err.message : "";
      setStatus({
        kind: "error",
        message:
          m === "model-unavailable"
            ? "The model file is not available yet. Try again later."
            : "Could not read that image. Try a JPEG or PNG fundus photo.",
      });
    }
  }, []);

  const onFiles = (files: FileList | null) => {
    const f = files?.[0];
    if (f) void run(f);
  };

  return (
    <div className="mt-8 pb-16">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          onFiles(e.dataTransfer.files);
        }}
        className={`card flex flex-col items-center gap-3 border-dashed p-10 text-center ${drag ? "bg-mist" : ""}`}
      >
        <p className="font-display text-xl">Drop a fundus photo here</p>
        <p className="text-sm text-muted">JPEG or PNG. Processed locally; nothing leaves your device.</p>
        <button type="button" className="btn btn-primary" onClick={() => inputRef.current?.click()}>
          Choose a file
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {samples.length > 0 && (
        <div className="mt-6">
          <p className="eyebrow">Or try a sample</p>
          <div className="mt-3 flex flex-wrap gap-3">
            {samples.map((s) => (
              <button
                key={s.src}
                type="button"
                onClick={() => void run(s.src)}
                className="card overflow-hidden text-left"
                title={s.credit}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={s.src} alt={s.label} className="h-24 w-24 object-cover" />
                <span className="block px-2 py-1 text-xs">{s.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-8" aria-live="polite">
        {status.kind === "loading-model" && (
          <p className="text-sm text-muted">
            Loading model{status.progress > 0 ? ` (${Math.round(status.progress * 100)}%)` : ""}…
          </p>
        )}
        {status.kind === "running" && <p className="text-sm text-muted">Analyzing…</p>}
        {status.kind === "error" && (
          <p className="card bg-coral-soft p-4 text-sm text-coral" role="alert">
            {status.message}
          </p>
        )}
        {status.kind === "done" && (
          <div className="grid gap-6 md:grid-cols-2">
            <div className="flex flex-col gap-6">
              {!status.result.quality.ok && (
                <div className="card bg-amber-soft p-4 text-sm">
                  <p className="font-semibold">Check this image</p>
                  <ul className="mt-1 list-disc pl-5">
                    {status.result.quality.issues.map((i) => (
                      <li key={i}>{ISSUE_TEXT[i]}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">The result below may be unreliable.</p>
                </div>
              )}
              <ResultCard pred={status.result.pred} />
            </div>
            <HeatmapViewer display={status.result.display} heat={status.result.heat} />
          </div>
        )}
      </div>
    </div>
  );
}
