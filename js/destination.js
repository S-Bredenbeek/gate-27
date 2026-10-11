// De bestemmingspagina: onderste sheet op mobiel, zijpaneel op desktop, met tabbladen.

import {
  meta, opties, categorieen, criteria, critNaam, gateLetter, landNaam,
  koffermatch, kosten, airbnbUrl, euro, pct, esc, themaStijl, volwassenen,
} from './data.js';
import { staat, wijzig } from './store.js';
import { t, locale } from './i18n.js';
import { land } from './data.js';
import { thema } from './patterns.js';
import { pilsmeter, kostenverdeler, koppelKostenverdeler, voorbereiden, koppelVoorbereiden } from './extras.js';
import { motief, heeftMotief } from './motifs.js';
import { icoon } from './icons.js';
import { statusLabel, hartKnop, bolletjes, beren, bronnenBlok, toast, rolLabel, kenmerkChips, huisHart, luxeUitleg } from './ui.js';
import * as kaart from './map.js';
import { medaille, volgendeMedaille } from './game.js';

const TABS = [
  ['kort', 'In het kort', 'At a glance'],
  ['kan', 'Wat kan hier', 'What you can do here'],
  ['huis', 'Het huis', 'The house'],
  ['kids', 'Voor de kids', 'For the kids'],
  ['scores', 'Scores', 'Scores'],
  ['kosten', 'Kosten en praktisch', 'Costs and practical'],
  ['voorbereiden', 'Voorbereiden', 'Getting ready'],
];

const huisIndex = (o) => Math.min(staat().huis[o.id] ?? 0, o.huizen.length - 1);
const nl = (n, d = 0) => Number(n).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });

