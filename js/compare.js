// Vergelijk alles: drie weergaven (scores, mogelijkheden, kids), schuifjes voor de weging en de blik van de kids.
// Eén tabel die op smalle schermen als kaartjes wordt getoond (zie style.css).

import {
  meta, opties, categorieen, criteria, critNaam, landNaam,
  koffermatch, persoonlijkeScore, kosten, gateCode, landKleur, euro, pct, esc,
} from './data.js';
import { staat, wijzig } from './store.js';
import { icoon } from './icons.js';
import { statusLabel, hartKnop, bolletjes, beren, bronnenBlok } from './ui.js';
import { t } from './i18n.js';

const WEERGAVEN = [
  ['scores', 'Scores', 'Scores'],
  ['mogelijkheden', 'Mogelijkheden', 'Options'],
  ['kids', 'Kids', 'Kids'],
];

let bril = 'ik';
let weergave = 'scores';
let sortering = 'score'; // of 'rondje'

// Door wiens ogen kijken we: je eigen keuzes, of die van de kids.
function blik() {
  if (bril === 'kids') return { kids: true, gewichten: {}, koffer: [] };
  return { gewichten: staat().gewichten, koffer: staat().koffer };
}

const bekend = () => opties().filter((o) => staat().bezocht.includes(o.id));

function gesorteerd(b) {
  const lijst = bekend().map((o) => ({ o, score: b.kids ? null : persoonlijkeScore(o, b.gewichten, b.koffer) }));
  const rondje = (o) => o.pils?.rondje_mannen ?? Infinity;
  if (sortering === 'rondje' && weergave === 'scores') {
    lijst.sort((x, y) => rondje(x.o) - rondje(y.o));
  } else if (b.kids) {
    lijst.sort((x, y) => y.o.kidscheck.oordeel - x.o.kidscheck.oordeel || x.o.kidscheck.transfer_min - y.o.kidscheck.transfer_min);
  } else {
    lijst.sort((x, y) => (y.score ?? -1) - (x.score ?? -1));
  }
  return lijst;
}

