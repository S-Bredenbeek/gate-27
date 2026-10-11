// De bestemmingspagina: onderste sheet op mobiel, zijpaneel op desktop, met tabbladen.

import {
  meta, groep, categorieen, criteria, critNaam, profielen, gateLetter,
  koffermatch, kosten, airbnbUrl, euro, pct, esc, themaStijl, volwassenen,
} from './data.js';
import { staat, wijzig } from './store.js';
import { land } from './data.js';
import { patroon } from './patterns.js';
import { motief, heeftMotief } from './motifs.js';
import { icoon } from './icons.js';
import { statusLabel, hartKnop, bolletjes, beren, bronnenBlok, toast } from './ui.js';
import * as kaart from './map.js';

const TABS = [
  ['kan', 'Wat kan hier'],
  ['huis', 'Het huis'],
  ['kids', 'Voor de kids'],
  ['scores', 'Scores'],
  ['kosten', 'Kosten en praktisch'],
  ['voorbereiden', 'Voorbereiden'],
];

const huisIndex = (o) => Math.min(staat().huis[o.id] ?? 0, o.huizen.length - 1);
const nl = (n, d = 0) => Number(n).toLocaleString('nl-NL', { minimumFractionDigits: d, maximumFractionDigits: d });

export function toonBestemming(paneel, o, tab, animeer) {
  if (!TABS.some(([id]) => id === tab)) tab = 'kan';
  paneel.className = 'paneel thema';
  const l = land(o);
  paneel.style.cssText = `${themaStijl(o)};--patroon:${patroon(l.patroon, l.kleuren?.licht ?? '#FFFFFF')}`;
  const motieven = (l.motieven ?? []).filter(heeftMotief).map((m) => motief(m)).join('');
  const k = o.klimaat ?? {};
  paneel.innerHTML = `
    <header class="best-kop">
      <a class="teruglink" href="#/gate/${esc(o.groep)}">${icoon('terug')}Gate ${gateLetter(o.groep)} · ${esc(groep(o.groep)?.naam)}</a>
      <div class="best-band">
        <div class="best-titel">
          <div>
            <p class="kicker">${esc(o.land)} · ${esc(o.subregio)}</p>
            <h1>${esc(o.naam)}</h1>
          </div>
          ${hartKnop(o.id, o.naam)}
        </div>
        <p class="best-groet"><span class="hand">${esc(l.welkom)}</span><span class="motieven" aria-hidden="true">${motieven}</span></p>
      </div>
      <ul class="feiten">
        <li>${icoon('vliegtuig')}${esc(o.vlucht.duur)} vliegen</li>
        <li>${icoon('auto')}${esc(o.transfer)}</li>
        <li>${icoon('zon')}${esc(k.lucht)}°C</li>
        <li>${icoon('golf')}${k.zee == null ? 'geen zee' : `zee ${esc(k.zee)}°C`}</li>
      </ul>
    </header>
    <div class="tabs" role="tablist" aria-label="Onderdelen van ${esc(o.naam)}">
      ${TABS.map(([id, naam]) => `<button type="button" role="tab" id="tab-${id}" data-tab="${id}" aria-controls="tabinhoud">${naam}</button>`).join('')}
    </div>
    <div id="tabinhoud" class="tabinhoud" role="tabpanel"></div>
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
    if (melding) toast(`Kosten gerekend met ${o.huizen[i].naam}`);
  }

  function koppel(id) {
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

function tabKan(o) {
  const koffer = staat().koffer;
  const m = koffermatch(o, koffer);
  const cats = [...categorieen()].sort((a, b) => koffer.includes(b.id) - koffer.includes(a.id));
  const match = m
    ? `<div class="matchbalk">
        <div><strong>${m.ja + m.beperkt} van je ${m.n} wensen kunnen hier</strong>${m.beperkt ? `<span>waarvan ${m.beperkt} met beperkingen</span>` : ''}</div>
        <span class="matchpct">${pct(m.score)}<small>koffermatch</small></span>
      </div>`
    : `<p class="leeg">Je koffer is nog leeg. <a href="#/koffer">Pak je koffer in</a> om te zien hoeveel van je wensen hier kunnen.</p>`;
  return `
    <p class="tagline">${esc(o.tagline)}</p>
    <p class="sfeer">${esc(o.sfeer)}</p>
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
            ${ingepakt ? `<span class="kofferlabel">${icoon('koffer')}In je koffer</span>` : ''}
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
      : 'Nog geen beoordeling';
    return `<article class="huis${i === 0 ? ' sterkste' : ''}${i === gekozen ? ' gekozen' : ''}" id="huis-${i}">
      <div class="huisfoto">
        ${h.foto ? `<img src="${esc(fotoUrl(h.foto))}" alt="Foto van ${esc(h.naam)} in ${esc(h.plaats)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
        <div class="fotoplaats"${h.foto ? ' hidden' : ''}>${icoon('huis')}<span>Foto niet beschikbaar</span></div>
        <span class="rol">${esc(h.rol)}</span>
        <span class="huisnr">${i + 1}</span>
      </div>
      <div class="huis-tekst">
        <h2>${esc(h.naam)}</h2>
        <p class="plaats">${esc(h.plaats)}</p>
        <ul class="feiten">
          <li>${icoon('bed')}${esc(h.slaapkamers)} slaapkamers</li>
          <li>${icoon('personen')}max. ${esc(h.max_gasten)} gasten</li>
          <li>${icoon('ster')}${beoordeling}</li>
          <li>${icoon('zwembad')}${esc(h.zwembad)}</li>
        </ul>
        <div class="waarom"><h3>Waarom dit huis</h3><p>${esc(h.waarom)}</p></div>
        <div class="letop"><h3>Let op</h3><p>${esc(h.let_op)}</p></div>
        <dl class="prijzen">
          <div><dt>Huis, hele week</dt><dd>${euro(h.prijs_totaal)}</dd></div>
          <div><dt>Huis per persoon (${n})</dt><dd>${euro(h.prijs_totaal / n)}</dd></div>
          <div class="allin"><dt>Hele week per persoon <span class="indicatie">indicatie</span></dt><dd>${euro(k.totaal)}</dd></div>
        </dl>
        <div class="acties">
          <a class="knop primair" href="${esc(airbnbUrl(h))}" target="_blank" rel="noopener">Bekijk op Airbnb${icoon('extern')}</a>
          <button type="button" class="knop" data-rit="${i}">${icoon('auto')}Rij erheen</button>
          <button type="button" class="knop" data-kieshuis="${i}" aria-pressed="${i === gekozen}">${i === gekozen ? `${icoon('check')}Kosten met dit huis` : 'Reken met dit huis'}</button>
        </div>
      </div>
    </article>`;
  }).join('');
}

function tabKids(o) {
  const k = o.kidscheck ?? {};
  const uitleg = profielen().find((p) => p.type === 'kidscheck')?.uitleg ?? '';
  const rijen = (meta().kidscheck_criteria ?? []).map((c) => {
    const v = k[c.id];
    if (typeof v === 'number') {
      const kleur = v < 45 ? 'groen' : v <= 90 ? 'oranje' : 'rood';
      return `<li class="kc kc-balk"><span class="kc-naam">${esc(c.naam)}</span><strong>${v} min</strong>
        <span class="balk"><span class="balk-vul ${kleur}" style="width:${Math.min(100, (v / 150) * 100)}%"></span></span></li>`;
    }
    if (typeof v === 'boolean') {
      return `<li class="kc kc-vink ${v ? 'ja' : 'nee'}"><span class="vink">${icoon(v ? 'check' : 'kruis')}</span><span class="kc-naam">${esc(c.naam)}</span><strong>${v ? 'Ja' : 'Nee'}</strong></li>`;
    }
    return `<li class="kc kc-tekst"><span class="kc-naam">${esc(c.naam)}</span><p>${esc(v ?? 'Onbekend')}</p></li>`;
  }).join('');
  return `
    <div class="kidsoordeel">
      ${beren(k.oordeel ?? 0)}
      <strong>${esc(k.oordeel ?? '?')} van 5 voor de kids</strong>
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
    <h2>Wat maakt deze optie anders</h2>
    <ul class="onderscheid">${lijst(o.onderscheid?.plus, 'plus')}${lijst(o.onderscheid?.min, 'min')}</ul>
    <p class="klein">De scores tellen nergens op tot één ranglijst. Alleen jouw eigen weging in de vergelijking geeft een volgorde.</p>`;
}

function budgetBalk(bedrag) {
  const [min, max] = meta().budget_pp;
  const lo = Math.min(min, bedrag) * 0.8;
  const hi = Math.max(max, bedrag) * 1.1;
  const plek = (x) => ((x - lo) / (hi - lo)) * 100;
  const oordeel = bedrag < min ? `${euro(min - bedrag)} onder het budget` : bedrag > max ? `${euro(bedrag - max)} boven het budget` : 'Binnen het budget';
  return `<div class="budget">
    <div class="budget-spoor" role="img" aria-label="${euro(bedrag)} per persoon. Budget ${euro(min)} tot ${euro(max)}. ${oordeel}.">
      <span class="budget-band" style="left:${plek(min)}%;width:${plek(max) - plek(min)}%"></span>
      <span class="budget-punt${bedrag > max ? ' boven' : ''}" style="left:${plek(bedrag)}%"></span>
    </div>
    <div class="budget-as" aria-hidden="true"><span style="left:${plek(min)}%">${euro(min)}</span><span style="left:${plek(max)}%">${euro(max)}</span></div>
    <p><strong>${oordeel}</strong> van ${euro(min)} tot ${euro(max)} per persoon.</p>
  </div>`;
}

function tabKosten(o) {
  const i = huisIndex(o);
  const h = o.huizen[i];
  const k = kosten(o, h);
  const kl = o.klimaat ?? {};
  const bier = o.pils?.prijs ?? o.lokaal?.bier;
  const keuze = o.huizen.length > 1
    ? `<label class="veld">Gerekend met
        <select id="huiskeuze">${o.huizen.map((x, n) => `<option value="${n}"${n === i ? ' selected' : ''}>${esc(x.naam)} (${esc(x.rol)})</option>`).join('')}</select>
      </label>`
    : `<p class="dim">Gerekend met ${esc(h.naam)}.</p>`;
  return `
    <h2>Kosten per persoon <span class="indicatie">indicatie</span></h2>
    ${keuze}
    <table class="kostentabel">
      <tbody>${k.posten.map((p) => `<tr><th scope="row">${esc(p.naam)}</th><td>${euro(p.bedrag)}</td></tr>`).join('')}</tbody>
      <tfoot><tr><th scope="row">Totaal per volwassene</th><td>${euro(k.totaal)}</td></tr></tfoot>
    </table>
    ${budgetBalk(k.totaal)}
    <p class="klein">${esc(meta().bronnen?.kosten)}</p>

    <h2>Vlucht en vervoer</h2>
    <dl class="weetjes">
      <div><dt>Maatschappijen</dt><dd>${esc(o.vlucht.maatschappijen)}</dd></div>
      <div><dt>Vluchtduur</dt><dd>${esc(o.vlucht.duur)}</dd></div>
      <div><dt>Vluchten per week</dt><dd>${esc(o.vlucht.per_week)}</dd></div>
      <div><dt>Vluchtprijs <span class="indicatie">indicatie</span></dt><dd>${euro(o.vlucht.prijs_pp)} p.p.</dd></div>
      <div><dt>Van ${esc(o.luchthaven.naam)} naar het huis</dt><dd>${esc(o.transfer)}</dd></div>
      ${o.huurauto_per_stuk ? `<div><dt>Huurauto, per auto per week</dt><dd>${euro(o.huurauto_per_stuk)}</dd></div>` : ''}
    </dl>

    <h2>Klimaat eind september</h2>
    <ul class="klimaat">
      <li>${icoon('zon')}<strong>${esc(kl.lucht)}°C</strong><span>overdag</span></li>
      <li>${icoon('golf')}<strong>${kl.zee == null ? 'geen zee' : `${esc(kl.zee)}°C`}</strong><span>${kl.zee == null ? 'in de buurt' : 'zeewater'}</span></li>
      <li>${icoon('regen')}<strong>${esc(kl.regendagen)}</strong><span>regendagen</span></li>
    </ul>

    <h2>Aan tafel</h2>
    <dl class="weetjes">
      <div><dt>${icoon('bier')}Pils (0,5 l van de tap)</dt><dd>${bier == null ? 'onbekend' : euro(bier, 2)}</dd></div>
      <div><dt>${icoon('restaurants')}Diner voor 2</dt><dd>${o.lokaal?.diner2 == null ? 'onbekend' : euro(o.lokaal.diner2)}</dd></div>
    </dl>`;
}

function tabVoorbereiden() {
  return `<div class="leeg groot">${icoon('koffer')}
    <p><strong>Vragen voor de host en de paklijst</strong></p>
    <p>Deze twee hulpjes komen in een volgende stap op dit tabblad.</p></div>`;
}

const TABINHOUD = { kan: tabKan, huis: tabHuis, kids: tabKids, scores: tabScores, kosten: tabKosten, voorbereiden: tabVoorbereiden };
