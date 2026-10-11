// Start van de site: laadt de data, regelt de schermen (via de hash) en de vaste onderdelen
// zoals de instapkaart, de vlucht en de top 3.

import {
  laadData, meta, opties, optie, groepen, groep, optiesVan, categorieen, catNaam, criteria,
  profiel, kiesbareProfielen, profielGewichten, koffermatch, kosten, gateLetter, gateCode,
  euro, pct, esc, themaStijl,
} from './js/data.js';
import { laadStaat, staat, wijzig } from './js/store.js';
import { icoon } from './js/icons.js';
import { toast, kopieer, hartKnop, bronnenBlok } from './js/ui.js';
import * as kaart from './js/map.js';
import { toonBestemming } from './js/destination.js';
import { toonVergelijk } from './js/compare.js';

const $ = (s) => document.querySelector(s);
const el = {
  top: $('#top'),
  terug: $('#btn-terug'),
  titel: $('#top-titel'),
  teller: $('#top3-teller'),
  start: $('#scherm-start'),
  podium: $('#podium'),
  paneel: $('#paneel'),
  vergelijk: $('#scherm-vergelijk'),
  dialoog: $('#dialoog'),
  overslaan: $('#btn-overslaan'),
  vluchtinfo: $('#vluchtinfo'),
};

const SCHERMEN = ['start', 'koffer', 'hal', 'gate', 'b', 'vergelijk'];
let kaartOk = false;
let stopVlucht = null;

const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const zee = (o) => (o.klimaat?.zee == null ? 'geen zee' : `zee ${o.klimaat.zee}°C`);
const sterksteKosten = (o) => kosten(o, o.huizen[0]).totaal;

// ---------- begin ----------

async function begin() {
  laadStaat();
  try {
    await laadData();
  } catch {
    $('#inhoud').innerHTML = '<p class="laadfout">De reisgegevens konden niet worden geladen. Ververs de pagina om het opnieuw te proberen.</p>';
    return;
  }
  ruimStaatOp();
  document.title = meta().titel;
  el.titel.textContent = meta().titel;
  $('#btn-top3').insertAdjacentHTML('afterbegin', icoon('hart'));
  $('#btn-koffer').innerHTML = icoon('koffer');
  el.terug.innerHTML = `${icoon('terug')}<span>Vertrekhal</span>`;

  kaartOk = kaart.maakKaart(instappen);
  window.addEventListener('hashchange', route);
  document.addEventListener('click', klik);
  $('#btn-top3').addEventListener('click', toonTop3);
  el.overslaan.addEventListener('click', () => stopVlucht?.());
  werkHartenBij();
  route();
}

// Keuzes die niet meer in de JSON voorkomen (optie of categorie verwijderd) verdwijnen stil.
function ruimStaatOp() {
  const s = staat();
  const bestaat = (id) => !!optie(id);
  const cats = new Set(categorieen().map((c) => c.id));
  wijzig({
    profiel: profiel(s.profiel) ? s.profiel : null,
    top3: s.top3.filter(bestaat).slice(0, 3),
    bezocht: s.bezocht.filter(bestaat),
    koffer: s.koffer.filter((id) => cats.has(id)),
    gewichten: Object.fromEntries(criteria().map((c) => [c, s.gewichten[c] ?? 0])),
  });
}

// ---------- schermen ----------

function route() {
  const delen = location.hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  let [scherm, a, b] = delen;

  if (stopVlucht) {
    stopVlucht(true);
    eindeVlucht();
  }
  if (el.dialoog.open) el.dialoog.close();

  if (!staat().profiel) scherm = 'start';
  else if (!SCHERMEN.includes(scherm)) scherm = 'hal';
  if ((scherm === 'gate' && !groep(a)) || (scherm === 'b' && !optie(a))) scherm = 'hal';

  const opPodium = ['hal', 'gate', 'b'].includes(scherm);
  document.body.dataset.scherm = scherm;
  el.start.hidden = !['start', 'koffer'].includes(scherm);
  el.podium.hidden = !opPodium;
  el.vergelijk.hidden = scherm !== 'vergelijk';
  el.top.hidden = !staat().profiel;
  el.terug.hidden = scherm === 'hal';
  if (scherm !== 'b') {
    el.paneel.className = 'paneel';
    el.paneel.style.cssText = '';
  }

  if (scherm === 'start') toonStart();
  else if (scherm === 'koffer') toonKoffer();
  else if (scherm === 'hal') toonHal();
  else if (scherm === 'gate') toonGate(groep(a));
  else if (scherm === 'b') aankomst(optie(a), b);
  else toonVergelijk(el.vergelijk, a);

  window.scrollTo(0, 0);
  el.paneel.scrollTop = 0;
  const kop = $('main h1');
  if (kop) {
    kop.tabIndex = -1;
    kop.focus({ preventScroll: true });
  }
}

