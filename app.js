// Start van de site: laadt de data, regelt de schermen (via de hash) en de vaste onderdelen
// zoals de instapkaart, de vlucht, de aankomst, het paspoort en de top 3.

import {
  laadData, meta, opties, optie, landNamen, optiesIn, categorieen, criteria, land,
  profiel, kiesbareProfielen, profielGewichten, koffermatch, kosten, gateLetter, gateCode,
  euro, pct, esc, themaStijl,
} from './js/data.js';
import { laadStaat, staat, wijzig } from './js/store.js';
import { icoon } from './js/icons.js';
import { toast, kopieer, hartKnop, bronnenBlok } from './js/ui.js';
import * as kaart from './js/map.js';
import { toonBestemming } from './js/destination.js';
import { toonVergelijk } from './js/compare.js';
import { poppetje, KEUZES, UITERLIJK } from './js/avatar.js';
import { thema } from './js/patterns.js';
import { motief, heeftMotief } from './js/motifs.js';
import { speel, stopSpel } from './js/game.js';
import { mijnCode, leesCodes, uitslag } from './js/group.js';
import { tekenAnsichtkaart, kaartNaam } from './js/postcard.js';
import { stempel, kanteling } from './js/stamps.js';
import { toestelZij } from './js/plane.js';
import { flaps, regels, draai } from './js/board.js';
import { paspoort } from './js/passport.js';

const $ = (s) => document.querySelector(s);
const el = {
  top: $('#top'),
  terug: $('#btn-terug'),
  titel: $('#top-titel'),
  teller: $('#top3-teller'),
  stempelteller: $('#stempel-teller'),
  aftel: $('#aftel'),
  start: $('#scherm-start'),
  podium: $('#podium'),
  paneel: $('#paneel'),
  vergelijk: $('#scherm-vergelijk'),
  dialoog: $('#dialoog'),
  welkom: $('#welkom'),
  overslaan: $('#btn-overslaan'),
  vluchtinfo: $('#vluchtinfo'),
};

const SCHERMEN = ['start', 'koffer', 'hal', 'gate', 'b', 'vergelijk', 'uitslag'];
let kaartOk = false;
let stopVlucht = null;

const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const sterksteKosten = (o) => kosten(o, o.huizen[0]).totaal;
const ontdekt = (id) => staat().bezocht.includes(id);
const figuren = () => meta().groep_figuren?.lijst ?? [];
const themaMetPatroon = (o) => thema(o);
const landMotieven = (naam) => (meta().landen[naam]?.motieven ?? []).filter(heeftMotief).map((m) => motief(m)).join('');

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
  $('#btn-paspoort').insertAdjacentHTML('afterbegin', icoon('paspoort'));
  $('#btn-koffer').innerHTML = icoon('koffer');
  el.terug.innerHTML = `${icoon('terug')}<span>Vertrekhal</span>`;

  kaartOk = kaart.maakKaart({ opPin: instappen, opWolk: (landNaam) => (location.hash = `#/gate/${encodeURIComponent(landNaam)}`) });
  window.addEventListener('hashchange', route);
  document.addEventListener('click', klik);
  $('#btn-top3').addEventListener('click', toonTop3);
  $('#btn-paspoort').addEventListener('click', toonPaspoort);
  el.overslaan.addEventListener('click', () => stopVlucht?.());
  document.addEventListener('staatgewijzigd', werkTellersBij);
  werkTellersBij();
  tekenAftelklok();
  setInterval(tekenAftelklok, 60000);
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

