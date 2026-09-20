// Sample handwritten study note image encoded as Base64 SVG Data URL
// Used for instant 1-click testing of handwritten notes upload & diagram preservation

export const RAW_SAMPLE_NOTE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 650" width="850" height="650">
  <defs>
    <!-- Paper texture & patterns -->
    <pattern id="ruled-lines" width="850" height="28" patternUnits="userSpaceOnUse">
      <line x1="0" y1="28" x2="850" y2="28" stroke="#dbeafe" stroke-width="1.2" />
    </pattern>
  </defs>

  <!-- Notebook Page Background -->
  <rect width="850" height="650" fill="#fcfbf7" rx="12" />
  <rect width="850" height="650" fill="url(#ruled-lines)" rx="12" />

  <!-- Red Margin Line -->
  <line x1="85" y1="0" x2="85" y2="650" stroke="#fca5a5" stroke-width="2" />
  <line x1="89" y1="0" x2="89" y2="650" stroke="#fee2e2" stroke-width="1" />

  <!-- Handwritten Text (simulated with handwriting-like styling) -->
  <g font-family="Comic Sans MS, Caveat, Chalkboard, sans-serif" fill="#1e293b">
    <!-- Header -->
    <text x="110" y="52" font-size="22" font-weight="bold" fill="#0f172a" text-decoration="underline">
      Light: Spherical Mirrors - Ray Rules &amp; Image Formation
    </text>
    <text x="700" y="52" font-size="13" fill="#64748b" font-style="italic">Date: 12/04</text>

    <!-- Formula Box -->
    <rect x="110" y="76" width="340" height="46" rx="6" fill="#f1f5f9" stroke="#94a3b8" stroke-dasharray="4 2" />
    <text x="125" y="104" font-size="17" font-weight="bold" fill="#1e3a8a">
      Mirror Formula: 1/f = 1/v + 1/u
    </text>
    <text x="345" y="104" font-size="14" fill="#047857" font-weight="bold">
      m = -v/u
    </text>

    <!-- Ray Rules -->
    <text x="110" y="152" font-size="15" font-weight="bold">Key Ray Rules:</text>
    <text x="110" y="180" font-size="14">• 1. Ray parallel to Principal Axis reflects through Focus (F).</text>
    <text x="110" y="208" font-size="14">• 2. Ray passing through Center of Curvature (C) retraces its path.</text>
    <text x="110" y="236" font-size="14">• 3. Ray directed at Pole (P) reflects at equal angle (i = r).</text>

    <!-- Diagram Section Container -->
    <rect x="105" y="260" width="700" height="270" rx="10" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.5" />
    <text x="120" y="285" font-size="14" font-weight="bold" fill="#4338ca">
      FIGURE 1: Ray Diagram for Concave Mirror (Object beyond C)
    </text>

    <!-- Ray Diagram Drawing -->
    <g transform="translate(140, 290)">
      <!-- Principal Axis -->
      <line x1="20" y1="120" x2="600" y2="120" stroke="#334155" stroke-width="1.8" />
      <text x="610" y="125" font-size="12" font-weight="bold" fill="#475569">Principal Axis</text>

      <!-- Concave Mirror Arc -->
      <path d="M 520,30 Q 490,120 520,210" fill="none" stroke="#0f172a" stroke-width="3" />
      <!-- Silvered back surface hatches -->
      <line x1="520" y1="40" x2="530" y2="35" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="514" y1="70" x2="526" y2="67" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="507" y1="100" x2="519" y2="98" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="507" y1="130" x2="519" y2="132" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="514" y1="160" x2="526" y2="163" stroke="#94a3b8" stroke-width="1.5" />
      <line x1="520" y1="190" x2="530" y2="195" stroke="#94a3b8" stroke-width="1.5" />

      <!-- Pole P -->
      <circle cx="505" cy="120" r="3" fill="#0f172a" />
      <text x="502" y="140" font-size="14" font-weight="bold">P</text>

      <!-- Focus F -->
      <circle cx="360" cy="120" r="3.5" fill="#dc2626" />
      <text x="355" y="140" font-size="14" font-weight="bold" fill="#dc2626">F</text>

      <!-- Center of Curvature C -->
      <circle cx="220" cy="120" r="3.5" fill="#2563eb" />
      <text x="215" y="140" font-size="14" font-weight="bold" fill="#2563eb">C</text>

      <!-- Object AB (beyond C) -->
      <line x1="120" y1="120" x2="120" y2="40" stroke="#047857" stroke-width="3" />
      <polygon points="120,35 115,45 125,45" fill="#047857" />
      <text x="112" y="30" font-size="14" font-weight="bold" fill="#047857">A (Object)</text>
      <text x="115" y="140" font-size="13" font-weight="bold" fill="#047857">B</text>

      <!-- Ray 1: Parallel from A to Mirror, then through F -->
      <!-- Incident -->
      <line x1="120" y1="40" x2="512" y2="40" stroke="#ea580c" stroke-width="1.8" />
      <polygon points="310,40 300,36 300,44" fill="#ea580c" />
      <!-- Reflected through F -->
      <line x1="512" y1="40" x2="250" y2="185" stroke="#ea580c" stroke-width="1.8" />
      <polygon points="400,102 410,98 404,107" fill="#ea580c" />

      <!-- Ray 2: From A through C to mirror -->
      <!-- Incident & Reflected along same line -->
      <line x1="120" y1="40" x2="510" y2="175" stroke="#7c3aed" stroke-width="1.8" />
      <polygon points="260,89 250,83 254,92" fill="#7c3aed" />
      <polygon points="280,96 290,102 286,93" fill="#7c3aed" />

      <!-- Intersection Image A'B' (between C and F, inverted) -->
      <!-- Intersection approx at x=280, y=160 -->
      <line x1="280" y1="120" x2="280" y2="162" stroke="#b91c1c" stroke-width="2.5" stroke-dasharray="2 1" />
      <polygon points="280,166 275,157 285,157" fill="#b91c1c" />
      <text x="286" y="172" font-size="13" font-weight="bold" fill="#b91c1c">A' (Image)</text>
      <text x="275" y="112" font-size="12" font-weight="bold" fill="#b91c1c">B'</text>

      <!-- Image characteristics label -->
      <rect x="340" y="165" width="220" height="36" rx="4" fill="#fef2f2" stroke="#f87171" />
      <text x="348" y="187" font-size="11" font-weight="bold" fill="#991b1b">
        Image: Real, Inverted &amp; Diminished
      </text>
    </g>

    <!-- Teacher note / Warning at bottom -->
    <text x="110" y="565" font-size="13" font-style="italic" fill="#b45309" font-weight="bold">
      Exam Tip: For concave mirror, focal length f is ALWAYS negative in Cartesian convention (-15 cm, etc.)!
    </text>
    <text x="110" y="590" font-size="13" fill="#475569">
      Magnification m = hi / ho = -v / u. When image is real, m is negative.
    </text>
  </g>
</svg>`;

// Safe base64 encoding that works across Node.js and Browser environments
function safeEncodeBase64Svg(svg: string): string {
  try {
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return window.btoa(unescape(encodeURIComponent(svg)));
    }
  } catch (e) {}
  try {
    if (typeof Buffer !== 'undefined') {
      return Buffer.from(svg, 'utf-8').toString('base64');
    }
  } catch (e) {}
  return encodeURIComponent(svg);
}

export const SAMPLE_HANDWRITTEN_NOTE_SVG = `data:image/svg+xml;base64,${safeEncodeBase64Svg(RAW_SAMPLE_NOTE_SVG)}`;
