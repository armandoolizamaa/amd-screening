import Link from "next/link";

const NAV = [
  { href: "/screen", label: "Try it" },
  { href: "/model-card", label: "Model card" },
  { href: "/about", label: "About" },
] as const;

export function DisclaimerBar() {
  return (
    <div className="bg-mist text-teal-deep">
      <p className="mx-auto max-w-6xl px-6 py-2 text-center text-xs sm:text-sm">
        Educational demo, <strong className="font-semibold">not a medical device</strong>. It does not diagnose. See an eye-care professional
        about any concern.
      </p>
    </div>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <svg width="28" height="28" viewBox="0 0 32 32" aria-hidden>
        <circle cx="16" cy="16" r="14" fill="#eaf3ef" stroke="#9bbfae" strokeWidth="1.5" />
        <circle cx="16" cy="16" r="6.5" fill="#2c7a6e" opacity="0.18" />
        <circle cx="16" cy="16" r="3" fill="#2c7a6e" />
        <path d="M5 13c5-3 9-3 11 3M27 19c-5 3-9 3-11-3" fill="none" stroke="#2c7a6e" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span className="font-display text-xl font-medium tracking-tight">Macula</span>
    </span>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/70 bg-paper/85 backdrop-blur">
      <DisclaimerBar />
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4" aria-label="Main">
        <Link href="/" aria-label="Macula home">
          <Logo />
        </Link>
        <ul className="flex items-center gap-1 text-sm sm:gap-2">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link
                href={n.href}
                className={
                  n.href === "/screen"
                    ? "btn btn-primary !px-4 !py-2"
                    : "rounded-full px-3 py-2 text-muted transition-colors hover:bg-mist hover:text-ink"
                }
              >
                {n.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line bg-surface/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm text-muted sm:grid-cols-3">
        <div className="space-y-3">
          <Logo />
          <p>A learning project on retinal image classification. Not for clinical use.</p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-ink">Data</p>
          <p>
            Trained on AMDNet23 (CC BY 4.0). Evaluated on RFMiD (Pachade et al., 2021). The original HYAMD data is never
            shown or shipped.
          </p>
        </div>
        <div className="space-y-2">
          <p className="font-medium text-ink">Privacy</p>
          <p>Images are processed in your browser and never uploaded. Nothing is stored.</p>
        </div>
      </div>
    </footer>
  );
}
