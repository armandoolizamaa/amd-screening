import type { Metadata } from "next";

export const metadata: Metadata = { title: "About" };

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-3xl px-6 pt-12 pb-16">
      <p className="eyebrow">About</p>
      <h1 className="mt-3 text-4xl font-medium">From a class poster to a live demo</h1>
      <p className="mt-4 text-muted">
        This project started as a poster for EAI 6080 at the Roux Institute, Northeastern University: a ResNet-18
        classifier for age-related macular degeneration (AMD) in fundus photographs, with Grad-CAM heatmaps. This site
        rebuilds it as an in-browser demo with a stricter evaluation: patient-grouped splits, external testing, and
        scores calibrated on held-out validation data.
      </p>

      <h2 className="mt-10 text-2xl font-medium">Credits</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>Abhishek Santhoshkumar Jha, poster co-author</li>
        <li>Dr. Mimoza Dimodugno, clinical guidance</li>
      </ul>

      <h2 className="mt-10 text-2xl font-medium">Data</h2>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted">
        <li>AMDNet23, CC BY 4.0 (Kaggle: orvile/macular-degeneration-disease-dataset)</li>
        <li>RFMiD, Retinal Fundus Multi-disease Image Dataset (IEEE DataPort, DOI 10.21227/s3g7-st65). License to be confirmed.</li>
        <li>The original poster also used HYAMD (PhysioNet). Its license forbids redistribution, so no HYAMD images appear here.</li>
      </ul>
    </section>
  );
}