function tekenAftelklok() {
  const van = meta().periode?.van;
  if (!van) return (el.aftel.hidden = true);
  const dagen = Math.ceil((new Date(`${van}T00:00:00`) - Date.now()) / 86400000);
  el.aftel.hidden = dagen < 0;
  el.aftel.innerHTML = `${icoon('klok')}<span><b>${dagen}</b> ${dagen === 1 ? 'dag' : 'dagen'}</span>`;
  el.aftel.setAttribute('aria-label', `Nog ${dagen} dagen tot vertrek`);
  el.aftel.title = `Nog ${dagen} dagen tot vertrek`;
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
  sluitWelkom();
  stopSpel();

  if (!staat().profiel || !staat().avatar) scherm = 'start';
  else if (!SCHERMEN.includes(scherm)) scherm = 'hal';
  if ((scherm === 'gate' && !landNamen().includes(a)) || (scherm === 'b' && !optie(a))) scherm = 'hal';

  const opPodium = ['hal', 'gate', 'b'].includes(scherm);
  document.body.dataset.scherm = scherm;
  el.start.hidden = !['start', 'koffer'].includes(scherm);
  el.podium.hidden = !opPodium;
  el.vergelijk.hidden = !['vergelijk', 'uitslag'].includes(scherm);
  el.top.hidden = scherm === 'start';
  el.terug.hidden = scherm === 'hal';
  // in een land kleurt ook de bovenbalk mee
  const themaLand = scherm === 'b' ? optie(a) : scherm === 'gate' ? { land: a } : null;
  el.top.style.cssText = themaLand ? themaStijl(themaLand) : '';
  el.top.classList.toggle('land', !!themaLand);
  if (!themaLand) {
    el.paneel.className = 'paneel';
    el.paneel.style.cssText = '';
  }

  if (scherm === 'start') toonStart();
  else if (scherm === 'koffer') toonKoffer();
  else if (scherm === 'hal') toonHal();
  else if (scherm === 'gate') toonGate(a);
  else if (scherm === 'b') aankomst(optie(a), b);
  else if (scherm === 'uitslag') toonUitslag();
  else toonVergelijk(el.vergelijk, a);

  window.scrollTo(0, 0);
  el.paneel.scrollTop = 0;
  const kop = $('main h1');
  if (kop && el.welkom.hidden) {
    kop.tabIndex = -1;
    kop.focus({ preventScroll: true });
  }
}

// --- wie ben jij ---

function kiesFiguur(id) {
  const f = figuren().find((x) => x.id === id);
  if (!f) return;
  const s = staat();
  const deel = { figuur: id, avatar: Object.fromEntries(UITERLIJK.map((k) => [k, f[k]])) };
  const p = profiel(f.profiel) ?? kiesbareProfielen()[0];
  if (p && p.id !== s.profiel) Object.assign(deel, { profiel: p.id, koffer: [...(p.wensen ?? [])], gewichten: profielGewichten(p) });
  wijzig(deel);
}

function bouwer() {
  const a = staat().avatar ?? {};
  const staal = (soort, kleur) => `<button type="button" class="staal" data-av="${soort}" data-w="${kleur}" aria-pressed="${a[soort] === kleur}" aria-label="${soort} ${kleur}" style="--k:${kleur}"></button>`;
  const aanuit = (soort, naam) => `<button type="button" class="keuze" data-av="${soort}" data-w="${!a[soort]}" aria-pressed="${!!a[soort]}">${naam}</button>`;
  return `
    <div class="bouwrij"><span>Haar</span><div>${KEUZES.haar.map(([id, naam]) => `<button type="button" class="keuze" data-av="haar" data-w="${id}" aria-pressed="${a.haar === id}">${naam}</button>`).join('')}</div></div>
    <div class="bouwrij"><span>Haarkleur</span><div>${KEUZES.haarkleur.map((k) => staal('haarkleur', k)).join('')}</div></div>
    <div class="bouwrij"><span>Huid</span><div>${KEUZES.huid.map((k) => staal('huid', k)).join('')}</div></div>
    <div class="bouwrij"><span>Shirt</span><div>${KEUZES.shirt.map((k) => staal('shirt', k)).join('')}</div></div>
    <div class="bouwrij"><span>Extra</span><div>${KEUZES.extra.map(([id, naam]) => aanuit(id, naam)).join('')}</div></div>`;
}

