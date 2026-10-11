// Start van de site: laadt de data, regelt de schermen (via de hash) en de vaste onderdelen
// zoals de instapkaart, de vlucht, de aankomst, het paspoort en de top 3.

import {
  laadData, kiesDataTaal, meta, opties, optie, landNamen, landNaam, optiesIn, categorieen, criteria, land,
  koffermatch, kosten, gateLetter, gateCode,
  euro, pct, esc, themaStijl,
} from './js/data.js';
import { laadStaat, staat, wijzig, wisStaat } from './js/store.js';
import { t, zetTaal, huidigeTaal, voorkeurstaal, locale } from './js/i18n.js';
import { icoon } from './js/icons.js';
import { toast, kopieer, hartKnop, bronnenBlok } from './js/ui.js';
import * as kaart from './js/map.js';
import { toonBestemming } from './js/destination.js';
import { toonVergelijk } from './js/compare.js';
import { toonHuizen } from './js/houses.js';
import { poppetje, KEUZES, UITERLIJK } from './js/avatar.js';
import { thema } from './js/patterns.js';
import { motief, heeftMotief } from './js/motifs.js';
import { speel, stopSpel, totaalHooghouden } from './js/game.js';
import { mijnCode, leesCodes, uitslag, huizenUitslag, vanCode } from './js/group.js';
import { figuurNaam } from './js/extras.js';
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

const SCHERMEN = ['start', 'koffer', 'hal', 'gate', 'b', 'vergelijk', 'uitslag', 'huizen'];
let landingsTab = null; // tabblad waarop je na een vlucht uitkomt (bijvoorbeeld 'huis' vanuit Alle huizen)
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
  zetTaal(staat().taal ?? voorkeurstaal());
  try {
    await laadData();
  } catch {
    $('#inhoud').innerHTML = `<p class="laadfout">${t('De reisgegevens konden niet worden geladen. Ververs de pagina om het opnieuw te proberen.', 'The trip details could not be loaded. Refresh the page to try again.')}</p>`;
    return;
  }
  await kiesDataTaal(huidigeTaal());
  ruimStaatOp();
  leesNamen();
  tekenVast();
  $('#btn-taal').addEventListener('click', wisselTaal);

  kaartOk = kaart.maakKaart({ opPin: instappen, opWolk: (landNaam) => (location.hash = `#/gate/${encodeURIComponent(landNaam)}`) });
  window.addEventListener('hashchange', route);
  document.addEventListener('click', klik);
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
    top3: s.top3.filter(bestaat).slice(0, 3),
    bezocht: s.bezocht.filter(bestaat),
    koffer: s.koffer.filter((id) => cats.has(id)),
    gewichten: Object.fromEntries(criteria().map((c) => [c, s.gewichten[c] ?? 1])),
  });
}

// De vaste teksten buiten de schermen: opnieuw gezet bij het wisselen van taal.
function tekenVast() {
  document.documentElement.lang = huidigeTaal();
  document.title = meta().titel;
  el.titel.textContent = meta().titel;
  el.overslaan.textContent = t('Overslaan', 'Skip');
  $('.skip').textContent = t('Naar de inhoud', 'Skip to content');
  $('#kaart').setAttribute('aria-label', t('Kaart met Schiphol en alle bestemmingen', 'Map with Schiphol and all destinations'));
  const taalknop = $('#btn-taal');
  taalknop.textContent = huidigeTaal() === 'nl' ? 'EN' : 'NL';
  taalknop.setAttribute('aria-label', huidigeTaal() === 'nl' ? 'Switch to English' : 'Wissel naar Nederlands');
  taalknop.lang = huidigeTaal() === 'nl' ? 'en' : 'nl';
  $('#spel').setAttribute('aria-label', t('Hooghouden', 'Keepy-uppies'));
  el.welkom.setAttribute('aria-label', t('Aangekomen', 'Arrived'));
  $('#toast').textContent = '';
  $('.leaflet-control-zoom-in')?.setAttribute('title', t('Inzoomen', 'Zoom in'));
  $('.leaflet-control-zoom-out')?.setAttribute('title', t('Uitzoomen', 'Zoom out'));
  tekenOnderbalk();
  tekenAftelklok();
}

// De vaste navigatie onderin: landen, paspoort, top 3, vergelijken en je eigen poppetje.
// Zichtbaar zodra je voor het eerst in de vertrekhal bent geweest.
function tekenOnderbalk() {
  const s = staat();
  const scherm = document.body.dataset.scherm;
  const hier = { hal: 'hal', gate: 'hal', b: 'hal', huizen: 'huizen', vergelijk: 'vergelijk', uitslag: 'vergelijk', start: 'ik', koffer: 'ik' }[scherm];
  const aan = (naam) => (naam === hier ? ' aria-current="page"' : '');
  const balk = $('#onderbalk');
  balk.setAttribute('aria-label', t('Hoofdmenu', 'Main menu'));
  balk.innerHTML = `
    <a href="#/hal"${aan('hal')}>${icoon('vliegtuig')}<span>${t('Landen', 'Countries')}</span></a>
    <a href="#/huizen"${aan('huizen')}>${icoon('huis')}<span>${t('Huizen', 'Houses')}</span></a>
    <button type="button" data-open="top3">${icoon('hart')}<span>Top 3</span><i class="teller" id="top3-teller" hidden></i></button>
    <a href="#/vergelijk"${aan('vergelijk')}>${icoon('weging')}<span>${t('Vergelijk', 'Compare')}</span></a>
    <a href="#/start" class="nav-ik"${aan('ik')}>${poppetje(s.avatar ?? {})}<span>${esc(s.naam) || t('Ik', 'Me')}</span></a>`;
  balk.hidden = !s.klaar;
  document.body.classList.toggle('met-onderbalk', !!s.klaar);
  werkTellersBij();
}

