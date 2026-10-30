// Genera las ilustraciones de muestra del seed (SVG, un archivo por SKU).
// No son fotos reales: son marcadores ilustrados para que el catálogo de
// desarrollo no se vea vacío. Uso: node seed-assets/generar-imagenes.js
const fs = require('fs');
const path = require('path');

const PALETAS = {
  cemento: { fondo: '#E7E1D3', tinta: '#7C7466', acento: '#C9A227', claro: '#CFC7B4' },
  tuberia: { fondo: '#DCE6EA', tinta: '#3F6B7C', acento: '#E0A82E', claro: '#B7CCD4' },
  herramienta: { fondo: '#EDDFCB', tinta: '#8A5A2B', acento: '#C0392B', claro: '#D9BF99' },
};

const G = {
  bolsa: (p, v) => `
    <path d="M270 250 L530 250 L545 600 Q400 625 255 600 Z" fill="${p.claro}" stroke="${p.tinta}" stroke-width="8" stroke-linejoin="round"/>
    <path d="M270 250 Q400 205 530 250 L520 300 Q400 270 280 300 Z" fill="${p.tinta}" opacity=".85"/>
    <rect x="300" y="360" width="200" height="150" rx="10" fill="${v}" stroke="${p.tinta}" stroke-width="6"/>
    <rect x="325" y="392" width="150" height="14" fill="${p.tinta}"/><rect x="325" y="424" width="110" height="14" fill="${p.tinta}" opacity=".6"/>`,
  balde: (p, v) => `
    <path d="M270 300 L530 300 L500 610 Q400 630 300 610 Z" fill="${v}" stroke="${p.tinta}" stroke-width="8" stroke-linejoin="round"/>
    <ellipse cx="400" cy="300" rx="130" ry="30" fill="${p.claro}" stroke="${p.tinta}" stroke-width="8"/>
    <path d="M285 310 Q400 130 515 310" fill="none" stroke="${p.tinta}" stroke-width="10" stroke-linecap="round"/>
    <rect x="320" y="420" width="160" height="90" rx="8" fill="${p.fondo}" stroke="${p.tinta}" stroke-width="5"/>`,
  monticulo: (p, v) => `
    <path d="M150 600 Q260 380 400 330 Q540 380 650 600 Z" fill="${v}" stroke="${p.tinta}" stroke-width="8" stroke-linejoin="round"/>
    ${[[330,520],[420,480],[480,560],[380,570],[270,575],[550,580],[440,420]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="9" fill="${p.tinta}" opacity=".55"/>`).join('')}`,
  tubo: (p, v) => `
    <rect x="150" y="330" width="500" height="140" rx="14" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
    <rect x="150" y="310" width="60" height="180" rx="10" fill="${p.tinta}"/>
    <rect x="590" y="310" width="60" height="180" rx="10" fill="${p.tinta}"/>
    <rect x="260" y="375" width="280" height="50" rx="8" fill="${p.fondo}" opacity=".7"/>`,
  codo: (p, v) => `
    <path d="M210 600 L210 400 Q210 280 330 280 L600 280" fill="none" stroke="${p.tinta}" stroke-width="150" stroke-linecap="butt"/>
    <path d="M210 600 L210 400 Q210 280 330 280 L600 280" fill="none" stroke="${v}" stroke-width="124" stroke-linecap="butt"/>
    <rect x="130" y="560" width="160" height="50" rx="8" fill="${p.tinta}"/><rect x="560" y="200" width="50" height="160" rx="8" fill="${p.tinta}"/>`,
  valvula: (p, v) => `
    <rect x="130" y="360" width="540" height="90" rx="10" fill="${p.claro}" stroke="${p.tinta}" stroke-width="8"/>
    <circle cx="400" cy="405" r="120" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
    <rect x="385" y="190" width="30" height="100" fill="${p.tinta}"/>
    <rect x="290" y="165" width="220" height="40" rx="20" fill="${p.acento}" stroke="${p.tinta}" stroke-width="6"/>`,
  cinta: (p, v) => `
    <circle cx="400" cy="410" r="190" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
    <circle cx="400" cy="410" r="95" fill="${p.fondo}" stroke="${p.tinta}" stroke-width="8"/>
    <path d="M400 220 Q520 120 640 150 L640 210 Q540 190 440 240 Z" fill="${v}" stroke="${p.tinta}" stroke-width="6"/>`,
  metro: (p, v) => `
    <rect x="240" y="260" width="320" height="300" rx="50" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
    <circle cx="400" cy="410" r="70" fill="${p.fondo}" stroke="${p.tinta}" stroke-width="6"/>
    <rect x="540" y="420" width="200" height="50" fill="${p.acento}" stroke="${p.tinta}" stroke-width="6"/>
    ${[560,590,620,650,680,710].map((x)=>`<line x1="${x}" y1="420" x2="${x}" y2="445" stroke="${p.tinta}" stroke-width="4"/>`).join('')}`,
  martillo: (p, v) => `
    <g transform="rotate(-35 400 400)">
      <rect x="370" y="250" width="60" height="370" rx="16" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
      <path d="M230 210 L560 210 L560 290 L300 290 Q260 290 230 250 Z" fill="${p.claro}" stroke="${p.tinta}" stroke-width="8" stroke-linejoin="round"/>
      <rect x="540" y="195" width="60" height="110" rx="8" fill="${p.tinta}"/>
    </g>`,
  pala: (p, v) => `
    <g transform="rotate(25 400 400)">
      <rect x="380" y="110" width="40" height="330" rx="14" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
      <rect x="350" y="90" width="100" height="34" rx="14" fill="${p.tinta}"/>
      <path d="M290 430 L510 430 L520 640 L280 640 Z" fill="${p.claro}" stroke="${p.tinta}" stroke-width="8" stroke-linejoin="round"/>
    </g>`,
  nivel: (p, v) => `
    <rect x="120" y="340" width="560" height="120" rx="14" fill="${v}" stroke="${p.tinta}" stroke-width="8"/>
    <rect x="320" y="372" width="160" height="56" rx="28" fill="${p.fondo}" stroke="${p.tinta}" stroke-width="6"/>
    <circle cx="400" cy="400" r="18" fill="${p.acento}"/>
    <circle cx="200" cy="400" r="22" fill="${p.fondo}" stroke="${p.tinta}" stroke-width="5"/><circle cx="600" cy="400" r="22" fill="${p.fondo}" stroke="${p.tinta}" stroke-width="5"/>`,
  carretilla: (p, v) => `
    <path d="M250 300 L580 300 L520 470 L310 470 Z" fill="${v}" stroke="${p.tinta}" stroke-width="8" stroke-linejoin="round"/>
    <circle cx="590" cy="540" r="75" fill="${p.tinta}"/><circle cx="590" cy="540" r="30" fill="${p.claro}"/>
    <path d="M310 470 L170 330 M330 470 L240 600" stroke="${p.tinta}" stroke-width="16" stroke-linecap="round"/>
    <path d="M520 470 L590 540" stroke="${p.tinta}" stroke-width="14" stroke-linecap="round"/>`,
};

// sku -> [categoría, dibujo, color del objeto, nombre visible]
const PRODUCTOS = {
  'CEM-001': ['cemento', 'bolsa', '#9C9486', 'Cemento Portland Gris'],
  'CEM-002': ['cemento', 'bolsa', '#F4F1EA', 'Cemento Blanco'],
  'MOR-001': ['cemento', 'bolsa', '#C7B79B', 'Mortero Pega Block'],
  'ARE-001': ['cemento', 'monticulo', '#D8C089', 'Arena Lavada'],
  'ADI-001': ['cemento', 'balde', '#6FA3B5', 'Aditivo Impermeabilizante'],
  'CAL-001': ['cemento', 'bolsa', '#EDE9DF', 'Cal Hidratada'],
  'TUB-001': ['tuberia', 'tubo', '#F2F2F2', 'Tubo PVC Presión'],
  'TUB-002': ['tuberia', 'tubo', '#C9B79A', 'Tubo PVC Sanitario'],
  'COD-001': ['tuberia', 'codo', '#F2F2F2', 'Codo PVC 90°'],
  'LLA-001': ['tuberia', 'valvula', '#D8A93A', 'Llave de Paso Esfera'],
  'TEF-001': ['tuberia', 'cinta', '#F4F4F4', 'Cinta Teflón'],
  'HER-001': ['herramienta', 'martillo', '#A8723C', 'Martillo de Uña'],
  'HER-002': ['herramienta', 'pala', '#8B5E34', 'Pala Cuadrada'],
  'HER-003': ['herramienta', 'metro', '#E0B53A', 'Cinta Métrica'],
  'HER-004': ['herramienta', 'nivel', '#E6B422', 'Nivel de Burbuja'],
  'HER-005': ['herramienta', 'carretilla', '#C0392B', 'Carretilla Reforzada'],
};

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const salida = path.join(__dirname, 'imagenes');
fs.mkdirSync(salida, { recursive: true });
for (const [sku, [cat, dibujo, color, nombre]] of Object.entries(PRODUCTOS)) {
  const p = PALETAS[cat];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 800" role="img" aria-label="${esc(nombre)}">
  <rect width="800" height="800" fill="${p.fondo}"/>
  <circle cx="400" cy="400" r="330" fill="#fff" opacity=".35"/>
  ${G[dibujo](p, color)}
</svg>
`;
  fs.writeFileSync(path.join(salida, `${sku}.svg`), svg);
}
console.log(`${Object.keys(PRODUCTOS).length} ilustraciones generadas en ${salida}`);