function toonStart() {
  const s = staat();
  const m = meta();
  el.start.innerHTML = `<div class="intro">
    <p class="kicker">${esc(m.reisdata)}</p>
    <h1>${esc(m.titel)}</h1>
    <p class="lead">${esc(m.groep)}. Waar gaan we heen? Bekijk wat er per bestemming wel en niet kan, vergelijk eerlijk en deel je top 3.</p>

    <h2 id="wie">Wie ben jij?</h2>
    <div class="profielen" role="radiogroup" aria-labelledby="wie">
      ${kiesbareProfielen().map((p) => `<label class="profiel">
        <input type="radio" name="profiel" value="${esc(p.id)}"${s.profiel === p.id ? ' checked' : ''}>
        <span class="profiel-in">
          <strong>${esc(p.naam)}</strong>
          <span class="chips">${(p.wensen ?? []).map((w) => `<span class="chip">${icoon(w)}${esc(catNaam(w))}</span>`).join('')}</span>
        </span>
      </label>`).join('')}
    </div>
    <p class="klein">${esc(m.profielen.toelichting)}</p>

    <label class="veld" for="naam">Je voornaam</label>
    <input id="naam" type="text" autocomplete="given-name" maxlength="20" value="${esc(s.naam)}" placeholder="Voor op je instapkaart">
    <p class="klein">Je naam blijft alleen op dit apparaat staan.</p>

    <button type="button" class="knop primair groot" id="start-verder"${s.profiel ? '' : ' disabled'}>Koffer inpakken${icoon('verder')}</button>
  </div>`;

  const verder = $('#start-verder');
  el.start.querySelector('.profielen').addEventListener('change', (e) => {
    const p = profiel(e.target.value);
    if (p && p.id !== staat().profiel) {
      wijzig({ profiel: p.id, koffer: [...(p.wensen ?? [])], gewichten: profielGewichten(p) });
    }
    verder.disabled = false;
    el.top.hidden = false;
  });
  $('#naam').addEventListener('input', (e) => wijzig({ naam: e.target.value.trim() }));
  verder.addEventListener('click', () => (location.hash = '#/koffer'));
}

function toonKoffer() {
  const s = staat();
  const tel = () => {
    const n = staat().koffer.length;
    return n === 1 ? '1 wens ingepakt' : `${n} wensen ingepakt`;
  };
  el.start.innerHTML = `<div class="intro">
    <p class="kicker">${esc(profiel(s.profiel).naam)}</p>
    <h1>Koffer inpakken</h1>
    <p class="lead">Wat wil jij kunnen deze week? Tik om iets in of uit je koffer te doen. De wensen van je profiel zitten er al in.</p>
    <div class="wensen">
      ${categorieen().map((c) => `<button type="button" class="wens" data-wens="${esc(c.id)}" aria-pressed="${s.koffer.includes(c.id)}">
        <span class="wens-ico">${icoon(c.id)}</span>
        <span class="wens-naam">${esc(c.naam)}</span>
        <span class="wens-vink">${icoon('check')}</span>
      </button>`).join('')}
    </div>
    <p class="klein">${esc(meta().profielen.toelichting)} <a href="#/start">Ander profiel of andere naam</a></p>
    <div class="kofferbalk">
      <span class="koffertel">${icoon('koffer')}<span id="koffer-n" aria-live="polite">${tel()}</span></span>
      <a class="knop primair" href="#/hal">Naar de vertrekhal${icoon('verder')}</a>
    </div>
  </div>`;

  el.start.querySelector('.wensen').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-wens]');
    if (!knop) return;
    const id = knop.dataset.wens;
    const koffer = staat().koffer;
    const erin = !koffer.includes(id);
    wijzig({ koffer: erin ? [...koffer, id] : koffer.filter((x) => x !== id) });
    knop.setAttribute('aria-pressed', erin);
    $('#koffer-n').textContent = tel();
  });
}