async function wisselTaal() {
  const nieuw = huidigeTaal() === 'nl' ? 'en' : 'nl';
  wijzig({ taal: nieuw });
  zetTaal(nieuw);
  await kiesDataTaal(nieuw);
  tekenVast();
  route();
}

// De voornamen staan gecodeerd in de JSON (meta.groep_figuren.namen_code), zodat ze niet als leesbare tekst
// in de openbare repo staan. Een link met ?wie=... gaat voor, bijvoorbeeld voor een andere groep.
function leesNamen() {
  const code = new URLSearchParams(location.search).get('wie') ?? meta().groep_figuren?.namen_code;
  if (!code) return;
  try {
    const lijst = JSON.parse(vanCode(code));
    if (Array.isArray(lijst)) wijzig({ namen: lijst.slice(0, 12).map((naam) => String(naam ?? '').trim().slice(0, 20)) });
  } catch {
    // geen leesbare namen: de poppetjes blijven naamloos
  }
}

function tekenAftelklok() {
  const van = meta().periode?.van;
  if (!van) return (el.aftel.hidden = true);
  const dagen = Math.ceil((new Date(`${van}T00:00:00`) - Date.now()) / 86400000);
  el.aftel.hidden = dagen < 0;
  el.aftel.innerHTML = `${icoon('klok')}<span><b>${dagen}</b> ${dagen === 1 ? t('dag', 'day') : t('dagen', 'days')}</span>`;
  el.aftel.setAttribute('aria-label', t(`Nog ${dagen} dagen tot vertrek`, `${dagen} ${dagen === 1 ? 'day' : 'days'} until departure`));
  el.aftel.title = t(`Nog ${dagen} dagen tot vertrek`, `${dagen} ${dagen === 1 ? 'day' : 'days'} until departure`);
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

  if (!staat().figuur || !staat().avatar) scherm = 'start';
  else if (!SCHERMEN.includes(scherm)) scherm = 'hal';
  if ((scherm === 'gate' && !landNamen().includes(a)) || (scherm === 'b' && !optie(a))) scherm = 'hal';

  const opPodium = ['hal', 'gate', 'b', 'huizen'].includes(scherm);
  document.body.classList.remove('kaart-groot');
  document.body.dataset.scherm = scherm;
  el.start.hidden = !['start', 'koffer'].includes(scherm);
  el.podium.hidden = !opPodium;
  el.vergelijk.hidden = !['vergelijk', 'uitslag'].includes(scherm);
  el.top.hidden = false;
  // de knop linksboven gaat altijd één stap terug
  const stapTerug = {
    start: staat().figuur ? '#/hal' : null,
    koffer: '#/start',
    gate: '#/hal',
    b: `#/gate/${encodeURIComponent(optie(a)?.land ?? '')}`,
    vergelijk: '#/hal',
    uitslag: '#/hal',
    huizen: '#/hal',
  }[scherm];
  el.terug.hidden = !stapTerug;
  el.terug.href = stapTerug ?? '#/hal';
  el.terug.innerHTML = `${icoon('terug')}<span>${stapTerug === '#/hal' ? t('Vertrekhal', 'Departures') : t('Terug', 'Back')}</span>`;
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
  else if (scherm === 'huizen') toonHuizen(el.paneel);
  else if (scherm === 'gate') toonGate(a);
  else if (scherm === 'b') aankomst(optie(a), b);
  else if (scherm === 'uitslag') toonUitslag();
  else toonVergelijk(el.vergelijk, a);

  tekenOnderbalk();
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
  const lijst = figuren().filter((x) => !x.kind);
  const f = lijst.find((x) => x.id === id);
  if (!f) return;
  const s = staat();
  // de naam uit de link invullen, tenzij iemand zelf al iets anders heeft getypt
  const vorigeNaam = figuurNaam(lijst.findIndex((x) => x.id === s.figuur));
  const naam = !s.naam || s.naam === vorigeNaam ? figuurNaam(lijst.indexOf(f)) || s.naam : s.naam;
  wijzig({ figuur: id, naam, avatar: Object.fromEntries(UITERLIJK.filter((k) => f[k] != null).map((k) => [k, f[k]])) });
}

function bouwer() {
  const a = staat().avatar ?? {};
  const kies = (lijst) => lijst.map(([id, nl, en]) => [id, t(nl, en)]);
  const soortNaam = { haarkleur: t('haarkleur', 'hair colour'), huid: t('huid', 'skin'), shirt: t('shirt', 'shirt') };
  const staal = (soort, kleur) => `<button type="button" class="staal" data-av="${soort}" data-w="${kleur}" aria-pressed="${a[soort] === kleur}" aria-label="${soortNaam[soort] ?? soort} ${kleur}" style="--k:${kleur}"></button>`;
  const aanuit = (soort, naam) => `<button type="button" class="keuze" data-av="${soort}" data-w="${!a[soort]}" aria-pressed="${!!a[soort]}">${naam}</button>`;
  return `
    <div class="bouwrij"><span>${t('Haar', 'Hair')}</span><div>${kies(KEUZES.haar).map(([id, naam]) => `<button type="button" class="keuze" data-av="haar" data-w="${id}" aria-pressed="${a.haar === id}">${naam}</button>`).join('')}</div></div>
    <div class="bouwrij"><span>${t('Haarkleur', 'Hair colour')}</span><div>${KEUZES.haarkleur.map((k) => staal('haarkleur', k)).join('')}</div></div>
    <div class="bouwrij"><span>${t('Huid', 'Skin')}</span><div>${KEUZES.huid.map((k) => staal('huid', k)).join('')}</div></div>
    <div class="bouwrij"><span>${t('Shirt', 'Shirt')}</span><div>${KEUZES.shirt.map((k) => staal('shirt', k)).join('')}</div></div>
    <div class="bouwrij"><span>${t('Extra', 'Extras')}</span><div>${kies(KEUZES.extra).map(([id, naam]) => aanuit(id, naam)).join('')}</div></div>`;
}

