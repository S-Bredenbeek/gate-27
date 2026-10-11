// Vergelijk alles: drie weergaven (scores, mogelijkheden, kids), schuifjes voor de weging en de profielbril.
// Eén tabel die op smalle schermen als kaartjes wordt getoond (zie style.css).

import {
  meta, opties, categorieen, criteria, critNaam, profielen, profiel, profielGewichten,
  koffermatch, persoonlijkeScore, kosten, gateCode, landKleur, euro, pct, esc,
} from './data.js';
import { staat, wijzig } from './store.js';
import { icoon } from './icons.js';
import { statusLabel, hartKnop, bolletjes, beren, bronnenBlok } from './ui.js';

const WEERGAVEN = [
  ['scores', 'Scores'],
  ['mogelijkheden', 'Mogelijkheden'],
  ['kids', 'Kids'],
];

let bril = 'ik';
let weergave = 'scores';

// Door wiens ogen kijken we: eigen keuzes, of de standaard van een profiel.
function blik() {
  if (bril === 'ik') return { gewichten: staat().gewichten, koffer: staat().koffer };
  const p = profiel(bril);
  if (p?.type === 'kidscheck') return { kids: true, gewichten: {}, koffer: [] };
  return { gewichten: profielGewichten(p), koffer: p?.wensen ?? [] };
}

function gesorteerd(b) {
  const lijst = opties().map((o) => ({ o, score: b.kids ? null : persoonlijkeScore(o, b.gewichten, b.koffer) }));
  if (b.kids) {
    lijst.sort((x, y) => y.o.kidscheck.oordeel - x.o.kidscheck.oordeel || x.o.kidscheck.transfer_min - y.o.kidscheck.transfer_min);
  } else {
    lijst.sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
  }
  return lijst;
}

export function toonVergelijk(el, gevraagd) {
  if (WEERGAVEN.some(([id]) => id === gevraagd)) weergave = gevraagd;
  if (bril !== 'ik' && !profiel(bril)) bril = 'ik';
  const brillen = [['ik', 'Mijn keuzes'], ...profielen().map((p) => [p.id, p.naam])];

  el.innerHTML = `<div class="vgl">
    <p class="kicker">${esc(meta().reisdata)}</p>
    <h1>Vergelijk alles</h1>
    <p class="lead">Er is geen officiële ranglijst. De volgorde komt uit jouw weging en jouw koffer, en schuift mee als je iets verandert.</p>

    <fieldset class="segment" id="bril">
      <legend>Profielbril</legend>
      ${brillen.map(([id, naam]) => `<label><input type="radio" name="bril" value="${esc(id)}"${id === bril ? ' checked' : ''}><span>${esc(naam)}</span></label>`).join('')}
    </fieldset>

    <details class="schuifjes" id="schuifjes"${matchMedia('(min-width: 900px)').matches ? ' open' : ''}>
      <summary>${icoon('weging')}<span>Weging van de scores</span></summary>
      <div id="schuifraster" class="schuifraster"></div>
      <p class="klein">0 telt niet mee, 3 telt zwaar. Jouw score is voor de helft de gewogen scores en voor de helft je koffermatch.</p>
    </details>

    <div class="tabs" role="tablist" aria-label="Weergave">
      ${WEERGAVEN.map(([id, naam]) => `<button type="button" role="tab" id="vgl-tab-${id}" data-weergave="${id}" aria-controls="vgl-paneel">${naam}</button>`).join('')}
    </div>
    <div id="vgl-paneel" role="tabpanel">
      <p class="klein" id="vgl-uitleg"></p>
      <div class="tabelwrap"><table class="vgl-tabel" id="vgl-tabel"></table></div>
    </div>
    ${bronnenBlok()}
  </div>`;

  const tabel = el.querySelector('#vgl-tabel');
  const uitleg = el.querySelector('#vgl-uitleg');
  const raster = el.querySelector('#schuifraster');
  const tabs = el.querySelector('.tabs');

  function tekenSchuifjes() {
    const b = blik();
    el.querySelector('#schuifjes').hidden = !!b.kids;
    raster.innerHTML = criteria().map((c) => {
      const v = b.gewichten[c] ?? 0;
      return `<label class="schuif" title="${esc(meta().scorecriteria[c])}">
        <span>${esc(critNaam(c))}</span>
        <input type="range" min="0" max="3" step="1" value="${v}" data-crit="${esc(c)}"${bril === 'ik' ? '' : ' disabled'}>
        <output>${v}</output>
      </label>`;
    }).join('');
  }

  function tekenTabel() {
    const b = blik();
    const rijen = gesorteerd(b);
    for (const knop of tabs.children) {
      const aan = knop.dataset.weergave === weergave;
      knop.setAttribute('aria-selected', aan);
      knop.tabIndex = aan ? 0 : -1;
    }
    el.querySelector('#vgl-paneel').setAttribute('aria-labelledby', `vgl-tab-${weergave}`);
    uitleg.textContent = b.kids
      ? 'Door de ogen van de kids: gesorteerd op het kids-oordeel, bij gelijke stand op de kortste reistijd.'
      : bril === 'ik'
        ? 'Gesorteerd op jouw score. Kosten per persoon gelden voor de sterkste huiskeuze en zijn een indicatie.'
        : `Door de ogen van ${profiel(bril).naam}: de standaardwensen en standaardweging van dit profiel.`;

    const { kop, cellen } = KOLOMMEN[weergave](b);
    tabel.className = `vgl-tabel vgl-${weergave}`;
    tabel.innerHTML = `
      <thead><tr><th scope="col">Bestemming</th>${kop}</tr></thead>
      <tbody>${rijen.map(({ o, score }, i) => `<tr>
        <th scope="row" class="rijkop" style="--k:${esc(landKleur(o))}">
          <span class="plek" aria-label="Plek ${i + 1} in deze volgorde">${i + 1}</span>
          <span class="rijnaam">
            <button type="button" class="linkknop" data-instappen="${esc(o.id)}">${esc(o.naam)}</button>
            <span class="dim">${esc(o.land)} · gate ${gateCode(o)}</span>
          </span>
          <span class="rijscore">${b.kids ? beren(o.kidscheck.oordeel) : score == null ? '' : `${pct(score)}<small>${bril === 'ik' ? 'jouw score' : 'score'}</small>`}</span>
          ${hartKnop(o.id, o.naam)}
        </th>${cellen(o)}</tr>`).join('')}
      </tbody>`;
    try {
      history.replaceState(null, '', `#/vergelijk/${weergave}`);
    } catch {
      // zonder geschiedenis werkt de weergave ook
    }
  }

  el.querySelector('#bril').addEventListener('change', (e) => {
    bril = e.target.value;
    tekenSchuifjes();
    tekenTabel();
  });
  raster.addEventListener('input', (e) => {
    const veld = e.target.closest('[data-crit]');
    if (!veld || bril !== 'ik') return;
    veld.nextElementSibling.textContent = veld.value;
    wijzig({ gewichten: { ...staat().gewichten, [veld.dataset.crit]: Number(veld.value) } });
    tekenTabel();
  });
  tabs.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-weergave]');
    if (!knop) return;
    weergave = knop.dataset.weergave;
    tekenTabel();
  });
  tabs.addEventListener('keydown', (e) => {
    const stap = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!stap) return;
    e.preventDefault();
    const nu = WEERGAVEN.findIndex(([id]) => id === weergave);
    weergave = WEERGAVEN[(nu + stap + WEERGAVEN.length) % WEERGAVEN.length][0];
    tekenTabel();
    tabs.querySelector('[aria-selected="true"]').focus();
  });

  tekenSchuifjes();
  tekenTabel();
}