function toonHal() {
  const s = staat();
  const m = meta();
  const rijen = opties().map((o) => {
    const match = koffermatch(o, s.koffer);
    return `<li><button type="button" class="bordrij" data-instappen="${esc(o.id)}">
      <span class="b-naam">${esc(o.naam)}</span>
      <span class="b-match">${match ? pct(match.score) : '--'}</span>
      <span class="b-details"><span>gate ${gateCode(o)}</span><span>${esc(o.vlucht.duur)}</span><span>${zee(o)}</span><span>${euro(sterksteKosten(o))}</span></span>
    </button></li>`;
  }).join('');

  el.paneel.innerHTML = `
    <p class="kicker">Vertrekhal ${esc(m.vertrek.naam)}</p>
    <h1>${s.naam ? `Hoi ${esc(s.naam)}, waar` : 'Waar'} vliegen we heen?</h1>
    <p class="lead">${esc(m.reisdata)}. ${esc(m.groep)}.</p>

    <h2>Kies een gate</h2>
    <div class="gates">
      ${groepen().map((g) => `<a class="gate" href="#/gate/${esc(g.id)}">
        <span class="gate-letter" aria-hidden="true">${gateLetter(g.id)}</span>
        <span class="gate-tekst"><strong>${esc(g.naam)}</strong><span>${esc(g.intro)}</span></span>
        ${icoon('verder')}
      </a>`).join('')}
    </div>

    <h2>Vertrek</h2>
    <div class="bord">
      <div class="bord-kop" aria-hidden="true"><span>Bestemming</span><span>Koffermatch</span></div>
      <ul>${rijen}</ul>
    </div>
    <p class="klein">Het bedrag is de indicatie per persoon voor de sterkste huiskeuze. De koffermatch laat zien hoeveel van je ingepakte wensen er kunnen. ${s.koffer.length ? '' : '<a href="#/koffer">Pak eerst je koffer in.</a>'}</p>

    <a class="knop primair groot" href="#/vergelijk">Vergelijk alles${icoon('verder')}</a>
    ${bronnenBlok()}`;
  kaart.toonHal();
}

function toonGate(g) {
  const s = staat();
  el.paneel.innerHTML = `
    <p class="kicker">Gate ${gateLetter(g.id)}</p>
    <h1>${esc(g.naam)}</h1>
    <p class="lead">${esc(g.intro)}</p>
    <div class="optiekaarten">
      ${optiesVan(g.id).map((o) => {
        const match = koffermatch(o, s.koffer);
        const geweest = s.bezocht.includes(o.id);
        return `<article class="optiekaart" style="${themaStijl(o)}">
          <header>
            <p class="kicker">${esc(o.land)} · gate ${gateCode(o)}</p>
            <h2>${esc(o.naam)}</h2>
            <p>${esc(o.subregio)}</p>
            ${hartKnop(o.id, o.naam)}
          </header>
          <div class="optiekaart-in">
            <p class="tagline">${esc(o.tagline)}</p>
            <dl class="kerncijfers">
              <div><dt>Vlucht</dt><dd>${esc(o.vlucht.duur)}</dd></div>
              <div><dt>Zee</dt><dd>${o.klimaat?.zee == null ? 'geen' : `${esc(o.klimaat.zee)}°C`}</dd></div>
              <div><dt>Per persoon</dt><dd>${euro(sterksteKosten(o))}</dd></div>
              <div><dt>Koffermatch</dt><dd>${match ? pct(match.score) : '--'}</dd></div>
            </dl>
            <div class="acties">
              <button type="button" class="knop primair" data-instappen="${esc(o.id)}">${icoon('vliegtuig')}Instappen</button>
              ${geweest ? `<a class="knop" href="#/b/${esc(o.id)}">Opnieuw bekijken</a>` : ''}
            </div>
          </div>
        </article>`;
      }).join('')}
    </div>
    <p class="klein">Bedragen per persoon zijn een indicatie voor de sterkste huiskeuze.</p>`;
  kaart.toonGate(g.id);
}

function aankomst(o, tab) {
  const s = staat();
  if (!s.bezocht.includes(o.id)) wijzig({ bezocht: [...s.bezocht, o.id] });
  toonBestemming(el.paneel, o, tab, true);
}