function toonStart() {
  const s = staat();
  const m = meta();
  const groot = figuren().filter((f) => !f.kind);
  const klein = figuren().filter((f) => f.kind);
  el.start.innerHTML = `<div class="intro">
    <p class="kicker">${esc(m.reisdata)}</p>
    <h1>${esc(m.titel)}</h1>
    <p class="lead">${t(`${opties().length} geheime bestemmingen, één week samen weg. Jij mag ze gaan ontdekken. Eerst even:`, `${opties().length} secret destinations, one week away together. You get to discover them. But first:`)}</p>

    <h2 id="wie">${t('Wie van ons ben jij?', 'Which one of us are you?')}</h2>
    <div class="wie" role="radiogroup" aria-labelledby="wie">
      ${groot.map((f, i) => `<label class="figuur">
        <input type="radio" name="figuur" value="${esc(f.id)}"${s.figuur === f.id ? ' checked' : ''} aria-label="${esc(figuurNaam(i) || t(`Poppetje ${i + 1}`, `Character ${i + 1}`))}">
        <span class="figuur-in">${poppetje(s.figuur === f.id ? { ...f, ...s.avatar } : f)}</span>
        ${figuurNaam(i) ? `<span class="figuur-naam">${esc(figuurNaam(i))}</span>` : ''}
      </label>`).join('')}
    </div>
    ${klein.length ? `<p class="kleintjes">${klein.map((f) => poppetje(f)).join('')}<span class="hand">${t('en de kleintjes gaan ook mee', 'and the little ones are coming too')}</span></p>` : ''}

    <div id="ikzelf"${s.figuur ? '' : ' hidden'}>
      <label class="veld" for="naam">${t('Je voornaam', 'Your first name')}</label>
      <input id="naam" type="text" autocomplete="given-name" maxlength="20" value="${esc(s.naam)}" placeholder="${t('Voor op je instapkaart', 'For your boarding pass')}">
      <details class="pasaan"${s.klaar ? ' open' : ''}>
        <summary>${t('Lijkt het niet? Pas je poppetje aan', "Doesn't look like you? Tweak your character")}</summary>
        <div id="bouwer">${s.avatar ? bouwer() : ''}</div>
      </details>
      <p class="klein">${t('Je naam en je poppetje blijven alleen op dit apparaat staan.', 'Your name and your character stay on this device only.')}</p>
    </div>

    <button type="button" class="knop primair groot" id="start-verder"${s.figuur ? '' : ' disabled'}>${s.klaar ? t('Klaar', 'Done') : `${t('Koffer pakken', 'Pack your suitcase')}${icoon('verder')}`}</button>
    ${s.klaar ? `<a class="knop groot" href="#/koffer">${icoon('koffer')}${t('Mijn koffer aanpassen', 'Change my suitcase')}</a>` : ''}
    ${s.figuur ? resetKnop() : ''}
  </div>`;

  const verder = $('#start-verder');
  const tekenGekozen = () => {
    const gekozen = el.start.querySelector('input[name=figuur]:checked');
    if (gekozen) gekozen.nextElementSibling.innerHTML = poppetje(staat().avatar);
    if ($('#naam').value !== staat().naam) $('#naam').value = staat().naam;
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
    const nieuw = { ...staat().avatar, [knop.dataset.av]: waarde };
    if (knop.dataset.av === 'zonnebril' && waarde) nieuw.bril = false;
    if (knop.dataset.av === 'bril' && waarde) nieuw.zonnebril = false;
    if (knop.dataset.av === 'baard' && waarde) nieuw.stoppels = false;
    wijzig({ avatar: nieuw });
    tekenGekozen();
  });
  $('#naam').addEventListener('input', (e) => wijzig({ naam: e.target.value.trim() }));
  verder.addEventListener('click', () => (location.hash = staat().klaar ? '#/hal' : '#/koffer'));
}

