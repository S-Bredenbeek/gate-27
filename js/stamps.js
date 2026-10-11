// Stempels, gegenereerd uit optie.stempel: vorm, dubbele rand, motief, tekst, code en datum.
// Het inktfilter (#inkt) staat één keer in index.html en maakt randen onregelmatig en vlekkerig.

import { motiefTekening } from './motifs.js';
import { esc } from './data.js';

let volgnummer = 0;

const hash = (s) => {
  let h = 7;
  for (const teken of String(s)) h = (h * 31 + teken.codePointAt(0)) >>> 0;
  return h;
};
// Elke stempel staat een beetje scheef: tussen -12 en 12 graden, vast per stempel.
export const kanteling = (id) => (hash(id) % 25) - 12;

const maat = (tekst, max, breedte) => Math.min(max, breedte / (Math.max(String(tekst).length, 1) * 0.72));
const veelhoek = (punten, dikte) => `<polygon points="${punten}" fill="none" stroke-width="${dikte}"/>`;

const VORMEN = {
  rond: (s, t, m) => `<circle cx="80" cy="80" r="74" fill="none" stroke-width="4"/><circle cx="80" cy="80" r="66" fill="none" stroke-width="1.5"/>
    ${t.boog('M 27 86 A 53 53 0 0 1 133 86', s.tekst, maat(s.tekst, 15, 150))}${m(80, 84, 1.1)}
    ${t.recht(s.code, 123, 13)}${t.recht(s.datum, 136, 8)}`,
  ovaal: (s, t, m) => `<ellipse cx="80" cy="80" rx="76" ry="58" fill="none" stroke-width="4"/><ellipse cx="80" cy="80" rx="69" ry="51" fill="none" stroke-width="1.5"/>
    ${t.boog('M 25 88 A 57 42 0 0 1 135 88', s.tekst, maat(s.tekst, 14, 140))}${m(80, 82, 0.85)}
    ${t.recht(`${s.code} · ${s.datum}`, 114, 7)}`,
  rechthoek: (s, t, m) => `<rect x="6" y="24" width="148" height="112" rx="5" fill="none" stroke-width="4"/><rect x="13" y="31" width="134" height="98" rx="2" fill="none" stroke-width="1.5"/>
    ${t.recht(s.tekst, 52, maat(s.tekst, 16, 122))}${m(80, 85, 1)}
    ${t.recht(`${s.code} · ${s.datum}`, 122, 9.5)}`,
  zeshoek: (s, t, m) => `${veelhoek('154,80 117,144 43,144 6,80 43,16 117,16', 4)}${veelhoek('145,80 113,136 47,136 15,80 47,24 113,24', 1.5)}
    ${t.recht(s.tekst, 45, maat(s.tekst, 13, 64))}${m(80, 84, 1.1)}
    ${t.recht(s.code, 121, 12)}${t.recht(s.datum, 132, 7.5)}`,
  driehoek: (s, t, m) => `${veelhoek('80,8 154,140 6,140', 4)}${veelhoek('80,25 140,132 20,132', 1.5)}
    ${m(80, 80, 0.8)}${t.recht(s.tekst, 112, maat(s.tekst, 12, 82))}
    ${t.recht(`${s.code} · ${s.datum}`, 125, 7.5)}`,
};

export function stempel(s, klasse = '') {
  const kleur = /^#[0-9a-f]{3,8}$/i.test(s.kleur ?? '') ? s.kleur : '#12305A';
  const n = ++volgnummer;
  const tekst = {
    recht: (inhoud, y, grootte) => `<text x="80" y="${y}" text-anchor="middle" font-size="${grootte}" stroke="none">${esc(inhoud)}</text>`,
    boog: (pad, inhoud, grootte) => `<path id="stempelboog-${n}" d="${pad}" fill="none" stroke="none"/>
      <text font-size="${grootte}" stroke="none"><textPath href="#stempelboog-${n}" startOffset="50%" text-anchor="middle">${esc(inhoud)}</textPath></text>`,
  };
  const motief = (x, y, schaal) => `<g transform="translate(${x - 24 * schaal} ${y - 24 * schaal}) scale(${schaal})" fill="none" stroke-width="${2.4 / schaal}" stroke-linecap="round" stroke-linejoin="round">${motiefTekening(s.motief)}</g>`;
  const vorm = VORMEN[s.vorm] ?? VORMEN.rond;
  return `<svg class="stempel ${klasse}" viewBox="0 0 160 160" role="img" aria-label="Stempel ${esc(s.tekst)}">
    <g filter="url(#inkt)" fill="${kleur}" stroke="${kleur}" font-family="'JetBrains Mono', ui-monospace, monospace" font-weight="700" letter-spacing="1.5">${vorm(s, tekst, motief)}</g>
  </svg>`;
}