function toonStart() {
  const s = staat();
  const m = meta();
  const groot = figuren().filter((f) => !f.kind);
  const klein = figuren().filter((f) => f.kind);
  el.start.innerHTML = `<div class="intro">
    <p class="kicker">${esc(m.reisdata)}</p>
    <h1>${esc(m.titel)}</h1>
    <p class="lead">${opties().length} geheime bestemmingen, één week samen weg. Jij mag ze gaan ontdekken. Eerst even:</p>

    <h2 id="wie">Wie van ons ben jij?</h2>
    <div class="wie" role="radiogroup" aria-labelledby="wie">
      ${groot.map((f, i) => `<label class="figuur">
        <input type="radio" name="figuur" value="${esc(f.id)}"${s.figuur === f.id ? ' checked' : ''} aria-label="Poppetje ${i + 1}">
        <span class="figuur-in">${poppetje(s.figuur === f.id ? s.avatar : f)}</span>
      </label>`).join('')}
    </div>
    ${klein.length ? `<p class="kleintjes">${klein.map((f) => poppetje(f)).join('')}<span class="hand">en de kleintjes gaan ook mee</span></p>` : ''}

    <div id="ikzelf"${s.figuur ? '' : ' hidden'}>
      <label class="veld" for="naam">Je voornaam</label>
      <input id="naam" type="text" autocomplete="given-name" maxlength="20" value="${esc(s.naam)}" placeholder="Voor op je instapkaart">
      <details class="pasaan">
        <summary>Lijkt het niet? Pas je poppetje aan</summary>
        <div id="bouwer">${s.avatar ? bouwer() : ''}</div>
      </details>
      <p class="klein">Je naam en je poppetje blijven alleen op dit apparaat staan.</p>
    </div>

    <button type="button" class="knop primair groot" id="start-verder"${s.figuur ? '' : ' disabled'}>Koffer pakken${icoon('verder')}</button>
  </div>`;

  const verder = $('#start-verder');
  const tekenGekozen = () => {
    const gekozen = el.start.querySelector('input[name=figuur]:checked');
    if (gekozen) gekozen.nextElementSibling.innerHTML = poppetje(staat().avatar);
    $('#bouwer').innerHTML = bouwer();
  };
  el.start.querySelector('.wie').addEventListener('change', (e) => {
    const vorige = staat().figuur;
    if (vorige) {
      const oud = el.start.querySelector(`input[value="${vorige}"]`);
      if (oud) oud.nextElementSibling.innerHTML = poppetje(figuren().find((f) => f.id === vorige));
    }
    kiesFiguur(e.target.value);
    $('#ikzelf').hidden = false;
    verder.disabled = false;
    tekenGekozen();
  });
  $('#bouwer').addEventListener('click', (e) => {
    const knop = e.target.closest('[data-av]');
    if (!knop) return;
    const waarde = { true: true, false: false }[knop.dataset.w] ?? knop.dataset.w;
    wijzig({ avatar: { ...staat().avatar, [knop.dataset.av]: waarde } });
    tekenGekozen();
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
    <div class="kop-met-pop">${poppetje(s.avatar)}<div>
      <p class="kicker">Koffer van ${esc(s.naam || 'jou')}</p>
      <h1>Wat wil jij kunnen deze week?</h1>
    </div></div>
    <p class="lead">Tik iets aan om het in of uit je koffer te doen. Hoe meer er op een plek van kan, hoe hoger je koffermatch.</p>

    <fieldset class="segment" id="profielkeuze">
      <legend>Begin met de koffer van</legend>
      ${kiesbareProfielen().map((p) => `<label><input type="radio" name="profiel" value="${esc(p.id)}"${p.id === s.profiel ? ' checked' : ''}><span>${esc(p.naam)}</span></label>`).join('')}
    </fieldset>

    <div class="wensen" id="wensen"></div>
    <p class="klein">${esc(meta().profielen.toelichting)}</p>
    <div class="kofferbalk">
      <span class="koffertel">${icoon('koffer')}<span id="koffer-n" aria-live="polite">${tel()}</span></span>
      <a class="knop primair" href="#/hal">Naar de vertrekhal${icoon('verder')}</a>
    </div>
  </div>`;

  const wensen = $('#wensen');
  const teken = () => {
    const koffer = staat().koffer;
    wensen.innerHTML = categorieen().map((c) => `<button type="button" class="wens" data-wens="${esc(c.id)}" aria-pressed="${koffer.includes(c.id)}">
      <span class="wens-ico">${icoon(c.id)}</span>
      <span class="wens-naam">${esc(c.naam)}</span>
      <span class="wens-vink">${icoon('check')}</span>
    </button>`).join('');
    $('#koffer-n').textContent = tel();
  };
  teken();

  wensen.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-wens]');
    if (!knop) return;
    const id = knop.dataset.wens;
    const koffer = staat().koffer;
    const erin = !koffer.includes(id);
    wijzig({ koffer: erin ? [...koffer, id] : koffer.filter((x) => x !== id) });
    knop.setAttribute('aria-pressed', erin);
    $('#koffer-n').textContent = tel();
  });
  $('#profielkeuze').addEventListener('change', (e) => {
    const p = profiel(e.target.value);
    if (!p) return;
    wijzig({ profiel: p.id, koffer: [...(p.wensen ?? [])], gewichten: profielGewichten(p) });
    teken();
  });
}

// --- vertrekhal ---

function bordRij(o) {
  const s = staat();
  const bekend = s.bezocht.includes(o.id);
  const match = koffermatch(o, s.koffer);
  const naam = bekend ? regels(o.naam.replace(/^[^:]+:\s*/, ''), 17) : null;
  return `<li><button type="button" class="bordrij${bekend ? ' bekend' : ''}" data-instappen="${esc(o.id)}" aria-label="Gate ${gateCode(o)}: ${bekend ? esc(o.naam) : 'geheime bestemming'}, ${esc(o.vlucht.duur)} vliegen">
    <span class="b-gate">${flaps(gateCode(o), 2)}</span>
    <span class="b-naam">${bekend ? naam.map((regel) => flaps(regel, 17)).join('') : flaps('? ? ? ? ?', 9)}</span>
    <span class="b-info"><span>${esc(o.vlucht.duur)}</span>${bekend ? `<span>${o.klimaat?.zee == null ? 'geen zee' : `zee ${esc(o.klimaat.zee)}°`}</span><span>${euro(sterksteKosten(o))}</span>` : ''}<span class="b-match">${match ? `${pct(match.score)} match` : ''}</span></span>
  </button></li>`;
}

function toonHal() {
  const s = staat();
  const m = meta();
  const totaal = opties().length;
  const gezien = s.bezocht.length;
  const rondjes = opties()
    .filter((o) => s.bezocht.includes(o.id) && o.pils?.rondje_mannen != null)
    .sort((a, b) => a.pils.rondje_mannen - b.pils.rondje_mannen)
    .slice(0, 3);
  el.paneel.innerHTML = `
    <div class="kop-met-pop">${poppetje(s.avatar)}<div>
      <p class="kicker">Vertrekhal ${esc(m.vertrek.naam)}</p>
      <h1>${s.naam ? `Hoi ${esc(s.naam)}. ` : ''}Kies een land.</h1>
    </div></div>
    <p class="lead">Elk land heeft zijn eigen geheime plekken. Waar je precies landt, zie je pas als je er bent.</p>

    <div class="gates">
      ${landNamen().map((naam) => {
        const lijst = optiesIn(naam);
        const n = lijst.filter((o) => s.bezocht.includes(o.id)).length;
        return `<a class="gate" href="#/gate/${encodeURIComponent(naam)}" style="${thema({ land: naam })}">
          <span class="gate-letter" aria-hidden="true">${gateLetter(naam)}</span>
          <span class="gate-motief" aria-hidden="true">${landMotieven(naam)}</span>
          <strong>${esc(naam)}</strong>
          <span class="gate-stand" aria-label="${n} van ${lijst.length} ontdekt">${lijst.map((o) => `<i class="${s.bezocht.includes(o.id) ? 'aan' : ''}"></i>`).join('')}</span>
        </a>`;
      }).join('')}
    </div>

    <p class="voortgang"><span class="hand">${gezien === 0 ? 'nog niks ontdekt, ga maar vliegen' : gezien === totaal ? 'alles gezien!' : `${gezien} van de ${totaal} plekken ontdekt`}</span></p>
    <div class="acties">
      <button type="button" class="knop" data-spel>${icoon('hooghouden')}Hooghouden</button>
      ${gezien >= 2 ? `<a class="knop" href="#/vergelijk">Vergelijk wat je kent</a>` : ''}
    </div>

    ${rondjes.length ? `<div class="rondjes">
      <h2>${icoon('bier')}Goedkoopste rondje</h2>
      <ol>${rondjes.map((o) => `<li><span>${esc(o.naam)}</span><strong>${euro(o.pils.rondje_mannen, 2)}</strong></li>`).join('')}</ol>
      <p class="klein">Van de plekken die je al kent.</p>
    </div>` : ''}

    <h2>Vertrekbord</h2>
    <div class="bord" id="bord"><ul>${opties().map(bordRij).join('')}</ul></div>

    <div class="groepje" aria-hidden="true">${figuren().map((f) => poppetje(f.id === s.figuur ? { ...f, ...s.avatar } : f, `${f.id === s.figuur ? 'ik' : ''}${f.groot ? ' groot' : ''}`)).join('')}</div>
    <p class="hand midden">${esc(m.groep)}</p>
    ${bronnenBlok()}`;
  draai($('#bord'));
  kaart.toonHal(s.bezocht);
}

// --- gate ---

function mysterieKaart(o) {
  const s = staat();
  const match = koffermatch(o, s.koffer);
  const tips = categorieen()
    .filter((c) => o.mogelijkheden?.[c.id]?.[0] === 'ja')
    .sort((a, b) => s.koffer.includes(b.id) - s.koffer.includes(a.id))
    .slice(0, 4);
  return `<article class="mysterie" style="${thema(o)}">
    <header><span class="gatecode">${gateCode(o)}</span><strong>Mysterievlucht</strong><span class="vraagteken" aria-hidden="true">?</span></header>
    <div class="mysterie-in">
      <p class="hand">hier kan in elk geval:</p>
      <ul class="tips">${tips.map((c) => `<li>${icoon(c.id)}${esc(c.naam)}</li>`).join('')}</ul>
      <dl class="kerncijfers drie">
        <div><dt>Vliegen</dt><dd>${esc(o.vlucht.duur)}</dd></div>
        <div><dt>Zee</dt><dd>${o.klimaat?.zee == null ? 'geen' : `${esc(o.klimaat.zee)}°C`}</dd></div>
        <div><dt>Koffermatch</dt><dd>${match ? pct(match.score) : '--'}</dd></div>
      </dl>
      <button type="button" class="knop primair groot" data-instappen="${esc(o.id)}">${icoon('vliegtuig')}Instappen</button>
    </div>
  </article>`;
}

function ontdekteKaart(o) {
  const match = koffermatch(o, staat().koffer);
  return `<article class="optiekaart" style="${themaMetPatroon(o, land(o).kleuren?.licht)}">
    <header>
      <p class="kicker">${esc(o.land)} · gate ${gateCode(o)}</p>
      <h2>${esc(o.naam)}</h2>
      <p>${esc(o.subregio)}</p>
      ${hartKnop(o.id, o.naam)}
    </header>
    <div class="optiekaart-in">
      <p class="tagline">${esc(o.tagline)}</p>
      <dl class="kerncijfers">
        <div><dt>Vliegen</dt><dd>${esc(o.vlucht.duur)}</dd></div>
        <div><dt>Zee</dt><dd>${o.klimaat?.zee == null ? 'geen' : `${esc(o.klimaat.zee)}°C`}</dd></div>
        <div><dt>Per persoon</dt><dd>${euro(sterksteKosten(o))}</dd></div>
        <div><dt>Match</dt><dd>${match ? pct(match.score) : '--'}</dd></div>
      </dl>
      <div class="acties">
        <a class="knop primair" href="#/b/${esc(o.id)}">Bekijk opnieuw</a>
        <button type="button" class="knop" data-instappen="${esc(o.id)}">${icoon('vliegtuig')}Vlieg nog eens</button>
      </div>
    </div>
  </article>`;
}

function toonGate(naam) {
  const s = staat();
  const lijst = optiesIn(naam);
  const l = meta().landen[naam] ?? {};
  const open = lijst.filter((o) => !s.bezocht.includes(o.id)).length;
  el.paneel.className = 'paneel thema';
  el.paneel.style.cssText = thema({ land: naam });
  el.paneel.innerHTML = `
    <div class="best-band">
      <p class="kicker">Gate ${gateLetter(naam)}</p>
      <h1>${esc(naam)}</h1>
      <p class="best-groet"><span class="hand">${esc(l.welkom)}</span><span class="motieven" aria-hidden="true">${landMotieven(naam)}</span></p>
    </div>
    <p class="lead">${esc(l.intro)}</p>
    <p class="hand">${open === 0 ? 'je hebt hier alles gezien' : open === 1 ? (lijst.length === 1 ? 'één plek, maar waar precies?' : 'nog één vlucht te gaan') : `nog ${open} plekken te ontdekken`}</p>
    <div class="optiekaarten">${lijst.map((o) => (s.bezocht.includes(o.id) ? ontdekteKaart(o) : mysterieKaart(o))).join('')}</div>`;
  kaart.toonGate(naam, s.bezocht);
}

// --- aankomst ---

function aankomst(o, tab) {
  const s = staat();
  const nieuw = !s.bezocht.includes(o.id);
  if (nieuw) wijzig({ bezocht: [...s.bezocht, o.id] });
  toonBestemming(el.paneel, o, tab, true);
  werkTellersBij();
  if (nieuw) toonWelkom(o);
}

function toonWelkom(o) {
  const totaal = opties().length;
  const aantal = staat().bezocht.length;
  el.welkom.style.cssText = themaMetPatroon(o, land(o).kleuren?.licht);
  el.welkom.innerHTML = `<div class="welkom-in">
    <p class="welkom-klein">Geland op ${esc(o.luchthaven.naam)} (${esc(o.luchthaven.code)})</p>
    <p class="welkom-groet">${esc(land(o).welkom)}</p>
    <h2>${esc(o.naam)}</h2>
    <p class="welkom-waar">${esc(o.subregio)}, ${esc(o.land)}</p>
    <div class="stempelplek plof" style="--kantel:${kanteling(o.id)}deg">${stempel(o.stempel)}<i></i><i></i><i></i><i></i></div>
    <p class="hand">stempel ${aantal} van ${totaal} in je paspoort</p>
    <button type="button" class="knop licht groot" id="welkom-verder">Kijk rond${icoon('verder')}</button>
  </div>`;
  el.welkom.hidden = false;
  const knop = $('#welkom-verder');
  knop.addEventListener('click', () => {
    sluitWelkom();
    if (aantal === totaal) toonPaspoort();
  });
  knop.focus({ preventScroll: true });
}

function sluitWelkom() {
  el.welkom.hidden = true;
  el.welkom.innerHTML = '';
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
  return new Date(`${van}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' }).replace('.', '');
}

function instappen(id) {
  const o = optie(id);
  if (!o) return;
  const s = staat();
  const v = meta().vertrek;
  const carrier = meta().carriers?.[o.carrier];
  const naam = s.naam || 'Reiziger';
  const bekend = s.bezocht.includes(o.id);
  const streepjes = Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + ((i * 7 + o.id.length) % 4)}px"></i>`).join('');
  el.dialoog.innerHTML = `
    <div class="instapkaart${bekend ? '' : ' geheim'}" style="${thema(o)}">
      <header><span>Instapkaart</span><span>${esc(carrier?.naam ?? o.vlucht.maatschappijen)}</span></header>
      <div class="ik-passagier">
        <div class="ik-foto">${poppetje(s.avatar)}</div>
        <dl><dt>Passagier</dt><dd>${esc(naam)}</dd></dl>
      </div>
      <div class="ik-route">
        <div><span class="ik-code">${esc(v.code)}</span><span>${esc(v.naam)}</span></div>
        <div class="ik-lijn">${toestelZij(carrier)}<span>${esc(o.vlucht.duur)}</span></div>
        <div><span class="ik-code">${bekend ? esc(o.luchthaven.code) : '???'}</span><span>${bekend ? esc(o.luchthaven.naam) : 'geheim'}</span></div>
      </div>
      <dl class="ik-velden">
        <div class="breed"><dt>Bestemming</dt><dd>${bekend ? esc(o.naam) : 'Dat zie je als je er bent'}</dd></div>
        <div><dt>Datum</dt><dd>${esc(reisdatum())}</dd></div>
        <div><dt>Gate</dt><dd>${gateCode(o)}</dd></div>
        <div><dt>Stoel</dt><dd>${stoel(naam, o.id)}</dd></div>
        <div class="breed"><dt>Vluchten per week</dt><dd>${esc(o.vlucht.per_week)}</dd></div>
        <div class="breed"><dt>Vluchtprijs <span class="indicatie">indicatie</span></dt><dd>${euro(o.vlucht.prijs_pp)} p.p.</dd></div>
      </dl>
      <div class="ik-streepjes" aria-hidden="true">${streepjes}</div>
      <p class="ik-noot">${esc(meta().carriers?.toelichting)}</p>
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop" data-sluit>Toch niet</button>
      ${bekend ? `<a class="knop" href="#/b/${esc(o.id)}">Direct erheen</a>` : ''}
      <button type="button" class="knop primair" id="vertrek" autofocus>${icoon('vliegtuig')}Vertrek</button>
    </div>`;
  el.dialoog.onclick = null;
  el.dialoog.className = 'dialoog';
  el.dialoog.setAttribute('aria-label', bekend ? `Instapkaart naar ${o.naam}` : 'Instapkaart voor een geheime bestemming');
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
  el.vluchtinfo.textContent = `${meta().vertrek.code} naar ${ontdekt(o.id) ? o.luchthaven.code : '???'} · ${o.vlucht.duur}`;
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

// ---------- paspoort, favorieten en top 3 ----------

function werkTellersBij() {
  const s = staat();
  for (const knop of document.querySelectorAll('[data-hart]')) {
    knop.setAttribute('aria-pressed', s.top3.includes(knop.dataset.hart));
  }
  el.teller.textContent = s.top3.length;
  el.teller.hidden = s.top3.length === 0;
  $('#btn-top3').setAttribute('aria-label', `Mijn top 3 (${s.top3.length} gekozen)`);
  el.stempelteller.textContent = s.bezocht.length;
  el.stempelteller.hidden = s.bezocht.length === 0;
  $('#btn-paspoort').setAttribute('aria-label', `Paspoort (${s.bezocht.length} van ${opties().length} stempels)`);
}

function toonPaspoort() {
  el.dialoog.onclick = null;
  el.dialoog.innerHTML = `${paspoort()}<div class="dialoog-acties"><button type="button" class="knop" data-sluit>Dichtklappen</button></div>`;
  el.dialoog.className = 'dialoog breed';
  el.dialoog.setAttribute('aria-label', 'Paspoort');
  el.dialoog.showModal();
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
  werkTellersBij();
}

function top3Tekst() {
  const s = staat();
  const kop = s.top3.length === 3 ? 'Mijn top 3' : 'Mijn favorieten tot nu toe';
  const regelsTekst = s.top3.map((id, i) => {
    const o = optie(id);
    const match = koffermatch(o, s.koffer);
    return `${i + 1}. ${o.naam} (${o.land}): ca. ${euro(sterksteKosten(o))} p.p.${match ? `, koffermatch ${pct(match.score)}` : ''}`;
  });
  return `${kop} voor ${meta().titel}${s.naam ? ` (${s.naam})` : ''}:\n${regelsTekst.join('\n')}`;
}

function toonTop3() {
  const teken = () => {
    const s = staat();
    const leeg = s.top3.length === 0;
    el.dialoog.innerHTML = `<div class="dialoog-in">
      <h2>Mijn top 3</h2>
      ${leeg
        ? '<p>Nog leeg. Tik op het hartje bij een bestemming die je hebt ontdekt om hem hier te zetten.</p>'
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
      <button type="button" class="knop primair" id="kopieer-top3"${leeg ? ' disabled' : ''}>${icoon('kopieer')}Mijn top 3 kopiëren</button>
      <button type="button" class="knop" id="maak-kaart"${leeg ? ' disabled' : ''}>Ansichtkaart</button>
      <a class="knop" href="#/uitslag">Groepsuitslag</a>
      <button type="button" class="knop" data-sluit>Sluiten</button>
    </div>`;
    $('#maak-kaart').addEventListener('click', toonAnsichtkaart);
    $('#kopieer-top3').addEventListener('click', async () => {
      const tekst = top3Tekst();
      el.dialoog.close();
      await kopieer(tekst, 'Je top 3 is gekopieerd: plak hem in de groepsapp');
    });
  };

  el.dialoog.onclick = (e) => {
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
    werkTellersBij();
    teken();
  };
  teken();
  el.dialoog.className = 'dialoog';
  el.dialoog.setAttribute('aria-label', 'Mijn top 3');
  el.dialoog.showModal();
}

// ---------- groepsuitslag en ansichtkaart ----------

function toonUitslag() {
  const code = mijnCode();
  el.vergelijk.innerHTML = `<div class="vgl uitslag">
    <p class="kicker">${esc(meta().reisdata)}</p>
    <h1>Groepsuitslag</h1>
    <p class="lead">Iedereen deelt zijn code in de groepsapp. Plak hier alle berichten in één keer, dan tellen we de punten.</p>

    <div class="codevak">
      <p class="kicker">Jouw code</p>
      ${code
        ? `<code id="mijn-code">${esc(code)}</code><button type="button" class="knop primair" id="kopieer-code">${icoon('kopieer')}Kopieer mijn code</button>`
        : '<p>Kies eerst je top 3 met de hartjes, dan krijg je hier je code.</p>'}
    </div>

    <label class="veld" for="codes">Codes van de anderen</label>
    <textarea id="codes" rows="4" placeholder="Plak hier de berichten uit de groepsapp. Tekst eromheen is geen probleem.">${esc(staat().codes ?? '')}</textarea>
    <p class="klein">Een eerste plek is 3 punten waard, een tweede 2 en een derde 1. Er gaat niets naar een server.</p>
    <div id="uitslag-lijst"></div>
  </div>`;

  const teken = () => {
    const s = staat();
    const eigen = code ? leesCodes(code) : [];
    const anderen = leesCodes(s.codes ?? '').filter((d) => !eigen.some((e) => e.naam.toLowerCase() === d.naam.toLowerCase()));
    const deelnemers = [...eigen, ...anderen];
    const rijen = uitslag(deelnemers);
    $('#uitslag-lijst').innerHTML = deelnemers.length ? `
      <h2>${deelnemers.length === 1 ? '1 stem geteld' : `${deelnemers.length} stemmen geteld`}</h2>
      <p class="dim">${deelnemers.map((d) => esc(d.naam)).join(', ')}</p>
      <ol class="uitslaglijst">${rijen.map((r, i) => {
        const bekend = s.bezocht.includes(r.o.id);
        return `<li style="${themaStijl(r.o)}">
          <span class="plek">${i + 1}</span>
          <span class="uitslag-naam"><strong>${bekend ? esc(r.o.naam) : `Nog geheim voor jou (gate ${gateCode(r.o)})`}</strong>
            <span class="dim">${esc(r.o.land)} · ${r.wie.map((w) => `${esc(w.naam)} (${w.plek}e)`).join(', ')}</span>
            ${r.match == null ? '' : `<span class="dim">gezamenlijke koffermatch ${pct(r.match)}</span>`}</span>
          <span class="punten"><b>${r.punten}</b>${r.punten === 1 ? 'punt' : 'punten'}</span>
        </li>`;
      }).join('')}</ol>` : '<p class="leeg">Nog geen codes gevonden.</p>';
  };

  $('#kopieer-code')?.addEventListener('click', () => kopieer(`Mijn vakantiecode: ${code}`, 'Code gekopieerd: plak hem in de groepsapp'));
  $('#codes').addEventListener('input', (e) => {
    wijzig({ codes: e.target.value });
    teken();
  });
  teken();
}

async function toonAnsichtkaart() {
  el.dialoog.onclick = null;
  el.dialoog.innerHTML = `<div class="dialoog-in">
      <h2>Je ansichtkaart</h2>
      <canvas id="ansicht" class="ansicht" role="img" aria-label="Ansichtkaart met je top 3 en hun stempels"></canvas>
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop primair" id="kaart-download">Download als PNG</button>
      <button type="button" class="knop" id="kaart-deel" hidden>Delen</button>
      <button type="button" class="knop" data-sluit>Sluiten</button>
    </div>`;
  el.dialoog.className = 'dialoog breed';
  el.dialoog.setAttribute('aria-label', 'Ansichtkaart');
  if (!el.dialoog.open) el.dialoog.showModal();
  const canvas = $('#ansicht');
  await tekenAnsichtkaart(canvas);
  const alsBestand = () => new Promise((klaar) => canvas.toBlob((blob) => klaar(blob && new File([blob], kaartNaam(), { type: 'image/png' })), 'image/png'));
  $('#kaart-download')?.addEventListener('click', async () => {
    const bestand = await alsBestand();
    if (!bestand) return toast('De kaart kon niet worden opgeslagen');
    const link = Object.assign(document.createElement('a'), { href: URL.createObjectURL(bestand), download: bestand.name });
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  });
  const deel = $('#kaart-deel');
  const proef = await alsBestand();
  if (deel && proef && navigator.canShare?.({ files: [proef] })) {
    deel.hidden = false;
    deel.addEventListener('click', async () => {
      try {
        await navigator.share({ files: [await alsBestand()], title: meta().titel });
      } catch {
        // delen afgebroken: niets aan de hand
      }
    });
  }
}

// ---------- klikken ----------

function klik(e) {
  const hart = e.target.closest('[data-hart]');
  if (hart) return wisselHart(hart.dataset.hart);
  const spel = e.target.closest('[data-spel]');
  if (spel) return speel(optie(spel.dataset.spel) ?? optie(staat().bezocht.at(-1)) ?? null);
  const instap = e.target.closest('[data-instappen]');
  if (instap) return instappen(instap.dataset.instappen);
  if (e.target.closest('[data-sluit], dialog a') || e.target === el.dialoog) el.dialoog.close();
}

begin();