function toonKoffer() {
  const s = staat();
  const tel = () => {
    const n = staat().koffer.length;
    return n === 1 ? t('1 wens ingepakt', '1 wish packed') : t(`${n} wensen ingepakt`, `${n} wishes packed`);
  };
  el.start.innerHTML = `<div class="intro">
    <div class="kop-met-pop">${poppetje(s.avatar)}<div>
      <p class="kicker">${t('Stap 2 van 2', 'Step 2 of 2')}</p>
      <h1>${t('Wat wil jij kunnen deze week?', 'What do you want to be able to do this week?')}</h1>
    </div></div>
    <p class="lead">${t('Tik iets aan om het in of uit je koffer te doen. Hoe meer er op een plek van kan, hoe hoger je koffermatch.', 'Tap something to put it in your suitcase or take it out. The more of it a place can offer, the higher your suitcase match.')}</p>

    <div class="wensen" id="wensen"></div>
    <div class="kofferbalk">
      <span class="koffertel">${icoon('koffer')}<span id="koffer-n" aria-live="polite">${tel()}</span></span>
      <a class="knop primair" href="#/hal">${t('Naar de vertrekhal', 'To Departures')}${icoon('verder')}</a>
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
}

// --- vertrekhal ---

function bordRij(o) {
  const s = staat();
  const bekend = s.bezocht.includes(o.id);
  const match = koffermatch(o, s.koffer);
  const naam = bekend ? regels(o.naam.replace(/^[^:]+:\s*/, ''), 17) : null;
  return `<li><button type="button" class="bordrij${bekend ? ' bekend' : ''}" data-instappen="${esc(o.id)}" aria-label="${t(`Gate ${gateCode(o)}: ${bekend ? esc(o.naam) : 'geheime bestemming'}, ${esc(o.vlucht.duur)} vliegen`, `Gate ${gateCode(o)}: ${bekend ? esc(o.naam) : 'secret destination'}, ${esc(o.vlucht.duur)} flight`)}">
    <span class="b-gate">${flaps(gateCode(o), 2)}</span>
    <span class="b-naam">${bekend ? naam.map((regel) => flaps(regel, 17)).join('') : flaps('? ? ? ? ?', 9)}</span>
    <span class="b-info"><span>${esc(o.vlucht.duur)}</span>${bekend ? `<span>${o.klimaat?.zee == null ? t('geen zee', 'no sea') : t(`zee ${esc(o.klimaat.zee)}°`, `sea ${esc(o.klimaat.zee)}°`)}</span><span>${euro(sterksteKosten(o))}</span>` : ''}<span class="b-match">${match ? `${pct(match.score)} match` : ''}</span></span>
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
  if (!s.klaar) wijzig({ klaar: true });
  const huizen = opties().reduce((n, o) => n + o.huizen.length, 0);
  el.paneel.innerHTML = `
    <div class="kop-met-pop"><a class="pop-link" href="#/start" aria-label="${t('Poppetje en naam aanpassen', 'Change character and name')}">${poppetje(s.avatar)}</a><div>
      <p class="kicker">${t(`Vertrekhal ${esc(m.vertrek.naam)}`, `${esc(m.vertrek.naam)} Departures`)}</p>
      <h1>${s.naam ? t(`Hoi ${esc(s.naam)}. `, `Hi ${esc(s.naam)}. `) : ''}${t('Wat wil je doen?', 'What would you like to do?')}</h1>
    </div></div>

    <div class="keuzes">
      <button type="button" class="keuzekaart" data-scroll="landen">
        ${icoon('vliegtuig')}
        <span><strong>${t('Ontdek de plekken', 'Discover the places')}</strong><span>${t(`Kies een land en vlieg erheen. ${gezien} van de ${totaal} gezien.`, `Pick a country and fly there. ${gezien} of ${totaal} seen.`)}</span></span>
        ${icoon('neer')}
      </button>
      <a class="keuzekaart" href="#/huizen">
        ${icoon('huis')}
        <span><strong>${t('Bekijk alle huizen', 'Browse all houses')}</strong><span>${t(`${huizen} huizen naast elkaar, met filters.`, `${huizen} houses side by side, with filters.`)}</span></span>
        ${icoon('verder')}
      </a>
      <a class="keuzekaart" href="#/vergelijk">
        ${icoon('weging')}
        <span><strong>${t('Vergelijk en kies', 'Compare and choose')}</strong><span>${s.top3.length ? t(`${s.top3.length} van 3 favorieten gekozen. Deel je top 3.`, `${s.top3.length} of 3 favourites picked. Share your top 3.`) : t('Zet je favorieten in je top 3 en deel hem met de groep.', 'Put your favourites in your top 3 and share it with the group.')}</span></span>
        ${icoon('verder')}
      </a>
    </div>

    <h2 id="landen">${t('Kies een land', 'Pick a country')}</h2>
    <p class="dim">${t('Elk land heeft geheime plekken. Waar je precies landt, zie je als je er bent.', "Every country has secret places. You'll see exactly where you land once you're there.")}</p>
    <div class="gates">
      ${landNamen().map((naam) => {
        const lijst = optiesIn(naam);
        const n = lijst.filter((o) => s.bezocht.includes(o.id)).length;
        return `<a class="gate" href="#/gate/${encodeURIComponent(naam)}" style="${thema({ land: naam })}">
          <span class="gate-letter" aria-hidden="true">${gateLetter(naam)}</span>
          <span class="gate-motief" aria-hidden="true">${landMotieven(naam)}</span>
          <strong>${esc(landNaam(naam))}</strong>
          <span class="gate-stand" aria-label="${t(`${n} van ${lijst.length} ontdekt`, `${n} of ${lijst.length} discovered`)}">${lijst.map((o) => `<i class="${s.bezocht.includes(o.id) ? 'aan' : ''}"></i>`).join('')}</span>
        </a>`;
      }).join('')}
    </div>

    <div class="voortgang">
      <button type="button" class="knop" data-open="paspoort">${icoon('paspoort')}${t(`Paspoort: ${gezien} van ${totaal} stempels`, `Passport: ${gezien} of ${totaal} stamps`)}</button>
      ${gezien < totaal ? `<button type="button" class="linkknop" data-onthul>${t('Geen zin in geheimen? Toon alle plekken', 'Not into secrets? Show all places')}</button>` : ''}
    </div>

    <h2>${t('Voor de lol', 'Just for fun')}</h2>
    <div class="acties">
      <button type="button" class="knop" data-spel>${icoon('hooghouden')}${t('Hooghouden', 'Keepy-uppies')}${totaalHooghouden() ? ` · ${totaalHooghouden()}` : ''}</button>
    </div>
    ${rondjes.length ? `<div class="rondjes">
      <h2>${icoon('bier')}${t('Goedkoopste rondje', 'Cheapest round')}</h2>
      <ol>${rondjes.map((o) => `<li><span>${esc(o.naam)}</span><strong>${euro(o.pils.rondje_mannen, 2)}</strong></li>`).join('')}</ol>
      <p class="klein">${t('Van de plekken die je al kent.', "Out of the places you've found so far.")}</p>
    </div>` : ''}

    <details class="bordvak" id="bordvak">
      <summary>${icoon('bord')}${t('Vertrekbord', 'Departure board')}</summary>
      <div class="bord" id="bord"><ul>${opties().map(bordRij).join('')}</ul></div>
    </details>

    <div class="groepje" aria-hidden="true">${figuren().map((f) => poppetje(f.id === s.figuur ? { ...f, ...s.avatar } : f, `${f.id === s.figuur ? 'ik' : ''}${f.groot ? ' groot' : ''}`)).join('')}</div>
    <p class="hand midden">${esc(m.groep)}</p>
    ${bronnenBlok()}
    ${resetKnop()}`;
  $('#bordvak').addEventListener('toggle', (e) => e.target.open && draai($('#bord')));
  el.paneel.querySelector('[data-scroll]').addEventListener('click', () => $('#landen').scrollIntoView({ block: 'start', behavior: 'smooth' }));
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
    <header><span class="gatecode">${gateCode(o)}</span><strong>${t('Mysterievlucht', 'Mystery flight')}</strong><span class="vraagteken" aria-hidden="true">?</span></header>
    <div class="mysterie-in">
      <p class="hand">${t('hier kan in elk geval:', 'what you can definitely do here:')}</p>
      <ul class="tips">${tips.map((c) => `<li>${icoon(c.id)}${esc(c.naam)}</li>`).join('')}</ul>
      <dl class="kerncijfers drie">
        <div><dt>${t('Vliegen', 'Flight')}</dt><dd>${esc(o.vlucht.duur)}</dd></div>
        <div><dt>${t('Zee', 'Sea')}</dt><dd>${o.klimaat?.zee == null ? t('geen', 'none') : `${esc(o.klimaat.zee)}°C`}</dd></div>
        <div><dt>${t('Koffermatch', 'Suitcase match')}</dt><dd>${match ? pct(match.score) : '--'}</dd></div>
      </dl>
      <button type="button" class="knop primair groot" data-instappen="${esc(o.id)}">${icoon('vliegtuig')}${t('Instappen', 'Board')}</button>
    </div>
  </article>`;
}

function ontdekteKaart(o) {
  const match = koffermatch(o, staat().koffer);
  return `<article class="optiekaart" style="${themaMetPatroon(o, land(o).kleuren?.licht)}">
    <header>
      <p class="kicker">${esc(landNaam(o.land))} · gate ${gateCode(o)}</p>
      <h2>${esc(o.naam)}</h2>
      <p>${esc(o.subregio)}</p>
      ${hartKnop(o.id, o.naam)}
    </header>
    <div class="optiekaart-in">
      <p class="tagline">${esc(o.tagline)}</p>
      <dl class="kerncijfers">
        <div><dt>${t('Vliegen', 'Flight')}</dt><dd>${esc(o.vlucht.duur)}</dd></div>
        <div><dt>${t('Zee', 'Sea')}</dt><dd>${o.klimaat?.zee == null ? t('geen', 'none') : `${esc(o.klimaat.zee)}°C`}</dd></div>
        <div><dt>${t('Per persoon', 'Per person')}</dt><dd>${euro(sterksteKosten(o))}</dd></div>
        <div><dt>Match</dt><dd>${match ? pct(match.score) : '--'}</dd></div>
      </dl>
      <div class="acties">
        <a class="knop primair" href="#/b/${esc(o.id)}">${t('Bekijk opnieuw', 'View again')}</a>
        <button type="button" class="knop" data-instappen="${esc(o.id)}">${icoon('vliegtuig')}${t('Vlieg nog eens', 'Fly again')}</button>
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
      <h1>${esc(landNaam(naam))}</h1>
      <p class="best-groet"><span class="hand">${esc(l.welkom)}</span><span class="motieven" aria-hidden="true">${landMotieven(naam)}</span></p>
    </div>
    <p class="lead">${esc(l.intro)}</p>
    <p class="hand">${open === 0 ? t('je hebt hier alles gezien', "you've seen everything here") : open === 1 ? (lijst.length === 1 ? t('één plek, maar waar precies?', 'one place, but where exactly?') : t('nog één vlucht te gaan', 'one more flight to go')) : t(`nog ${open} plekken te ontdekken`, `${open} more places to discover`)}</p>
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
    <p class="welkom-klein">${t(`Geland op ${esc(o.luchthaven.naam)} (${esc(o.luchthaven.code)})`, `Landed at ${esc(o.luchthaven.naam)} (${esc(o.luchthaven.code)})`)}</p>
    <p class="welkom-groet">${esc(land(o).welkom)}</p>
    <h2>${esc(o.naam)}</h2>
    <p class="welkom-waar">${esc(o.subregio)}, ${esc(landNaam(o.land))}</p>
    <div class="stempelplek plof" style="--kantel:${kanteling(o.id)}deg">${stempel(o.stempel)}<i></i><i></i><i></i><i></i></div>
    <p class="hand">${t(`stempel ${aantal} van ${totaal} in je paspoort`, `stamp ${aantal} of ${totaal} in your passport`)}</p>
    <button type="button" class="knop licht groot" id="welkom-verder">${t('Kijk rond', 'Look around')}${icoon('verder')}</button>
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
  return new Date(`${van}T12:00:00`).toLocaleDateString(locale(), { day: 'numeric', month: 'short' }).replace('.', '');
}