export function toonVergelijk(el, gevraagd) {
  if (WEERGAVEN.some(([id]) => id === gevraagd)) weergave = gevraagd;
  const brillen = [['ik', t('Mijn keuzes', 'My picks')], ['kids', t('De kids', 'The kids')]];
  const geheim = opties().length - bekend().length;
  const onthul = () => {
    if (!confirm(t('Alle bestemmingen in één keer onthullen? Dan is de verrassing eraf.', 'Reveal all destinations in one go? That takes the surprise out of it.'))) return;
    wijzig({ bezocht: opties().map((o) => o.id) });
    document.dispatchEvent(new Event('staatgewijzigd'));
    toonVergelijk(el, weergave);
  };

  if (!bekend().length) {
    el.innerHTML = `<div class="vgl"><h1>${t('Nog niks te vergelijken', 'Nothing to compare yet')}</h1>
      <p class="lead">${t('Je vergelijkt hier de bestemmingen die je hebt ontdekt. Stap eerst in een paar mysterievluchten.', 'This is where you compare the destinations you have discovered. Hop on a few mystery flights first.')}</p>
      <a class="knop primair groot" href="#/hal">${t('Naar de vertrekhal', 'To Departures')}</a>
      <p class="klein midden"><button type="button" class="linkknop" id="onthul">${t('Geen geduld? Onthul alles', 'No patience? Reveal everything')}</button></p></div>`;
    el.querySelector('#onthul').addEventListener('click', onthul);
    return;
  }

  el.innerHTML = `<div class="vgl">
    <p class="kicker">${esc(meta().reisdata)}</p>
    <h1>${t('Vergelijk wat je kent', "Compare what you've found")}</h1>
    <p class="doorverwijs"><a class="knop" href="#/huizen">${icoon('huis')}${t('Liever op het huis kiezen? Alle huizen', 'Rather choose by house? All houses')}</a></p>
    <p class="lead">${t('Geen officiële ranglijst: de volgorde komt uit jouw weging en jouw koffer, en schuift mee als je iets verandert.', 'Not an official ranking: the order comes from your weighting and your suitcase, and shifts when you change something.')}</p>
    ${geheim ? `<p class="geheimbalk"><span><strong>${geheim === 1 ? t('Nog 1 bestemming is geheim.', '1 destination is still secret.') : t(`Nog ${geheim} bestemmingen zijn geheim.`, `${geheim} destinations are still secret.`)}</strong> <a href="#/hal">${t('Ga ze ontdekken', 'Go discover them')}</a></span><button type="button" class="linkknop" id="onthul">${t('of onthul alles', 'or reveal everything')}</button></p>` : ''}

    <fieldset class="segment" id="bril">
      <legend>${t('Door wiens ogen', 'Through whose eyes')}</legend>
      ${brillen.map(([id, naam]) => `<label><input type="radio" name="bril" value="${esc(id)}"${id === bril ? ' checked' : ''}><span>${esc(naam)}</span></label>`).join('')}
    </fieldset>

    <details class="schuifjes" id="schuifjes"${matchMedia('(min-width: 900px)').matches ? ' open' : ''}>
      <summary>${icoon('weging')}<span>${t('Weging van de scores', 'Score weighting')}</span></summary>
      <div id="schuifraster" class="schuifraster"></div>
      <p class="klein">${t('0 telt niet mee, 3 telt zwaar. Jouw score is voor de helft de gewogen scores en voor de helft je koffermatch.', "0 doesn't count, 3 counts heavily. Your score is half the weighted scores and half your suitcase match.")}</p>
    </details>

    <div class="tabs" role="tablist" aria-label="${t('Weergave', 'View')}">
      ${WEERGAVEN.map(([id, nl, en]) => `<button type="button" role="tab" id="vgl-tab-${id}" data-weergave="${id}" aria-controls="vgl-paneel">${t(nl, en)}</button>`).join('')}
    </div>
    <div id="vgl-paneel" role="tabpanel">
      <fieldset class="segment klein" id="sortering">
        <legend>${t('Sorteer op', 'Sort by')}</legend>
        <label><input type="radio" name="sortering" value="score"${sortering === 'score' ? ' checked' : ''}><span>${t('Jouw score', 'Your score')}</span></label>
        <label><input type="radio" name="sortering" value="rondje"${sortering === 'rondje' ? ' checked' : ''}><span>${t('Goedkoopste rondje', 'Cheapest round')}</span></label>
      </fieldset>
      <p class="klein" id="vgl-uitleg"></p>
      <div class="tabelwrap"><table class="vgl-tabel" id="vgl-tabel"></table></div>
    </div>
    ${bronnenBlok()}
  </div>`;

  el.querySelector('#onthul')?.addEventListener('click', onthul);
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
      ? t('Door de ogen van de kids: gesorteerd op het kids-oordeel, bij gelijke stand op de kortste reistijd.', "Through the kids' eyes: sorted by the kids' verdict, and by shortest travel time in case of a tie.")
      : t('Gesorteerd op jouw score. Kosten per persoon gelden voor het eerste huis van elke plek en zijn een indicatie.', 'Sorted by your score. Cost per person is for the first house of each place and is an estimate.');

    el.querySelector('#sortering').hidden = weergave !== 'scores';
    if (sortering === 'rondje' && weergave === 'scores') uitleg.textContent = t('Gesorteerd op de prijs van een rondje voor de mannen, goedkoopste bovenaan.', 'Sorted by the price of a round for the guys, cheapest on top.');
    const { kop, cellen } = KOLOMMEN[weergave](b);
    tabel.className = `vgl-tabel vgl-${weergave}`;
    tabel.innerHTML = `
      <thead><tr><th scope="col">${t('Bestemming', 'Destination')}</th>${kop}</tr></thead>
      <tbody>${rijen.map(({ o, score }, i) => `<tr>
        <th scope="row" class="rijkop" style="--k:${esc(landKleur(o))}">
          <span class="plek" aria-label="${t(`Plek ${i + 1} in deze volgorde`, `Number ${i + 1} in this order`)}">${i + 1}</span>
          <span class="rijnaam">
            <button type="button" class="linkknop" data-instappen="${esc(o.id)}">${esc(o.naam)}</button>
            <span class="dim">${esc(landNaam(o.land))} · gate ${gateCode(o)}</span>
          </span>
          <span class="rijscore">${b.kids ? beren(o.kidscheck.oordeel) : score == null ? '' : `${pct(score)}<small>${bril === 'ik' ? t('jouw score', 'your score') : 'score'}</small>`}</span>
          ${hartKnop(o.id, o.naam)}
        </th>${cellen(o)}</tr>`).join('')}
      </tbody>`;
    try {
      history.replaceState(null, '', `#/vergelijk/${weergave}`);
    } catch {
      // zonder geschiedenis werkt de weergave ook
    }
  }

  el.querySelector('#sortering').addEventListener('change', (e) => {
    sortering = e.target.value;
    tekenTabel();
  });
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
      kop: criteria().map((c) => `<th scope="col" class="${telt(c) ? 'telt' : ''}" title="${esc(meta().scorecriteria[c])}">${esc(critNaam(c))}${telt(c) ? `<small>${t(`weegt ${b.gewichten[c]}×`, `weighs ${b.gewichten[c]}×`)}</small>` : ''}</th>`).join('')
        + `<th scope="col">${t('Rondje', 'Round')}</th><th scope="col">${t('Kosten p.p.', 'Cost p.p.')}<small>${t('indicatie', 'estimate')}</small></th>`,
      cellen: (o) => criteria().map((c) => {
        const [s, tekst] = o.scores?.[c] ?? [0, ''];
        return `<td data-label="${esc(critNaam(c))}" class="${telt(c) ? 'telt' : ''}" title="${esc(tekst)}">${bolletjes(s)}</td>`;
      }).join('') + `<td data-label="${t('Rondje voor de mannen', 'Round for the guys')}" class="getal">${o.pils?.rondje_mannen == null ? '?' : euro(o.pils.rondje_mannen, 2)}</td><td data-label="${t('Kosten p.p. (indicatie)', 'Cost p.p. (estimate)')}" class="getal">${euro(kosten(o, o.huizen[0]).totaal)}</td>`,
    };
  },

  mogelijkheden(b) {
    const ingepakt = (id) => b.koffer.includes(id);
    return {
      kop: `<th scope="col">${t('Koffermatch', 'Suitcase match')}</th>`
        + categorieen().map((c) => `<th scope="col" class="${ingepakt(c.id) ? 'telt' : ''}">${icoon(c.id)}${esc(c.naam)}${ingepakt(c.id) ? `<small>${t('in de koffer', 'in the suitcase')}</small>` : ''}</th>`).join(''),
      cellen: (o) => {
        const m = koffermatch(o, b.koffer);
        return `<td data-label="${t('Koffermatch', 'Suitcase match')}" class="getal">${m ? pct(m.score) : t('n.v.t.', 'n/a')}</td>`
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
          return `<td data-label="${esc(c.naam)}"><span class="status status-${v ? 'ja' : 'nee'} kaal">${icoon(v ? 'check' : 'kruis')}<span>${v ? t('Ja', 'Yes') : t('Nee', 'No')}</span></span></td>`;
        }
        return `<td data-label="${esc(c.naam)}" class="breed">${esc(v ?? t('Onbekend', 'Unknown'))}</td>`;
      }).join(''),
    };
  },
};
