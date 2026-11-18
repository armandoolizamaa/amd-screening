import type { Metadata } from "next";
import { ScreenTool } from "@/components/ScreenTool";

export const metadata: Metadata = { title: "Try it" };

export default function ScreenPage() {
  return (
    <section className="mx-auto max-w-6xl px-6 pt-12">
      <p className="eyebrow">Screening demo</p>
      <h1 className="mt-3 text-4xl font-medium">Look at a retinal photo</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Use a color fundus photograph centered on the macula. Your image stays in this browser tab, and nothing is
        uploaded.
      </p>
      <ScreenTool />
    </section>
  );
}