function instappen(id, tab = null) {
  landingsTab = tab;
  const o = optie(id);
  if (!o) return;
  const s = staat();
  const v = meta().vertrek;
  const carrier = meta().carriers?.[o.carrier];
  const naam = s.naam || t('Reiziger', 'Traveller');
  const bekend = s.bezocht.includes(o.id);
  const streepjes = Array.from({ length: 34 }, (_, i) => `<i style="width:${1 + ((i * 7 + o.id.length) % 4)}px"></i>`).join('');
  el.dialoog.innerHTML = `
    <div class="instapkaart${bekend ? '' : ' geheim'}" style="${thema(o)}">
      <header><span>${t('Instapkaart', 'Boarding pass')}</span><span>${esc(carrier?.naam ?? o.vlucht.maatschappijen)}</span></header>
      <div class="ik-passagier">
        <div class="ik-foto">${poppetje(s.avatar)}</div>
        <dl><dt>${t('Passagier', 'Passenger')}</dt><dd>${esc(naam)}</dd></dl>
      </div>
      <div class="ik-route">
        <div><span class="ik-code">${esc(v.code)}</span><span>${esc(v.naam)}</span></div>
        <div class="ik-lijn">${toestelZij(carrier)}<span>${esc(o.vlucht.duur)}</span></div>
        <div><span class="ik-code">${bekend ? esc(o.luchthaven.code) : '???'}</span><span>${bekend ? esc(o.luchthaven.naam) : t('geheim', 'secret')}</span></div>
      </div>
      <dl class="ik-velden">
        <div class="breed"><dt>${t('Bestemming', 'Destination')}</dt><dd>${bekend ? esc(o.naam) : t('Dat zie je als je er bent', "You'll see when you get there")}</dd></div>
        <div><dt>${t('Datum', 'Date')}</dt><dd>${esc(reisdatum())}</dd></div>
        <div><dt>Gate</dt><dd>${gateCode(o)}</dd></div>
        <div><dt>${t('Stoel', 'Seat')}</dt><dd>${stoel(s.naam || 'Reiziger', o.id)}</dd></div>
        <div class="breed"><dt>${t('Vluchten per week', 'Flights per week')}</dt><dd>${esc(o.vlucht.per_week)}</dd></div>
        <div class="breed"><dt>${t('Vluchtprijs', 'Flight price')} <span class="indicatie">${t('indicatie', 'estimate')}</span></dt><dd>${euro(o.vlucht.prijs_pp)} ${t('p.p.', 'pp')}</dd></div>
      </dl>
      <div class="ik-streepjes" aria-hidden="true">${streepjes}</div>
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop" data-sluit>${t('Toch niet', 'Never mind')}</button>
      ${bekend ? `<a class="knop" href="#/b/${esc(o.id)}${tab ? `/${tab}` : ''}">${t('Direct erheen', 'Go straight there')}</a>` : ''}
      <button type="button" class="knop primair" id="vertrek" autofocus>${icoon('vliegtuig')}${t('Vertrek', 'Take off')}</button>
    </div>`;
  el.dialoog.onclick = null;
  el.dialoog.className = 'dialoog';
  el.dialoog.setAttribute('aria-label', bekend ? t(`Instapkaart naar ${o.naam}`, `Boarding pass to ${o.naam}`) : t('Instapkaart voor een geheime bestemming', 'Boarding pass for a secret destination'));
  el.dialoog.showModal();
  $('#vertrek').addEventListener('click', () => vertrek(o));
}