export function toonBestemming(paneel, o, tab, animeer) {
  if (!TABS.some(([id]) => id === tab)) tab = 'kort';
  paneel.className = 'paneel thema';
  const l = land(o);
  paneel.style.cssText = thema(o);
  const motieven = (l.motieven ?? []).filter(heeftMotief).map((m) => motief(m)).join('');
  const k = o.klimaat ?? {};
  paneel.innerHTML = `
    <header class="best-kop">
      <a class="teruglink" href="#/gate/${encodeURIComponent(o.land)}">${icoon('terug')}Gate ${gateLetter(o.land)} · ${esc(landNaam(o.land))}</a>
      <div class="best-band">
        <div class="best-titel">
          <div>
            <p class="kicker">${esc(landNaam(o.land))}</p>
            <h1>${esc(o.naam)}</h1>
            <p class="best-waar">${esc(o.subregio)}</p>
          </div>
          ${hartKnop(o.id, o.naam)}
        </div>
        <p class="best-groet"><span class="hand">${esc(l.welkom)}</span><span class="motieven" aria-hidden="true">${motieven}</span></p>
      </div>
      <ul class="feiten">
        <li>${icoon('vliegtuig')}${t(`${esc(o.vlucht.duur)} vliegen`, `${esc(o.vlucht.duur)} flight`)}</li>
        <li>${icoon('auto')}${esc(o.transfer)}</li>
        <li>${icoon('zon')}${esc(k.lucht)}°C</li>
        <li>${icoon('golf')}${k.zee == null ? t('geen zee', 'no sea') : t(`zee ${esc(k.zee)}°C`, `sea ${esc(k.zee)}°C`)}</li>
      </ul>
    </header>
    <div class="tabs" role="tablist" aria-label="${t(`Onderdelen van ${esc(o.naam)}`, `Sections of ${esc(o.naam)}`)}">
      ${TABS.map(([id, naam, en]) => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-controls="tabinhoud">${t(naam, en)}</button>`).join('')}
    </div>
    <div id="tabinhoud" class="tabinhoud" role="tabpanel"></div>
    ${verder(o)}
    ${bronnenBlok()}`;

  const lijst = paneel.querySelector('.tabs');
  const inhoud = paneel.querySelector('#tabinhoud');

  function toonTab(id, focus = false) {
    for (const knop of lijst.children) {
      const aan = knop.dataset.tab === id;
      knop.setAttribute('aria-selected', aan);
      knop.tabIndex = aan ? 0 : -1;
      if (aan) {
        inhoud.setAttribute('aria-labelledby', knop.id);
        if (focus) knop.focus();
        knop.scrollIntoView?.({ block: 'nearest', inline: 'center' });
      }
    }
    inhoud.innerHTML = TABINHOUD[id](o);
    koppel(id);
    try {
      history.replaceState(null, '', `#/b/${o.id}/${id}`);
    } catch {
      // geen geschiedenis beschikbaar: de tab werkt ook zonder
    }
  }

  function kiesHuis(i, melding = true) {
    wijzig({ huis: { ...staat().huis, [o.id]: i } });
    kaart.markeerHuis(i);
    if (melding) toast(t(`Kosten gerekend met ${o.huizen[i].naam}`, `Costs based on ${o.huizen[i].naam}`));
  }

  function koppel(id) {
    for (const knop of inhoud.querySelectorAll('[data-naartab]')) {
      knop.addEventListener('click', () => {
        toonTab(knop.dataset.naartab);
        lijst.scrollIntoView({ block: 'start', behavior: 'smooth' });
      });
    }
    koppelVoorbereiden(inhoud, o);
    koppelKostenverdeler(inhoud, kosten(o, o.huizen[huisIndex(o)]).totaal);
    for (const foto of inhoud.querySelectorAll('.huisfoto img')) {
      const mislukt = () => {
        foto.nextElementSibling.hidden = false;
        foto.remove();
      };
      if (foto.complete && !foto.naturalWidth) mislukt();
      else foto.addEventListener('error', mislukt, { once: true });
    }
    for (const knop of inhoud.querySelectorAll('[data-kieshuis]')) {
      knop.addEventListener('click', () => {
        kiesHuis(Number(knop.dataset.kieshuis));
        toonTab(id);
      });
    }
    for (const knop of inhoud.querySelectorAll('[data-rit]')) {
      knop.addEventListener('click', () => {
        const i = Number(knop.dataset.rit);
        kaart.markeerHuis(i);
        kaart.rij(o, i);
        paneel.scrollTo?.({ top: 0, behavior: 'smooth' });
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
    inhoud.querySelector('#huiskeuze')?.addEventListener('change', (e) => {
      kiesHuis(Number(e.target.value), false);
      toonTab(id);
    });
  }

  lijst.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-tab]');
    if (knop) toonTab(knop.dataset.tab);
  });
  lijst.addEventListener('keydown', (e) => {
    const stap = { ArrowRight: 1, ArrowLeft: -1 }[e.key];
    if (!stap) return;
    e.preventDefault();
    const nu = TABS.findIndex(([id]) => id === e.target.dataset.tab);
    toonTab(TABS[(nu + stap + TABS.length) % TABS.length][0], true);
  });

  toonTab(tab);
  kaart.toonBestemming(o, huisIndex(o), (i) => {
    kiesHuis(i, false);
    kaart.rij(o, i);
    toonTab('huis');
  }, animeer);
}

// ---------- tabbladen ----------