// ---------- instappen en vliegen ----------

function stoel(naam, id) {
  let h = 7;
  for (const teken of naam + id) h = (h * 31 + teken.codePointAt(0)) >>> 0;
  return `${1 + (h % 30)}${'ABCDEF'[(h >>> 5) % 6]}`;
}

function reisdatum() {
  const van = meta().periode?.van;
  if (!van) return '';
  return new Date(`${van}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });
}

function instappen(id) {
  const o = optie(id);
  if (!o) return;
  const s = staat();
  const v = meta().vertrek;
  const carrier = meta().carriers?.[o.carrier];
  const naam = s.naam || 'Reiziger';
  el.dialoog.innerHTML = `
    <div class="instapkaart" style="${themaStijl(o)}">
      <header><span>Instapkaart</span><span>${esc(carrier?.naam ?? o.vlucht.maatschappijen)}</span></header>
      <div class="ik-route">
        <div><span class="ik-code">${esc(v.code)}</span><span>${esc(v.naam)}</span></div>
        <div class="ik-lijn">${icoon('vliegtuig')}<span>${esc(o.vlucht.duur)}</span></div>
        <div><span class="ik-code">${esc(o.luchthaven.code)}</span><span>${esc(o.luchthaven.naam)}</span></div>
      </div>
      <dl class="ik-velden">
        <div class="breed"><dt>Passagier</dt><dd>${esc(naam)}</dd></div>
        <div class="breed"><dt>Bestemming</dt><dd>${esc(o.naam)}</dd></div>
        <div><dt>Datum</dt><dd>${esc(reisdatum())}</dd></div>
        <div><dt>Gate</dt><dd>${gateCode(o)}</dd></div>
        <div><dt>Stoel</dt><dd>${stoel(naam, o.id)}</dd></div>
        <div class="breed"><dt>Vluchten per week</dt><dd>${esc(o.vlucht.per_week)}</dd></div>
        <div class="breed"><dt>Vluchtprijs (indicatie)</dt><dd>${euro(o.vlucht.prijs_pp)} p.p.</dd></div>
      </dl>
      <p class="ik-noot">${esc(meta().carriers?.toelichting)}</p>
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop" data-sluit>Annuleren</button>
      <a class="knop" href="#/b/${esc(o.id)}">Direct erheen</a>
      <button type="button" class="knop primair" id="vertrek" autofocus>${icoon('vliegtuig')}Vertrek</button>
    </div>`;
  el.dialoog.setAttribute('aria-label', `Instapkaart naar ${o.naam}`);
  el.dialoog.showModal();
  $('#vertrek').addEventListener('click', () => vertrek(o));
}

function vertrek(o) {
  el.dialoog.close();
  const doel = `#/b/${o.id}`;
  if (!kaartOk || rustig()) {
    location.hash = doel;
    return;
  }
  document.body.dataset.scherm = 'vlucht';
  el.start.hidden = true;
  el.vergelijk.hidden = true;
  el.podium.hidden = false;
  document.body.classList.add('vliegt');
  el.overslaan.hidden = false;
  el.vluchtinfo.hidden = false;
  el.vluchtinfo.textContent = `${meta().vertrek.code} naar ${o.luchthaven.code} · ${o.naam}`;
  window.scrollTo(0, 0);
  el.overslaan.focus({ preventScroll: true });

  stopVlucht = kaart.vlieg(o, () => {
    eindeVlucht();
    if (location.hash.startsWith(doel)) route();
    else location.hash = doel;
  });
}

function eindeVlucht() {
  stopVlucht = null;
  document.body.classList.remove('vliegt');
  el.overslaan.hidden = true;
  el.vluchtinfo.hidden = true;
}

// ---------- favorieten en top 3 ----------

function werkHartenBij() {
  const top3 = staat().top3;
  for (const knop of document.querySelectorAll('[data-hart]')) {
    knop.setAttribute('aria-pressed', top3.includes(knop.dataset.hart));
  }
  el.teller.textContent = top3.length;
  el.teller.hidden = top3.length === 0;
  $('#btn-top3').setAttribute('aria-label', `Mijn top 3 (${top3.length} gekozen)`);
}

function wisselHart(id) {
  const top3 = staat().top3;
  const o = optie(id);
  if (top3.includes(id)) {
    wijzig({ top3: top3.filter((x) => x !== id) });
    toast(`${o.naam} is uit je top 3`);
  } else if (top3.length >= 3) {
    toast('Je top 3 zit vol. Haal er eerst een uit via het hartje bovenin.');
  } else {
    wijzig({ top3: [...top3, id] });
    toast(`${o.naam} staat op plek ${top3.length + 1} van je top 3`);
  }
  werkHartenBij();
}

function top3Tekst() {
  const s = staat();
  const kop = s.top3.length === 3 ? 'Mijn top 3' : 'Mijn favorieten tot nu toe';
  const regels = s.top3.map((id, i) => {
    const o = optie(id);
    const match = koffermatch(o, s.koffer);
    return `${i + 1}. ${o.naam} (${o.land}): ca. ${euro(sterksteKosten(o))} p.p.${match ? `, koffermatch ${pct(match.score)}` : ''}`;
  });
  return `${kop} voor ${meta().titel}${s.naam ? ` (${s.naam})` : ''}:\n${regels.join('\n')}`;
}

function toonTop3() {
  const teken = () => {
    const s = staat();
    const leeg = s.top3.length === 0;
    el.dialoog.innerHTML = `<div class="dialoog-in">
      <h2>Mijn top 3</h2>
      ${leeg
        ? '<p>Je hebt nog geen favorieten. Tik op het hartje bij een bestemming om hem in je top 3 te zetten.</p>'
        : `<ol class="top3">${s.top3.map((id, i) => {
          const o = optie(id);
          return `<li>
            <span class="plek">${i + 1}</span>
            <span class="top3-naam"><strong>${esc(o.naam)}</strong><span class="dim">${esc(o.land)} · ${euro(sterksteKosten(o))} p.p.</span></span>
            <button type="button" class="iconknop" data-zet="${i}" data-stap="-1" aria-label="${esc(o.naam)} een plek omhoog"${i === 0 ? ' disabled' : ''}>${icoon('op')}</button>
            <button type="button" class="iconknop" data-zet="${i}" data-stap="1" aria-label="${esc(o.naam)} een plek omlaag"${i === s.top3.length - 1 ? ' disabled' : ''}>${icoon('neer')}</button>
            <button type="button" class="iconknop" data-weg="${esc(id)}" aria-label="${esc(o.naam)} uit mijn top 3 halen">${icoon('kruis')}</button>
          </li>`;
        }).join('')}</ol>
        ${s.top3.length < 3 ? `<p class="klein">Nog ${3 - s.top3.length} te kiezen.</p>` : ''}`}
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop" data-sluit>Sluiten</button>
      <a class="knop" href="#/vergelijk">Vergelijken</a>
      <button type="button" class="knop primair" id="kopieer-top3"${leeg ? ' disabled' : ''}>${icoon('kopieer')}Mijn top 3 kopiëren</button>
    </div>`;
    $('#kopieer-top3').addEventListener('click', async () => {
      const tekst = top3Tekst();
      el.dialoog.close();
      await kopieer(tekst, 'Je top 3 is gekopieerd: plak hem in de groepsapp');
    });
  };

  el.dialoog.onclick = (e) => {
    if (!el.dialoog.querySelector('.top3')) return;
    const zet = e.target.closest('[data-zet]');
    const weg = e.target.closest('[data-weg]');
    if (!zet && !weg) return;
    const top3 = [...staat().top3];
    if (zet) {
      const i = Number(zet.dataset.zet);
      const j = i + Number(zet.dataset.stap);
      [top3[i], top3[j]] = [top3[j], top3[i]];
    } else {
      top3.splice(top3.indexOf(weg.dataset.weg), 1);
    }
    wijzig({ top3 });
    werkHartenBij();
    teken();
  };
  teken();
  el.dialoog.setAttribute('aria-label', 'Mijn top 3');
  el.dialoog.showModal();
}

// ---------- klikken ----------

function klik(e) {
  const hart = e.target.closest('[data-hart]');
  if (hart) return wisselHart(hart.dataset.hart);
  const instap = e.target.closest('[data-instappen]');
  if (instap) return instappen(instap.dataset.instappen);
  if (e.target.closest('[data-sluit], dialog a') || e.target === el.dialoog) el.dialoog.close();
}

begin();