function vertrek(o) {
  el.dialoog.close();
  const doel = `#/b/${o.id}${landingsTab ? `/${landingsTab}` : ''}`;
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
  el.vluchtinfo.textContent = t(`${meta().vertrek.code} naar ${ontdekt(o.id) ? o.luchthaven.code : '???'} · ${o.vlucht.duur}`, `${meta().vertrek.code} to ${ontdekt(o.id) ? o.luchthaven.code : '???'} · ${o.vlucht.duur}`);
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
  const zet = (id, n, label) => {
    const teller = $(id);
    if (!teller) return;
    teller.textContent = n;
    teller.hidden = n === 0;
    teller.parentElement.setAttribute('aria-label', label);
  };
  zet('#top3-teller', s.top3.length, t(`Mijn top 3 (${s.top3.length} gekozen)`, `My top 3 (${s.top3.length} picked)`));
  zet('#stempel-teller', s.bezocht.length, t(`Paspoort (${s.bezocht.length} van ${opties().length} stempels)`, `Passport (${s.bezocht.length} of ${opties().length} stamps)`));
}

function toonPaspoort() {
  el.dialoog.onclick = null;
  el.dialoog.innerHTML = `${paspoort()}<div class="dialoog-acties"><button type="button" class="knop" data-sluit>${t('Dichtklappen', 'Close passport')}</button></div>`;
  el.dialoog.className = 'dialoog breed';
  el.dialoog.setAttribute('aria-label', t('Paspoort', 'Passport'));
  el.dialoog.showModal();
}

function wisselHart(id) {
  const top3 = staat().top3;
  const o = optie(id);
  if (top3.includes(id)) {
    wijzig({ top3: top3.filter((x) => x !== id) });
    toast(t(`${o.naam} is uit je top 3`, `${o.naam} is out of your top 3`));
  } else if (top3.length >= 3) {
    toast(t('Je top 3 zit vol. Haal er eerst een uit via het hartje bovenin.', 'Your top 3 is full. Take one out first using the heart at the top.'));
  } else {
    wijzig({ top3: [...top3, id] });
    toast(t(`${o.naam} staat op plek ${top3.length + 1} van je top 3`, `${o.naam} is number ${top3.length + 1} in your top 3`));
  }
  werkTellersBij();
}

function top3Tekst() {
  const s = staat();
  const kop = s.top3.length === 3 ? t('Mijn top 3', 'My top 3') : t('Mijn favorieten tot nu toe', 'My favourites so far');
  const regelsTekst = s.top3.map((id, i) => {
    const o = optie(id);
    const match = koffermatch(o, s.koffer);
    return t(`${i + 1}. ${o.naam} (${landNaam(o.land)}): ca. ${euro(sterksteKosten(o))} p.p.${match ? `, koffermatch ${pct(match.score)}` : ''}`, `${i + 1}. ${o.naam} (${landNaam(o.land)}): approx. ${euro(sterksteKosten(o))} pp${match ? `, suitcase match ${pct(match.score)}` : ''}`);
  });
  return t(`${kop} voor ${meta().titel}${s.naam ? ` (${s.naam})` : ''}:\n${regelsTekst.join('\n')}`, `${kop} for ${meta().titel}${s.naam ? ` (${s.naam})` : ''}:\n${regelsTekst.join('\n')}`);
}