// ---------- kolommen per weergave ----------

const KOLOMMEN = {
  scores(b) {
    const telt = (c) => (b.gewichten[c] ?? 0) > 0;
    return {
      kop: criteria().map((c) => `<th scope="col" class="${telt(c) ? 'telt' : ''}" title="${esc(meta().scorecriteria[c])}">${esc(critNaam(c))}${telt(c) ? `<small>weegt ${b.gewichten[c]}×</small>` : ''}</th>`).join('')
        + '<th scope="col">Kosten p.p.<small>indicatie</small></th>',
      cellen: (o) => criteria().map((c) => {
        const [s, tekst] = o.scores?.[c] ?? [0, ''];
        return `<td data-label="${esc(critNaam(c))}" class="${telt(c) ? 'telt' : ''}" title="${esc(tekst)}">${bolletjes(s)}</td>`;
      }).join('') + `<td data-label="Kosten p.p. (indicatie)" class="getal">${euro(kosten(o, o.huizen[0]).totaal)}</td>`,
    };
  },

  mogelijkheden(b) {
    const ingepakt = (id) => b.koffer.includes(id);
    return {
      kop: '<th scope="col">Koffermatch</th>'
        + categorieen().map((c) => `<th scope="col" class="${ingepakt(c.id) ? 'telt' : ''}">${icoon(c.id)}${esc(c.naam)}${ingepakt(c.id) ? '<small>in de koffer</small>' : ''}</th>`).join(''),
      cellen: (o) => {
        const m = koffermatch(o, b.koffer);
        return `<td data-label="Koffermatch" class="getal">${m ? pct(m.score) : 'n.v.t.'}</td>`
          + categorieen().map((c) => {
            const [status, tekst] = o.mogelijkheden?.[c.id] ?? ['onbekend', ''];
            return `<td data-label="${esc(c.naam)}" class="${ingepakt(c.id) ? 'telt' : ''}" title="${esc(tekst)}">${statusLabel(status, true)}</td>`;
          }).join('');
      },
    };
  },

  kids() {
    const lijst = meta().kidscheck_criteria ?? [];
    return {
      kop: lijst.map((c) => `<th scope="col">${esc(c.naam)}</th>`).join(''),
      cellen: (o) => lijst.map((c) => {
        const v = o.kidscheck?.[c.id];
        if (typeof v === 'number') {
          const kleur = v < 45 ? 'groen' : v <= 90 ? 'oranje' : 'rood';
          return `<td data-label="${esc(c.naam)}"><span class="minuten ${kleur}">${v} min</span></td>`;
        }
        if (typeof v === 'boolean') {
          return `<td data-label="${esc(c.naam)}"><span class="status status-${v ? 'ja' : 'nee'} kaal">${icoon(v ? 'check' : 'kruis')}<span>${v ? 'Ja' : 'Nee'}</span></span></td>`;
        }
        return `<td data-label="${esc(c.naam)}" class="breed">${esc(v ?? 'Onbekend')}</td>`;
      }).join(''),
    };
  },
};
