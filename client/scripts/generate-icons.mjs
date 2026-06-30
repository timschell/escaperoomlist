// Generates the PWA icons from an inline SVG using sharp.
// Run with: npm run gen:icons
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, '..', 'public', 'icons');
mkdirSync(OUT, { recursive: true });

const lock = (cx, cy, scale) => `
  <g transform="translate(${cx} ${cy}) scale(${scale}) translate(-256 -256)">
    <path d="M196 236 v-46 a60 60 0 0 1 120 0 v46"
      fill="none" stroke="#ffffff" stroke-width="30" stroke-linecap="round"/>
    <rect x="150" y="232" width="212" height="176" rx="32" fill="#ffffff"/>
    <circle cx="256" cy="300" r="26" fill="#7c2bff"/>
    <rect x="246" y="312" width="20" height="46" rx="8" fill="#7c2bff"/>
  </g>`;

function svg({ maskable }) {
  const bg = maskable
    ? `<rect width="512" height="512" fill="url(#g)"/>`
    : `<rect width="512" height="512" rx="114" fill="url(#g)"/>`;
  const logo = maskable ? lock(256, 256, 0.62) : lock(256, 256, 0.82);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#7c5cff"/>
        <stop offset="1" stop-color="#b14aff"/>
      </linearGradient>
    </defs>
    ${bg}
    ${logo}
  </svg>`;
}

const normal = Buffer.from(svg({ maskable: false }));
const maskable = Buffer.from(svg({ maskable: true }));

const tasks = [
  [normal, 192, 'icon-192.png'],
  [normal, 512, 'icon-512.png'],
  [maskable, 512, 'icon-maskable-512.png'],
  [normal, 180, 'apple-touch-icon.png'],
  [normal, 32, 'favicon.png'],
];

await Promise.all(
  tasks.map(([buf, size, name]) =>
    sharp(buf).resize(size, size).png().toFile(path.join(OUT, name))
  )
);

console.log('Icons generated in', OUT);