function toonTop3() {
  const teken = () => {
    const s = staat();
    const leeg = s.top3.length === 0;
    el.dialoog.innerHTML = `<div class="dialoog-in">
      <h2>${t('Mijn top 3', 'My top 3')}</h2>
      ${leeg
        ? `<p>${t('Nog leeg. Tik op het hartje bij een bestemming die je hebt ontdekt om hem hier te zetten.', "Still empty. Tap the heart on a destination you've discovered to put it here.")}</p>`
        : `<ol class="top3">${s.top3.map((id, i) => {
          const o = optie(id);
          return `<li>
            <span class="plek">${i + 1}</span>
            <span class="top3-naam"><strong>${esc(o.naam)}</strong><span class="dim">${esc(landNaam(o.land))} · ${euro(sterksteKosten(o))} ${t('p.p.', 'pp')}</span></span>
            <button type="button" class="iconknop" data-zet="${i}" data-stap="-1" aria-label="${t(`${esc(o.naam)} een plek omhoog`, `Move ${esc(o.naam)} up one place`)}"${i === 0 ? ' disabled' : ''}>${icoon('op')}</button>
            <button type="button" class="iconknop" data-zet="${i}" data-stap="1" aria-label="${t(`${esc(o.naam)} een plek omlaag`, `Move ${esc(o.naam)} down one place`)}"${i === s.top3.length - 1 ? ' disabled' : ''}>${icoon('neer')}</button>
            <button type="button" class="iconknop" data-weg="${esc(id)}" aria-label="${t(`${esc(o.naam)} uit mijn top 3 halen`, `Remove ${esc(o.naam)} from my top 3`)}">${icoon('kruis')}</button>
          </li>`;
        }).join('')}</ol>
        ${s.top3.length < 3 ? `<p class="klein">${t(`Nog ${3 - s.top3.length} te kiezen.`, `${3 - s.top3.length} more to pick.`)}</p>` : ''}`}
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop primair" id="kopieer-top3"${leeg ? ' disabled' : ''}>${icoon('kopieer')}${t('Mijn top 3 kopiëren', 'Copy my top 3')}</button>
      <button type="button" class="knop" id="maak-kaart"${leeg ? ' disabled' : ''}>${t('Ansichtkaart', 'Postcard')}</button>
      <a class="knop" href="#/uitslag">${t('Groepsuitslag', 'Group result')}</a>
      <button type="button" class="knop" data-sluit>${t('Sluiten', 'Close')}</button>
    </div>`;
    $('#maak-kaart').addEventListener('click', toonAnsichtkaart);
    $('#kopieer-top3').addEventListener('click', async () => {
      const tekst = top3Tekst();
      el.dialoog.close();
      await kopieer(tekst, t('Je top 3 is gekopieerd: plak hem in de groepsapp', 'Your top 3 is copied: paste it in the group chat'));
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
  el.dialoog.setAttribute('aria-label', t('Mijn top 3', 'My top 3'));
  el.dialoog.showModal();
}

// ---------- groepsuitslag en ansichtkaart ----------

function toonUitslag() {
  const code = mijnCode();
  el.vergelijk.innerHTML = `<div class="vgl uitslag">
    <p class="kicker">${esc(meta().reisdata)}</p>
    <h1>${t('Groepsuitslag', 'Group result')}</h1>
    <p class="lead">${t('Iedereen deelt zijn code in de groepsapp. Plak hier alle berichten in één keer, dan tellen we de punten.', "Everyone shares their code in the group chat. Paste all the messages here in one go and we'll add up the points.")}</p>

    <div class="codevak">
      <p class="kicker">${t('Jouw code', 'Your code')}</p>
      ${code
        ? `<code id="mijn-code">${esc(code)}</code><button type="button" class="knop primair" id="kopieer-code">${icoon('kopieer')}${t('Kopieer mijn code', 'Copy my code')}</button>`
        : `<p>${t('Kies eerst je top 3 met de hartjes, dan krijg je hier je code.', "Pick your top 3 with the hearts first, then you'll get your code here.")}</p>`}
    </div>

    <label class="veld" for="codes">${t('Codes van de anderen', "The others' codes")}</label>
    <textarea id="codes" rows="4" placeholder="${t('Plak hier de berichten uit de groepsapp. Tekst eromheen is geen probleem.', 'Paste the messages from the group chat here. Any text around them is no problem.')}">${esc(staat().codes ?? '')}</textarea>
    <p class="klein">${t('Een eerste plek is 3 punten waard, een tweede 2 en een derde 1. Er gaat niets naar een server.', 'A first place is worth 3 points, a second 2 and a third 1. Nothing is sent to a server.')}</p>
    <div id="uitslag-lijst"></div>
  </div>`;

  const teken = () => {
    const s = staat();
    const eigen = code ? leesCodes(code) : [];
    const anderen = leesCodes(s.codes ?? '').filter((d) => !eigen.some((e) => e.naam.toLowerCase() === d.naam.toLowerCase()));
    const deelnemers = [...eigen, ...anderen];
    const rijen = uitslag(deelnemers);
    $('#uitslag-lijst').innerHTML = deelnemers.length ? `
      <h2>${deelnemers.length === 1 ? t('1 stem geteld', '1 vote counted') : t(`${deelnemers.length} stemmen geteld`, `${deelnemers.length} votes counted`)}</h2>
      <p class="dim">${deelnemers.map((d) => esc(d.naam)).join(', ')}</p>
      <ol class="uitslaglijst">${rijen.map((r, i) => {
        const bekend = s.bezocht.includes(r.o.id);
        return `<li style="${themaStijl(r.o)}">
          <span class="plek">${i + 1}</span>
          <span class="uitslag-naam"><strong>${bekend ? esc(r.o.naam) : t(`Nog geheim voor jou (gate ${gateCode(r.o)})`, `Still a secret to you (gate ${gateCode(r.o)})`)}</strong>
            <span class="dim">${esc(landNaam(r.o.land))} · ${r.wie.map((w) => `${esc(w.naam)} (${t(`${w.plek}e`, `${w.plek}${['st', 'nd', 'rd'][w.plek - 1] ?? 'th'}`)})`).join(', ')}</span>
            ${r.match == null ? '' : `<span class="dim">${t('gezamenlijke koffermatch', 'combined suitcase match')} ${pct(r.match)}</span>`}</span>
          <span class="punten"><b>${r.punten}</b>${r.punten === 1 ? t('punt', 'point') : t('punten', 'points')}</span>
        </li>`;
      }).join('')}</ol>
      ${huizenUitslag(deelnemers).length ? `<h2>${t('Meest gekozen huizen', 'Most picked houses')}</h2>
      <ol class="uitslaglijst">${huizenUitslag(deelnemers).map((r, i) => `<li style="${themaStijl(r.o)}">
          <span class="plek">${i + 1}</span>
          <span class="uitslag-naam"><strong>${esc(r.h.naam)}</strong>
            <span class="dim">${esc(landNaam(r.o.land))} · ${euro(kosten(r.o, r.h).totaal)} ${t('p.p.', 'pp')}</span>
            <span class="dim">${r.wie.map(esc).join(', ')}</span></span>
          <span class="punten"><b>${r.wie.length}</b>${r.wie.length === 1 ? t('stem', 'vote') : t('stemmen', 'votes')}</span>
        </li>`).join('')}</ol>` : ''}` : `<p class="leeg">${t('Nog geen codes gevonden.', 'No codes found yet.')}</p>`;
  };

  $('#kopieer-code')?.addEventListener('click', () => kopieer(t(`Mijn vakantiecode: ${code}`, `My holiday code: ${code}`), t('Code gekopieerd: plak hem in de groepsapp', 'Code copied: paste it in the group chat')));
  $('#codes').addEventListener('input', (e) => {
    wijzig({ codes: e.target.value });
    teken();
  });
  teken();
}

async function toonAnsichtkaart() {
  el.dialoog.onclick = null;
  el.dialoog.innerHTML = `<div class="dialoog-in">
      <h2>${t('Je ansichtkaart', 'Your postcard')}</h2>
      <canvas id="ansicht" class="ansicht" role="img" aria-label="${t('Ansichtkaart met je top 3 en hun stempels', 'Postcard with your top 3 and their stamps')}"></canvas>
    </div>
    <div class="dialoog-acties">
      <button type="button" class="knop primair" id="kaart-download">${t('Download als PNG', 'Download as PNG')}</button>
      <button type="button" class="knop" id="kaart-deel" hidden>${t('Delen', 'Share')}</button>
      <button type="button" class="knop" data-sluit>${t('Sluiten', 'Close')}</button>
    </div>`;
  el.dialoog.className = 'dialoog breed';
  el.dialoog.setAttribute('aria-label', t('Ansichtkaart', 'Postcard'));
  if (!el.dialoog.open) el.dialoog.showModal();
  const canvas = $('#ansicht');
  await tekenAnsichtkaart(canvas);
  const alsBestand = () => new Promise((klaar) => canvas.toBlob((blob) => klaar(blob && new File([blob], kaartNaam(), { type: 'image/png' })), 'image/png'));
  $('#kaart-download')?.addEventListener('click', async () => {
    const bestand = await alsBestand();
    if (!bestand) return toast(t('De kaart kon niet worden opgeslagen', 'The postcard could not be saved'));
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

// ---------- favoriete huizen ----------

function wisselHuisHart(id) {
  const lijst = staat().huisFav ?? [];
  const aan = !lijst.includes(id);
  wijzig({ huisFav: aan ? [...lijst, id] : lijst.filter((x) => x !== id) });
  for (const knop of document.querySelectorAll(`[data-huishart="${CSS.escape(id)}"]`)) knop.setAttribute('aria-pressed', aan);
  toast(aan ? t('Bewaard als favoriet huis', 'Saved as a favourite house') : t('Geen favoriet huis meer', 'No longer a favourite house'));
}

// Vanuit Alle huizen ga je rechtstreeks naar het huis. Was de plek nog geheim, dan krijg je bij aankomst de stempel.
document.addEventListener('naarhuis', (e) => {
  const { id } = e.detail;
  const doel = `#/b/${id}/huis`;
  if (location.hash === doel) route();
  else location.hash = doel;
});

// ---------- alles onthullen ----------

function onthulAlles() {
  if (!confirm(t('Alle plekken in één keer tonen? Je krijgt meteen alle stempels en de verrassing is eraf.', 'Show all places at once? You get every stamp straight away and the surprise is gone.'))) return;
  wijzig({ bezocht: opties().map((o) => o.id) });
  route();
}

// ---------- opnieuw beginnen ----------

const resetKnop = () => `<p class="reset"><button type="button" class="linkknop" data-reset>${t('Alles wissen en opnieuw beginnen', 'Clear everything and start over')}</button></p>`;

function opnieuwBeginnen() {
  if (!confirm(t('Opnieuw beginnen? Je poppetje, koffer, stempels, top 3 en records op dit apparaat worden gewist.', 'Start over? Your character, suitcase, stamps, top 3 and bests on this device will be cleared.'))) return;
  wisStaat();
  leesNamen();
  if (location.hash === '#/start') route();
  else location.hash = '#/start';
}

// ---------- klikken ----------

function klik(e) {
  const hart = e.target.closest('[data-hart]');
  if (hart) return wisselHart(hart.dataset.hart);
  if (e.target.closest('[data-reset]')) return opnieuwBeginnen();
  if (e.target.closest('[data-onthul]')) return onthulAlles();
  const huishart = e.target.closest('[data-huishart]');
  if (huishart) return wisselHuisHart(huishart.dataset.huishart);
  const open = e.target.closest('[data-open]');
  if (open) return open.dataset.open === 'top3' ? toonTop3() : toonPaspoort();
  const spel = e.target.closest('[data-spel]');
  if (spel) return speel(optie(spel.dataset.spel) ?? optie(staat().bezocht.at(-1)) ?? null);
  const instap = e.target.closest('[data-instappen]');
  if (instap) return instappen(instap.dataset.instappen);
  if (e.target.closest('[data-sluit], dialog a') || e.target === el.dialoog) el.dialoog.close();
}

begin();