// In het kort: het hele beeld op één scherm, met doorklik naar de details.
function tabKort(o) {
  const h = o.huizen[huisIndex(o)];
  const m = koffermatch(o, staat().koffer);
  const punten = (lijst, soort) => (lijst ?? []).slice(0, 2).map((p) => `<li class="${soort}">${icoon(soort === 'plus' ? 'plus' : 'beperkt')}<span>${esc(p)}</span></li>`).join('');
  return `
    <p class="tagline">${esc(o.tagline)}</p>
    <button type="button" class="kortfoto" data-naartab="huis">
      ${h.foto ? `<img src="${esc(fotoUrl(h.foto))}" alt="${t(`Foto van ${esc(h.naam)}`, `Photo of ${esc(h.naam)}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
      <span class="kortfoto-tekst">
        <strong>${esc(h.naam)}</strong>
        <span>${euro(kosten(o, h).totaal)} ${t('per persoon, alles erbij', 'per person, all in')}${o.huizen.length > 1 ? t(` · ${o.huizen.length} huizen om uit te kiezen`, ` · ${o.huizen.length} houses to choose from`) : ''}</span>
      </span>
    </button>
    ${m ? `<button type="button" class="matchbalk" data-naartab="kan">
        <div><strong>${t(`${m.ja + m.beperkt} van je ${m.n} wensen kunnen hier`, `${m.ja + m.beperkt} of your ${m.n} wishes work here`)}</strong><span>${t('Bekijk wat er kan', 'See what you can do')}</span></div>
        <span class="matchpct">${pct(m.score)}<small>${t('koffermatch', 'suitcase match')}</small></span>
      </button>` : ''}
    ${scorekaart(o)}
    <ul class="onderscheid">${punten(o.onderscheid?.plus, 'plus')}${punten(o.onderscheid?.min, 'min')}</ul>
    <p class="sfeer">${esc(o.sfeer)}</p>
    <div class="acties kortknoppen">
      <button type="button" class="knop primair" data-naartab="huis">${icoon('huis')}${o.huizen.length > 1 ? t('De huizen', 'The houses') : t('Het huis', 'The house')}</button>
      <button type="button" class="knop" data-naartab="kan">${t('Wat kan hier?', 'What can you do?')}</button>
      <button type="button" class="knop" data-naartab="kosten">${t('Kosten', 'Costs')}</button>
    </div>
    ${missie(o)}`;
}

// Wat je op deze plek kunt verdienen: de stempel heb je al, de gouden rand win je met het spel van deze plek.
function missie(o) {
  const record = staat().hooghoud?.[o.id] ?? 0;
  const nu = medaille(o.id);
  const straks = volgendeMedaille(o.id);
  const inTop = staat().top3.includes(o.id);
  const regel = (klaar, tekst) => `<li class="${klaar ? 'klaar' : ''}"><span class="vinkvak">${klaar ? icoon('check') : ''}</span><span>${tekst}</span></li>`;
  return `<section class="missie">
    <p class="kicker">${t('Te verdienen op deze plek', 'To earn in this place')}</p>
    <ul>
      ${regel(true, t('Stempel in je paspoort', 'Stamp in your passport'))}
      ${regel(!straks, `${nu ? `<strong style="color:${esc(nu.kleur)}">${esc(nu.naam)}</strong> ${t('binnen', 'earned')}${record ? t(` (record ${record})`, ` (best ${record})`) : ''}. ` : ''}${straks ? t(`${esc(straks.naam)}: houd ${straks.vanaf} keer hoog${!nu && record ? ` (record ${record})` : ''}`, `${esc(straks.naam)}: do ${straks.vanaf} keepy-uppies${!nu && record ? ` (best ${record})` : ''}`) : t('Hoger kan niet!', 'Top of the podium!')}`)}
      ${regel(inTop, inTop ? t('Staat in je top 3', 'In your top 3') : t('Vind je het wat? Zet hem in je top 3 met het hartje bovenaan', 'Like it? Put it in your top 3 with the heart at the top'))}
    </ul>
    <button type="button" class="knop primair spelknop" data-spel="${esc(o.id)}">${icoon('hooghouden')}${esc(o.spel?.naam ?? t('Hooghouden', 'Keepy-uppies'))}</button>
    ${o.spel?.regel ? `<p class="klein">${esc(o.spel.regel)}</p>` : ''}
  </section>`;
}

function tabKan(o) {
  const koffer = staat().koffer;
  const m = koffermatch(o, koffer);
  const cats = [...categorieen()].sort((a, b) => koffer.includes(b.id) - koffer.includes(a.id));
  const match = m
    ? `<div class="matchbalk">
        <div><strong>${t(`${m.ja + m.beperkt} van je ${m.n} wensen kunnen hier`, `${m.ja + m.beperkt} of your ${m.n} wishes work here`)}</strong>${m.beperkt ? `<span>${t(`waarvan ${m.beperkt} met beperkingen`, `${m.beperkt} of them with limitations`)}</span>` : ''}</div>
        <span class="matchpct">${pct(m.score)}<small>${t('koffermatch', 'suitcase match')}</small></span>
      </div>`
    : `<p class="leeg">${t('Je koffer is nog leeg.', 'Your suitcase is still empty.')} <a href="#/koffer">${t('Pak je koffer in', 'Pack your suitcase')}</a> ${t('om te zien hoeveel van je wensen hier kunnen.', 'to see how many of your wishes work here.')}</p>`;
  return `
    ${match}
    <ul class="kanlijst">
      ${cats.map((c) => {
        const [status, uitleg] = o.mogelijkheden?.[c.id] ?? ['onbekend', ''];
        const ingepakt = koffer.includes(c.id);
        return `<li class="kan kan-${esc(status)}${ingepakt ? ' inkoffer' : ''}">
          <span class="kan-ico">${icoon(c.id)}</span>
          <div>
            <div class="kan-kop"><h3>${esc(c.naam)}</h3>${statusLabel(status)}</div>
            <p>${esc(uitleg)}</p>
            ${ingepakt ? `<span class="kofferlabel">${icoon('koffer')}${t('In je koffer', 'In your suitcase')}</span>` : ''}
          </div>
        </li>`;
      }).join('')}
    </ul>
    <p class="klein">${esc(meta().mogelijkheden.toelichting)}</p>`;
}

const fotoUrl = (url) => (/muscache\.com/.test(url) && !url.includes('?') ? `${url}?im_w=720` : url);

function tabHuis(o) {
  const gekozen = huisIndex(o);
  const n = volwassenen();
  return o.huizen.map((h, i) => {
    const k = kosten(o, h);
    const beoordeling = h.beoordeling
      ? `${nl(h.beoordeling, 2)} <span class="dim">(${nl(h.reviews)} reviews)</span>`
      : t('Nog geen beoordeling', 'No rating yet');
    return `<article class="huis${i === 0 ? ' sterkste' : ''}${i === gekozen ? ' gekozen' : ''} soort-${esc(h.soort)}" id="huis-${i}">
      <div class="huisfoto">
        ${h.foto ? `<img src="${esc(fotoUrl(h.foto))}" alt="${t(`Foto van ${esc(h.naam)} in ${esc(h.plaats)}`, `Photo of ${esc(h.naam)} in ${esc(h.plaats)}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
        <div class="fotoplaats"${h.foto ? ' hidden' : ''}>${icoon('huis')}<span>${t('Foto niet beschikbaar', 'Photo not available')}</span></div>
        ${rolLabel(h)}
        <span class="huisnr">${i + 1}</span>
        ${huisHart(h)}
      </div>
      <div class="huis-tekst">
        <h2>${esc(h.naam)}</h2>
        <p class="plaats">${esc(h.plaats)}</p>
        ${luxeUitleg(o, h)}
        <ul class="feiten">
          <li>${icoon('bed')}${t(`${esc(h.slaapkamers)} slaapkamers`, `${esc(h.slaapkamers)} bedrooms`)}</li>
          <li>${icoon('personen')}${t(`max. ${esc(h.max_gasten)} gasten`, `max. ${esc(h.max_gasten)} guests`)}</li>
          <li>${icoon('ster')}${beoordeling}</li>
          <li>${icoon('zwembad')}${esc(h.zwembad)}</li>
        </ul>
        ${kenmerkChips(h)}
        <div class="waarom"><h3>${t('Waarom dit huis', 'Why this house')}</h3><p>${esc(h.waarom)}</p></div>
        <div class="letop"><h3>${t('Let op', 'Heads up')}</h3><p>${esc(h.let_op)}</p></div>
        <dl class="prijzen">
          <div><dt>${t('Huis, hele week', 'House, whole week')}</dt><dd>${euro(h.prijs_totaal)}</dd></div>
          <div><dt>${t(`Huis per persoon (${n})`, `House per person (${n})`)}</dt><dd>${euro(h.prijs_totaal / n)}</dd></div>
          <div class="allin"><dt>${t('Hele week per persoon', 'Whole week per person')} <span class="indicatie">${t('indicatie', 'estimate')}</span></dt><dd>${euro(k.totaal)}</dd></div>
        </dl>
        <div class="acties">
          <a class="knop primair" href="${esc(airbnbUrl(h))}" target="_blank" rel="noopener">${t('Bekijk op Airbnb', 'View on Airbnb')}${icoon('extern')}</a>
          <button type="button" class="knop" data-rit="${i}">${icoon('auto')}${t('Rij erheen', 'Drive there')}</button>
          <button type="button" class="knop" data-kieshuis="${i}" aria-pressed="${i === gekozen}">${i === gekozen ? `${icoon('check')}${t('Kosten met dit huis', 'Costs based on this house')}` : t('Reken met dit huis', 'Use this house for costs')}</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function tabKids(o) {
  const k = o.kidscheck ?? {};
  const uitleg = meta().kidscheck_uitleg ?? '';
  const rijen = (meta().kidscheck_criteria ?? []).map((c) => {
    const v = k[c.id];
    if (typeof v === 'number') {
      const kleur = v < 45 ? 'groen' : v <= 90 ? 'oranje' : 'rood';
      return `<li class="kc kc-balk"><span class="kc-naam">${esc(c.naam)}</span><strong>${v} min</strong>
        <span class="balk"><span class="balk-vul ${kleur}" style="width:${Math.min(100, (v / 150) * 100)}%"></span></span></li>`;
    }
    if (typeof v === 'boolean') {
      return `<li class="kc kc-vink ${v ? 'ja' : 'nee'}"><span class="vink">${icoon(v ? 'check' : 'kruis')}</span><span class="kc-naam">${esc(c.naam)}</span><strong>${v ? t('Ja', 'Yes') : t('Nee', 'No')}</strong></li>`;
    }
    return `<li class="kc kc-tekst"><span class="kc-naam">${esc(c.naam)}</span><p>${esc(v ?? t('Onbekend', 'Unknown'))}</p></li>`;
  }).join('');
  return `
    <div class="kidsoordeel">
      ${beren(k.oordeel ?? 0)}
      <strong>${t(`${esc(k.oordeel ?? '?')} van 5 voor de kids`, `${esc(k.oordeel ?? '?')} out of 5 for the kids`)}</strong>
      <p>${esc(uitleg)}</p>
    </div>
    <ul class="kidslijst">${rijen}</ul>`;
}

function tabScores(o) {
  const rijen = criteria().map((c) => {
    const [score, uitleg] = o.scores?.[c] ?? [0, ''];
    return `<li><div class="score-kop"><h3 title="${esc(meta().scorecriteria[c])}">${esc(critNaam(c))}</h3>${bolletjes(score)}</div><p>${esc(uitleg)}</p></li>`;
  }).join('');
  const lijst = (punten, soort) => (punten ?? []).map((p) => `<li class="${soort}">${icoon(soort === 'plus' ? 'plus' : 'beperkt')}<span>${esc(p)}</span></li>`).join('');
  return `
    <ul class="scorelijst">${rijen}</ul>
    <h2>${t('Wat maakt deze optie anders', 'What sets this option apart')}</h2>
    <ul class="onderscheid">${lijst(o.onderscheid?.plus, 'plus')}${lijst(o.onderscheid?.min, 'min')}</ul>
    <p class="klein">${t('De scores tellen nergens op tot één ranglijst. Alleen jouw eigen weging in de vergelijking geeft een volgorde.', 'The scores never add up to a single ranking. Only your own weighting in the comparison puts them in order.')}</p>`;
}

function budgetBalk(bedrag) {
  const [min, max] = meta().budget_pp;
  const lo = Math.min(min, bedrag) * 0.8;
  const hi = Math.max(max, bedrag) * 1.1;
  const plek = (x) => ((x - lo) / (hi - lo)) * 100;
  const oordeel = bedrag < min ? t(`${euro(min - bedrag)} onder het budget`, `${euro(min - bedrag)} under budget`) : bedrag > max ? t(`${euro(bedrag - max)} boven het budget`, `${euro(bedrag - max)} over budget`) : t('Binnen het budget', 'Within budget');
  return `<div class="budget">
    <div class="budget-spoor" role="img" aria-label="${t(`${euro(bedrag)} per persoon. Budget ${euro(min)} tot ${euro(max)}. ${oordeel}.`, `${euro(bedrag)} per person. Budget ${euro(min)} to ${euro(max)}. ${oordeel}.`)}">
      <span class="budget-band" style="left:${plek(min)}%;width:${plek(max) - plek(min)}%"></span>
      <span class="budget-punt${bedrag > max ? ' boven' : ''}" style="left:${plek(bedrag)}%"></span>
    </div>
    <div class="budget-as" aria-hidden="true"><span style="left:${plek(min)}%">${euro(min)}</span><span style="left:${plek(max)}%">${euro(max)}</span></div>
    <p><strong>${oordeel}</strong>${t(` van ${euro(min)} tot ${euro(max)} per persoon.`, `: the budget is ${euro(min)} to ${euro(max)} per person.`)}</p>
  </div>`;
}

function tabKosten(o) {
  const i = huisIndex(o);
  const h = o.huizen[i];
  const k = kosten(o, h);
  const kl = o.klimaat ?? {};
  const keuze = o.huizen.length > 1
    ? `<label class="veld">${t('Gerekend met', 'Based on')}
        <select id="huiskeuze">${o.huizen.map((x, n) => `<option value="${n}"${n === i ? ' selected' : ''}>${esc(x.naam)} (${esc(x.rol)})</option>`).join('')}</select>
      </label>`
    : `<p class="dim">${t(`Gerekend met ${esc(h.naam)}.`, `Based on ${esc(h.naam)}.`)}</p>`;
  return `
    <h2>${t('Kosten per persoon', 'Costs per person')} <span class="indicatie">${t('indicatie', 'estimate')}</span></h2>
    ${keuze}
    <table class="kostentabel">
      <tbody>${k.posten.map((p) => `<tr><th scope="row">${esc(p.naam)}</th><td>${euro(p.bedrag)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">${t('Totaal per volwassene', 'Total per adult')}</th><td>${euro(k.totaal)}</td></tr></tfoot>
    </table>
    ${budgetBalk(k.totaal)}
    <h3 class="tussenkop">${t('Wat betekent dat voor jou?', 'What does that mean for you?')}</h3>
    ${kostenverdeler()}
    <p class="klein">${esc(meta().bronnen?.kosten)}</p>

    <h2>${t('Vlucht en vervoer', 'Flight and transport')}</h2>
    <dl class="weetjes">
      <div><dt>${t('Maatschappijen', 'Airlines')}</dt><dd>${esc(o.vlucht.maatschappijen)}</dd></div>
      <div><dt>${t('Vluchtduur', 'Flight time')}</dt><dd>${esc(o.vlucht.duur)}</dd></div>
      <div><dt>${t('Vluchten per week', 'Flights per week')}</dt><dd>${esc(o.vlucht.per_week)}</dd></div>
      <div><dt>${t('Vluchtprijs', 'Flight price')} <span class="indicatie">${t('indicatie', 'estimate')}</span></dt><dd>${euro(o.vlucht.prijs_pp)} ${t('p.p.', 'pp')}</dd></div>
      <div><dt>${t(`Van ${esc(o.luchthaven.naam)} naar het huis`, `From ${esc(o.luchthaven.naam)} to the house`)}</dt><dd>${esc(o.transfer)}</dd></div>
      ${o.huurauto_per_stuk ? `<div><dt>${t('Huurauto, per auto per week', 'Rental car, per car per week')}</dt><dd>${euro(o.huurauto_per_stuk)}</dd></div>` : ''}
    </dl>

    <h2>${t('Klimaat eind september', 'Climate in late September')}</h2>
    <ul class="klimaat">
      <li>${icoon('zon')}<strong>${esc(kl.lucht)}°C</strong><span>${t('overdag', 'daytime')}</span></li>
      <li>${icoon('golf')}<strong>${kl.zee == null ? t('geen zee', 'no sea') : `${esc(kl.zee)}°C`}</strong><span>${kl.zee == null ? t('in de buurt', 'nearby') : t('zeewater', 'sea water')}</span></li>
      <li>${icoon('regen')}<strong>${esc(kl.regendagen)}</strong><span>${t('regendagen', 'rainy days')}</span></li>
    </ul>

    <h2>${t('Pilsmeter', 'Beer meter')}</h2>
    ${pilsmeter(o)}
    <dl class="weetjes">
      <div><dt>${icoon('restaurants')}${t('Diner voor 2', 'Dinner for 2')}</dt><dd>${o.lokaal?.diner2 == null ? t('onbekend', 'unknown') : euro(o.lokaal.diner2)}</dd></div>
    </dl>
    <p class="klein">${esc(meta().bronnen?.pils)}</p>`;
}

// Onderaan elke bestemming staat de logische volgende stap: nog een geheime plek in dit land, of een ander land.
function verder(o) {
  const bezocht = staat().bezocht;
  const open = opties().filter((x) => x.land === o.land && !bezocht.includes(x.id)).length;
  return `<nav class="verder" aria-label="${t('Verder', 'Next')}">
    <p class="hand">${open ? (open === 1 ? t(`nog één geheime plek in ${esc(landNaam(o.land))}`, `one more secret spot in ${esc(landNaam(o.land))}`) : t(`nog ${open} geheime plekken in ${esc(landNaam(o.land))}`, `${open} more secret spots in ${esc(landNaam(o.land))}`)) : t(`${esc(landNaam(o.land))} heb je helemaal gezien`, `you've seen all of ${esc(landNaam(o.land))}`)}</p>
    <div class="acties">
      ${opties().some((x) => !bezocht.includes(x.id)) ? `<button type="button" class="knop primair" data-verras="${esc(o.land)}">${icoon('vliegtuig')}${t('Volgende mysterievlucht', 'Next mystery flight')}</button>` : ''}
      <a class="knop" href="#/hal">${t('Kies een ander land', 'Pick another country')}</a>
    </div>
  </nav>`;
}

// De scorekaart staat bovenaan elke bestemming: alle scores in één oogopslag.
// Criteria die je in de vergelijking zwaarder hebt gezet (2 of 3) krijgen een ster.
function scorekaart(o) {
  const gewichten = staat().gewichten ?? {};
  return `<button type="button" class="scorekaart" data-naartab="scores" aria-label="${t(`Scores van ${esc(o.naam)}: bekijk de toelichting`, `Scores for ${esc(o.naam)}: view the explanation`)}">
    ${criteria().map((c) => {
      const score = o.scores?.[c]?.[0] ?? 0;
      return `<span class="sk${gewichten[c] >= 2 ? ' telt' : ''}"><b>${score}</b><span class="sk-balk"><i style="width:${score * 20}%"></i></span><span class="sk-naam">${esc(critNaam(c))}</span></span>`;
    }).join('')}
  </button>`;
}

const TABINHOUD = { kort: tabKort, kan: tabKan, huis: tabHuis, kids: tabKids, scores: tabScores, kosten: tabKosten, voorbereiden };
