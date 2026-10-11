// Laadt vakantie-data.json en rekent alles uit wat daarvan is afgeleid.
// Inhoud (teksten, prijzen, scores, kleuren, huizen) komt uitsluitend uit de JSON.

let D = null;

export async function laadData() {
  const antwoord = await fetch('vakantie-data.json', { cache: 'no-cache' });
  if (!antwoord.ok) throw new Error(`vakantie-data.json: ${antwoord.status}`);
  D = await antwoord.json();
  return D;
}

export const meta = () => D.meta;
export const opties = () => D.opties;
export const optie = (id) => D.opties.find((o) => o.id === id);
export const landNamen = () => [...new Set(D.opties.map((o) => o.land))];
export const optiesIn = (landNaam) => D.opties.filter((o) => o.land === landNaam);
export const categorieen = () => D.meta.mogelijkheden.categorieen;
export const criteria = () => Object.keys(D.meta.scorecriteria);
export const profielen = () => D.meta.profielen.lijst;
export const profiel = (id) => profielen().find((p) => p.id === id);
export const kiesbareProfielen = () => profielen().filter((p) => p.type !== 'kidscheck');

const netjes = (id) => id.charAt(0).toUpperCase() + id.slice(1).replace(/_/g, ' ');
export const critNaam = (id) => D.meta.scorecriteria_namen?.[id] ?? netjes(id);
export const catNaam = (id) => categorieen().find((c) => c.id === id)?.naam ?? netjes(id);

export function volwassenen() {
  const g = D.meta.groep_indeling;
  return g ? g.stellen * 2 + g.singles : 8;
}

// Gate A, B, C... per land; A1, A2... per plek binnen het land.
export const gateLetter = (landNaam) => String.fromCharCode(65 + Math.max(0, landNamen().indexOf(landNaam)));
export const gateCode = (o) => gateLetter(o.land) + (optiesIn(o.land).indexOf(o) + 1);

const NEUTRAAL = { basis: '#12305A', licht: '#F4ECDD', accent: '#E3A72F' };
export const land = (o) => D.meta.landen[o.land] ?? { welkom: '', kleuren: NEUTRAAL, motieven: [], pils: [] };

// ---------- koffer en scores ----------

export function profielGewichten(p) {
  const g = {};
  for (const c of criteria()) g[c] = p?.gewichten?.[c] ?? 0;
  return g;
}

// ja telt 1, beperkt 0,5, nee en onbekend 0; gedeeld door het aantal ingepakte wensen.
export function koffermatch(o, koffer) {
  const ids = (koffer ?? []).filter((id) => o.mogelijkheden?.[id]);
  if (!ids.length) return null;
  let ja = 0;
  let beperkt = 0;
  for (const id of ids) {
    const status = o.mogelijkheden[id][0];
    if (status === 'ja') ja++;
    else if (status === 'beperkt') beperkt++;
  }
  return { n: ids.length, ja, beperkt, score: (ja + beperkt * 0.5) / ids.length };
}

export function gewogenScore(o, gewichten) {
  let som = 0;
  let max = 0;
  for (const c of criteria()) {
    const g = gewichten?.[c] || 0;
    const s = o.scores?.[c]?.[0];
    if (!g || !s) continue;
    som += g * s;
    max += g * 5;
  }
  return max ? som / max : null;
}

// Persoonlijke score: gewogen scores en koffermatch tellen elk voor de helft.
export function persoonlijkeScore(o, gewichten, koffer) {
  const s = gewogenScore(o, gewichten);
  const k = koffermatch(o, koffer);
  if (s == null && !k) return null;
  if (s == null) return k.score;
  if (!k) return s;
  return (s + k.score) / 2;
}

// ---------- kosten ----------

const POSTNAAM = { vlucht_bagage: 'Vlucht en bagage', auto: 'Huurauto', eten_uitjes: 'Eten en uitjes' };

export function kosten(o, huis) {
  const n = volwassenen();
  const posten = [{ naam: `Huis (gedeeld door ${n})`, bedrag: huis.prijs_totaal / n }];
  for (const [sleutel, bedrag] of Object.entries(o.kosten_opbouw ?? {})) {
    if (typeof bedrag === 'number') posten.push({ naam: POSTNAAM[sleutel] ?? netjes(sleutel), bedrag });
  }
  const som = posten.reduce((t, p) => t + p.bedrag, 0);
  return { posten, totaal: huis.kosten_pp ?? Math.round(som) };
}

export function airbnbUrl(huis) {
  const p = D.meta.periode ?? {};
  const kids = D.meta.groep_indeling?.kids ?? 0;
  const q = new URLSearchParams({ check_in: p.van ?? '', check_out: p.tot ?? '', adults: volwassenen(), infants: kids });
  return `https://www.airbnb.nl/rooms/${encodeURIComponent(huis.airbnb_id)}?${q}`;
}

// ---------- opmaak ----------

export const euro = (n, decimalen = 0) =>
  '€ ' + Number(n).toLocaleString('nl-NL', { minimumFractionDigits: decimalen, maximumFractionDigits: decimalen });
export const pct = (x) => Math.round(x * 100) + '%';
export const graden = (n) => (n == null ? null : `${n}°C`);

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

// ---------- landkleuren ----------

const rgb = (hex) => {
  const h = hex.replace('#', '');
  const v = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return [0, 2, 4].map((i) => parseInt(v.slice(i, i + 2), 16));
};
const lichtheid = (hex) => {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [l1, l2] = [lichtheid(a), lichtheid(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const donkerder = (hex, f) => '#' + rgb(hex).map((v) => Math.round(v * f).toString(16).padStart(2, '0')).join('');

// De landskleuren als CSS-variabelen. "inkt" is de basiskleur, zo nodig donkerder gemaakt
// tot tekst erin leesbaar is op de lichte achtergrond; "op-basis" is de tekstkleur op de basiskleur.
export function themaStijl(o) {
  const k = { ...NEUTRAAL, ...land(o).kleuren };
  let inkt = k.basis;
  for (let i = 0; i < 12 && contrast(inkt, k.licht) < 5; i++) inkt = donkerder(inkt, 0.88);
  const opBasis = contrast('#FFFFFF', k.basis) >= 4.5 ? '#FFFFFF' : '#1A2233';
  return `--land-basis:${k.basis};--land-licht:${k.licht};--land-accent:${k.accent};--land-inkt:${inkt};--land-op-basis:${opBasis}`;
}
export const landKleur = (o) => land(o).kleuren?.basis ?? NEUTRAAL.basis;
