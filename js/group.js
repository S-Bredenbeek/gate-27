// Groepsuitslag zonder server: iedereen deelt een korte code (naam, top 3 en koffer) in de groepsapp;
// wie alle codes plakt, ziet de gezamenlijke ranglijst. Alles gebeurt in de browser.

import { opties, optie, huis, categorieen, koffermatch } from './data.js';
import { staat } from './store.js';

const MERK = 'VV1.';

export const naarCode = (tekst) => btoa(String.fromCharCode(...new TextEncoder().encode(tekst))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
export const vanCode = (code) => new TextDecoder().decode(Uint8Array.from(atob(code.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));

// Opties staan er met hun id in (kort en bestand tegen een andere volgorde in de JSON), de koffer als bitjes.
export function mijnCode() {
  const s = staat();
  const huizen = (s.huisFav ?? []).slice(0, 5);
  if (!s.top3.length && !huizen.length) return null;
  const bits = categorieen().reduce((t, c, i) => t | (s.koffer.includes(c.id) ? 1 << i : 0), 0);
  return MERK + naarCode(JSON.stringify([s.naam || 'Reiziger', s.top3, bits, huizen]));
}

export function leesCodes(tekst) {
  const gevonden = new Map();
  for (const [code] of String(tekst).matchAll(/VV1\.[A-Za-z0-9_-]+/g)) {
    try {
      // codes van voor de huisfavorieten hebben geen vierde deel: die blijven gewoon werken
      const [naam, top3, bits, huizenRuw] = JSON.parse(vanCode(code.slice(MERK.length)));
      const huizen = (Array.isArray(huizenRuw) ? huizenRuw : []).map(String).filter((id) => huis(id)).slice(0, 5);
      const ids = (Array.isArray(top3) ? top3 : []).filter((id) => optie(id)).slice(0, 3);
      if (typeof naam !== 'string' || (!ids.length && !huizen.length)) continue;
      const koffer = categorieen().filter((_, i) => (Number(bits) >> i) & 1).map((c) => c.id);
      gevonden.set(naam.trim().toLowerCase(), { naam: naam.trim().slice(0, 20), top3: ids, koffer, huizen });
    } catch {
      // geen geldige code: overslaan
    }
  }
  return [...gevonden.values()];
}

// 3 punten voor een eerste plek, 2 voor een tweede, 1 voor een derde.
export function uitslag(deelnemers) {
  const rijen = new Map();
  for (const d of deelnemers) {
    d.top3.forEach((id, i) => {
      if (!rijen.has(id)) rijen.set(id, { o: optie(id), punten: 0, wie: [] });
      const rij = rijen.get(id);
      rij.punten += 3 - i;
      rij.wie.push({ naam: d.naam, plek: i + 1 });
    });
  }
  for (const rij of rijen.values()) {
    const matches = deelnemers.map((d) => koffermatch(rij.o, d.koffer)).filter(Boolean);
    rij.match = matches.length ? matches.reduce((t, m) => t + m.score, 0) / matches.length : null;
  }
  const volgorde = opties().map((o) => o.id);
  return [...rijen.values()].sort((a, b) => b.punten - a.punten || b.wie.length - a.wie.length || volgorde.indexOf(a.o.id) - volgorde.indexOf(b.o.id));
}

// De huizen die het vaakst als favoriet zijn aangevinkt.
export function huizenUitslag(deelnemers) {
  const telling = new Map();
  for (const d of deelnemers) {
    for (const id of d.huizen ?? []) {
      if (!telling.has(id)) telling.set(id, { ...huis(id), wie: [] });
      telling.get(id).wie.push(d.naam);
    }
  }
  return [...telling.values()].sort((a, b) => b.wie.length - a.wie.length || a.h.kosten_pp - b.h.kosten_pp);
}
