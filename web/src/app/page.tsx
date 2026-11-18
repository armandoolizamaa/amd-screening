import Link from "next/link";
import { RetinaArt } from "@/components/RetinaArt";

const STEPS = [
  {
    n: "01",
    title: "Add a retinal photo",
    body: "Drop in a color fundus image or pick one of the open-license samples.",
  },
  {
    n: "02",
    title: "The model runs on your device",
    body: "A ResNet-18 runs entirely in your browser with WebAssembly. Your image is never uploaded.",
  },
  {
    n: "03",
    title: "See where it looked",
    body: "You get a model score (not a diagnosis or a personal risk) plus a heatmap of the regions that pushed the model toward AMD.",
  },
];

export default function Home() {
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute -top-40 right-[-10%] h-[36rem] w-[36rem] rounded-full bg-mist blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-6 pt-16 pb-20 md:grid-cols-[1.1fr_1fr] md:pt-24">
          <div>
            <p className="eyebrow">Educational research demo</p>
            <h1 className="mt-4 text-4xl leading-[1.08] font-medium sm:text-5xl md:text-6xl">
              A gentle second look <span className="text-teal italic">at the retina.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
              Macula checks a retinal photo for patterns linked to age-related macular degeneration (AMD), a leading cause
              of vision loss in older adults. It then shows you where it looked. It&apos;s built to be honest about what
              it can&apos;t do.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/screen" className="btn btn-primary">
                Try the demo <span aria-hidden>→</span>
              </Link>
              <Link href="/model-card" className="btn btn-ghost">
                Read the model card
              </Link>
            </div>
            <p className="mt-6 flex items-center gap-2 text-sm text-muted">
              <span className="inline-block h-2 w-2 rounded-full bg-teal" />
              Runs on your device. Nothing is uploaded or stored.
            </p>
          </div>
          <div className="relative mx-auto w-full max-w-md">
            <RetinaArt className="breathe w-full drop-shadow-[0_30px_40px_rgba(44,122,110,0.18)]" />
            <div className="card absolute -bottom-4 left-0 px-4 py-3 text-sm sm:-left-6">
              <p className="text-muted">Model</p>
              <p className="font-medium">ResNet-18 · CAM heatmap</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6">
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card p-6">
              <p className="font-display text-sm text-sage">{s.n}</p>
              <h2 className="mt-2 text-xl font-medium">{s.title}</h2>
              <p className="mt-2 leading-relaxed text-muted">{s.body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-20 max-w-6xl px-6">
        <div className="card grid gap-8 overflow-hidden bg-gradient-to-br from-surface to-mist p-8 md:grid-cols-2 md:p-12">
          <div>
            <p className="eyebrow">Honest numbers</p>
            <h2 className="mt-3 text-3xl font-medium">Why this model scores lower than the poster</h2>
          </div>
          <div className="space-y-4 leading-relaxed text-muted">
            <p>
              The original class poster reported 83% accuracy. But its test split put photos of the{" "}
              <em>same patients</em> in both training and testing, which makes scores look better than they are.
            </p>
            <p>
              This version trains on open data and is tested on a separate hospital dataset, with duplicate images
              removed. The numbers are lower, and they&apos;re real.
            </p>
            <Link href="/model-card" className="inline-flex font-medium text-teal hover:text-teal-deep">
              See the full evaluation →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
