import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { SiteFooter, SiteHeader } from "@/components/Chrome";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], axes: ["SOFT", "opsz"] });
const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

export const metadata: Metadata = {
  title: { default: "Macula · AMD screening demo", template: "%s · Macula" },
  description:
    "An educational demo: a ResNet-18 looks for signs of age-related macular degeneration in retinal photos, entirely in your browser, and shows where it looked.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
