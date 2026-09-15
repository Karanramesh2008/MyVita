// Pre-bundled sample digital BP monitor images (Rendered as high-contrast SVG Data URLs)
// Designed for instant optical OCR recognition with Tesseract.js

export interface SampleMonitorImage {
  id: string;
  name: string;
  systolic: number;
  diastolic: number;
  pulse: number;
  previewLabel: string;
  dataUrl: string;
}

function createMonitorSvgDataUrl(systolic: number, diastolic: number, pulse: number, model: string): string {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="600" height="440" viewBox="0 0 600 440">
  <defs>
    <linearGradient id="casing" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F1F5F9" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
    <linearGradient id="lcd" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D9E6DC" />
      <stop offset="100%" stop-color="#C5D7C9" />
    </linearGradient>
  </defs>

  <!-- Monitor Case -->
  <rect x="20" y="20" width="560" height="400" rx="36" fill="url(#casing)" stroke="#CBD5E1" stroke-width="4" />
  
  <!-- Top Bezel & Branding -->
  <text x="60" y="65" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#475569" letter-spacing="2">OMRON HEALTHCARE // ${model}</text>
  <circle cx="530" cy="58" r="8" fill="#14B8A6" />
  <circle cx="530" cy="58" r="4" fill="#0D9488" />

  <!-- LCD Screen Bezel -->
  <rect x="50" y="85" width="500" height="310" rx="20" fill="#1E293B" />
  <rect x="56" y="91" width="488" height="298" rx="16" fill="url(#lcd)" />

  <!-- LCD Grid and Labels -->
  <text x="80" y="130" font-family="'JetBrains Mono', monospace, sans-serif" font-size="20" font-weight="700" fill="#1E293B">SYS mmHg</text>
  <text x="80" y="220" font-family="'JetBrains Mono', monospace, sans-serif" font-size="20" font-weight="700" fill="#1E293B">DIA mmHg</text>
  <text x="80" y="310" font-family="'JetBrains Mono', monospace, sans-serif" font-size="20" font-weight="700" fill="#1E293B">PULSE /min</text>

  <!-- High-contrast 7-segment / Digital numerals for OCR -->
  <!-- Systolic -->
  <text x="320" y="165" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="88" font-weight="900" fill="#0F172A" text-anchor="start" letter-spacing="4">${systolic}</text>
  
  <!-- Slash separator -->
  <text x="460" y="210" font-family="'JetBrains Mono', monospace" font-size="52" font-weight="700" fill="#475569">/</text>

  <!-- Diastolic -->
  <text x="320" y="255" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="88" font-weight="900" fill="#0F172A" text-anchor="start" letter-spacing="4">${diastolic}</text>

  <!-- Pulse -->
  <text x="320" y="345" font-family="'JetBrains Mono', 'Courier New', monospace" font-size="64" font-weight="900" fill="#0F172A" text-anchor="start" letter-spacing="4">${pulse}</text>

  <!-- Pulse Heart Icon -->
  <path d="M 285 320 C 285 310, 275 305, 265 315 C 255 305, 245 310, 245 320 C 245 335, 265 350, 265 350 C 265 350, 285 335, 285 320 Z" fill="#EF4444" />

  <!-- Status indicator -->
  <rect x="75" y="350" width="130" height="24" rx="6" fill="#0F172A" />
  <text x="85" y="367" font-family="sans-serif" font-size="12" font-weight="700" fill="#F8FAFC">AHA CLASS II</text>
</svg>
`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg.trim())}`;
}

export const SAMPLE_MONITORS: SampleMonitorImage[] = [
  {
    id: 'sample_150_95',
    name: 'Sample #1 (Demo Key)',
    systolic: 150,
    diastolic: 95,
    pulse: 82,
    previewLabel: '150/95 • Pulse 82',
    dataUrl: createMonitorSvgDataUrl(150, 95, 82, 'SERIES 10 CLINICAL'),
  },
  {
    id: 'sample_138_88',
    name: 'Sample #2 (Pre-Hypertension)',
    systolic: 138,
    diastolic: 88,
    pulse: 74,
    previewLabel: '138/88 • Pulse 74',
    dataUrl: createMonitorSvgDataUrl(138, 88, 74, 'UPPER ARM BP-7450'),
  },
  {
    id: 'sample_122_78',
    name: 'Sample #3 (Normal Rest)',
    systolic: 122,
    diastolic: 78,
    pulse: 68,
    previewLabel: '122/78 • Pulse 68',
    dataUrl: createMonitorSvgDataUrl(122, 78, 68, 'ACCUTOUCH DIGITAL'),
  },
];
