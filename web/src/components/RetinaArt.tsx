// Abstract, illustrative retina (not a real patient image).
export function RetinaArt({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 400 400" className={className} role="img" aria-label="Illustration of a retina">
      <defs>
        <radialGradient id="fundus" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f3c9a8" />
          <stop offset="55%" stopColor="#e3a27f" />
          <stop offset="88%" stopColor="#c97a5e" />
          <stop offset="100%" stopColor="#a65f4a" />
        </radialGradient>
        <radialGradient id="disc" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff4d9" />
          <stop offset="100%" stopColor="#f2d29b" />
        </radialGradient>
        <radialGradient id="macula" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#9e5a45" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#9e5a45" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="glow" cx="50%" cy="50%" r="50%">
          <stop offset="60%" stopColor="#eaf3ef" stopOpacity="0" />
          <stop offset="100%" stopColor="#9bbfae" stopOpacity="0.35" />
        </radialGradient>
      </defs>
      <circle cx="200" cy="200" r="198" fill="url(#glow)" />
      <circle cx="200" cy="200" r="160" fill="url(#fundus)" />
      <g fill="none" stroke="#a24b3a" strokeLinecap="round" opacity="0.75">
        <path d="M262 186c-40-40-95-62-150-40" strokeWidth="3.2" />
        <path d="M262 192c-38 44-96 70-152 50" strokeWidth="3" />
        <path d="M262 182c10-50 0-90-22-118" strokeWidth="2.6" />
        <path d="M262 198c14 46 6 86-20 112" strokeWidth="2.6" />
        <path d="M188 150c-24-6-46 0-66 18" strokeWidth="1.6" />
        <path d="M186 238c-26 8-48 2-68-14" strokeWidth="1.6" />
        <path d="M242 82c-26 4-46 18-60 38" strokeWidth="1.4" />
        <path d="M240 316c-28-6-46-20-58-40" strokeWidth="1.4" />
      </g>
      <circle cx="262" cy="190" r="22" fill="url(#disc)" />
      <circle cx="168" cy="200" r="34" fill="url(#macula)" />
      <circle cx="168" cy="200" r="5" fill="#8a4a39" opacity="0.6" />
    </svg>
  );
}
