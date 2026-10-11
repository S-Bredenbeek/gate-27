// Alle huizen: voor wie puur op het huis wil kiezen. Filters, sorteren, een kaart, favoriete huizen
// en twee tot vier huizen naast elkaar. Het huis zelf is altijd te zien; op een plek die je nog niet
// hebt ontdekt blijft de plaatsnaam geheim en vlieg je er eerst heen.

import {
  meta, alleHuizen, huiskenmerken, landNamen, landNaam, gateCode, kosten, reistijd, airbnbUrl, volwassenen,
  euro, esc, themaStijl,
} from './data.js';
import { staat, wijzig } from './store.js';
import { icoon } from './icons.js';
import { rolLabel, kenmerkChips, huisHart, bronnenBlok, luxeUitleg } from './ui.js';
import { t, locale } from './i18n.js';
import * as kaart from './map.js';

const KIDSPROOF = ['wieg', 'kinderstoel', 'omheind'];
const leeg = () => ({ land: '', maxPrijs: null, minKamers: 0, minScore: 0, kenmerken: new Set(), alleenFav: false, zonderLuxe: false });
let filter = leeg();
let sortering = 'aanrader';
// Aanraders eerst: de sterkste keuze van elke plek, dan de alternatieven en tips, en de luxe-varianten achteraan.
const RANG = { sterkste: 0, alternatief: 1, tip: 1, luxe: 2 };
let gekozen = new Set();

const nl = (n, d = 0) => Number(n).toLocaleString(locale(), { minimumFractionDigits: d, maximumFractionDigits: d });
const fotoUrl = (url) => (/muscache\.com/.test(url) && !url.includes('?') ? `${url}?im_w=720` : url);
const bekend = (o) => staat().bezocht.includes(o.id);
const plaats = (o, h) => (bekend(o) ? h.plaats : t('Plek nog geheim', 'Place still secret'));
const uren = (min) => `${Math.floor(min / 60)}${t('u', 'h')}${String(min % 60).padStart(2, '0')}`;

const SORTEER = {
  aanrader: [() => t('Aanraders eerst', 'Recommended first'), (a, b) => (RANG[a.h.soort] ?? 1) - (RANG[b.h.soort] ?? 1) || a.h.kosten_pp - b.h.kosten_pp],
  prijs: [() => t('Prijs per persoon', 'Price per person'), (a, b) => a.h.kosten_pp - b.h.kosten_pp],
  score: [() => t('Beoordeling', 'Rating'), (a, b) => (b.h.beoordeling ?? 0) - (a.h.beoordeling ?? 0) || (b.h.reviews ?? 0) - (a.h.reviews ?? 0)],
  reviews: [() => t('Aantal reviews', 'Number of reviews'), (a, b) => (b.h.reviews ?? 0) - (a.h.reviews ?? 0)],
  kamers: [() => t('Slaapkamers', 'Bedrooms'), (a, b) => b.h.slaapkamers - a.h.slaapkamers || a.h.kosten_pp - b.h.kosten_pp],
  reistijd: [() => t('Reistijd', 'Travel time'), (a, b) => reistijd(a.o) - reistijd(b.o) || a.h.kosten_pp - b.h.kosten_pp],
};

function gefilterd() {
  const fav = staat().huisFav ?? [];
  return alleHuizen().filter(({ o, h }) => (!filter.land || o.land === filter.land)
    && (filter.maxPrijs == null || h.kosten_pp <= filter.maxPrijs)
    && h.slaapkamers >= filter.minKamers
    && (h.beoordeling ?? 0) >= filter.minScore
    && [...filter.kenmerken].every((k) => h.kenmerken?.[k])
    && (!filter.zonderLuxe || h.soort !== 'luxe')
    && (!filter.alleenFav || fav.includes(String(h.airbnb_id)))).sort(SORTEER[sortering][1]);
}

function kaartje({ o, h, i }) {
  const id = String(h.airbnb_id);
  return `<article class="huiskaart soort-${esc(h.soort)}" style="${themaStijl(o)}" id="hk-${esc(id)}">
    <div class="huisfoto">
      ${h.foto ? `<img src="${esc(fotoUrl(h.foto))}" alt="${t(`Foto van ${esc(h.naam)}`, `Photo of ${esc(h.naam)}`)}" loading="lazy" decoding="async" referrerpolicy="no-referrer">` : ''}
      <div class="fotoplaats"${h.foto ? ' hidden' : ''}>${icoon('huis')}<span>${t('Foto niet beschikbaar', 'Photo not available')}</span></div>
      ${rolLabel(h)}
      ${huisHart(h)}
    </div>
    <div class="huis-tekst">
      <p class="kicker"><span class="landstip"></span>${esc(landNaam(o.land))} · gate ${gateCode(o)}</p>
      <h2>${esc(h.naam)}</h2>
      <p class="plaats">${esc(plaats(o, h))}</p>
      ${luxeUitleg(o, h)}
      <ul class="feiten">
        <li>${icoon('bed')}${esc(h.slaapkamers)} ${t('slaapkamers', 'bedrooms')}</li>
        <li>${icoon('personen')}${t('max.', 'max.')} ${esc(h.max_gasten)}</li>
        <li>${icoon('ster')}${h.beoordeling ? `${nl(h.beoordeling, 2)} <span class="dim">(${nl(h.reviews)})</span>` : t('nieuw', 'new')}</li>
        <li>${icoon('klok')}${uren(reistijd(o))}</li>
      </ul>
      ${kenmerkChips(h)}
      <dl class="prijzen">
        <div><dt>${t('Huis, hele week', 'House, full week')}</dt><dd>${euro(h.prijs_totaal)}</dd></div>
        <div class="allin"><dt>${t('Hele week per persoon', 'Full week per person')} <span class="indicatie">${t('indicatie', 'estimate')}</span></dt><dd>${euro(kosten(o, h).totaal)}</dd></div>
      </dl>
      <div class="acties">
        <button type="button" class="knop primair" data-naar-huis="${esc(o.id)}" data-index="${i}">${t('Bekijk dit huis', 'View this house')}</button>
        <a class="knop" href="${esc(airbnbUrl(h))}" target="_blank" rel="noopener">Airbnb${icoon('extern')}</a>
      </div>
      <label class="vinkje naast"><input type="checkbox" data-kies="${esc(id)}"${gekozen.has(id) ? ' checked' : ''}><span>${t('Naast elkaar zetten', 'Compare side by side')}</span></label>
    </div>
  </article>`;
}

export function toonHuizen(paneel) {
  const alle = alleHuizen();
  const prijzen = alle.map(({ h }) => h.kosten_pp);
  const [laagste, hoogste] = [Math.floor(Math.min(...prijzen) / 25) * 25, Math.ceil(Math.max(...prijzen) / 25) * 25];
  const kamers = [...new Set(alle.map(({ h }) => h.slaapkamers))].sort((a, b) => a - b);
  gekozen = new Set([...gekozen].filter((id) => alle.some(({ h }) => String(h.airbnb_id) === id)));

  paneel.className = 'paneel';
  paneel.style.cssText = '';
  paneel.innerHTML = `
    <p class="kicker">${esc(meta().reisdata)}</p>
    <h1>${t('Alle huizen', 'All houses')}</h1>
    <p class="lead">${t(`${alle.length} huizen in ${landNamen().length} landen. Kies puur op het huis; waar het precies ligt, zie je als je het opent.`, `${alle.length} houses in ${landNamen().length} countries. Choose purely on the house; you'll see exactly where it is when you open it.`)}</p>

    <details class="filters" id="filters">
      <summary>${icoon('filter')}<span>${t('Filters', 'Filters')}</span><span class="filter-aantal" id="filter-aantal"></span></summary>
      <div class="filter-in">
        <div class="filterraster">
          <label class="veld">${t('Land', 'Country')}
            <select id="f-land"><option value="">${t('Alle landen', 'All countries')}</option>${landNamen().map((l) => `<option value="${esc(l)}"${filter.land === l ? ' selected' : ''}>${esc(landNaam(l))}</option>`).join('')}</select>
          </label>
          <label class="veld">${t('Slaapkamers vanaf', 'Bedrooms from')}
            <select id="f-kamers"><option value="0">${t('Maakt niet uit', 'Any')}</option>${kamers.map((k) => `<option value="${k}"${filter.minKamers === k ? ' selected' : ''}>${k}</option>`).join('')}</select>
          </label>
          <label class="veld">${t('Beoordeling vanaf', 'Rating from')}
            <select id="f-score"><option value="0">${t('Maakt niet uit', 'Any')}</option>${[4.5, 4.8, 4.9].map((s) => `<option value="${s}"${filter.minScore === s ? ' selected' : ''}>${nl(s, 1)}</option>`).join('')}</select>
          </label>
          <label class="veld">${t('Per persoon tot', 'Per person up to')} <output id="f-prijs-uit"></output>
            <input type="range" id="f-prijs" min="${laagste}" max="${hoogste}" step="25" value="${filter.maxPrijs ?? hoogste}">
          </label>
        </div>
        <p class="filterkop">${t('Het huis moet hebben', 'The house must have')}</p>
        <div class="kenmerkfilters">
          <button type="button" class="keuze kidsproof" id="f-kids">${icoon('kids')}Kidsproof</button>
          ${huiskenmerken().map((k) => `<button type="button" class="keuze" data-kenmerk="${esc(k.id)}" aria-pressed="${filter.kenmerken.has(k.id)}">${icoon(k.id)}${esc(k.naam)}</button>`).join('')}
        </div>
        <label class="vinkje"><input type="checkbox" id="f-luxe"${filter.zonderLuxe ? ' checked' : ''}><span>${t('Luxe-varianten verbergen', 'Hide luxury options')}</span></label>
        <label class="vinkje"><input type="checkbox" id="f-fav"${filter.alleenFav ? ' checked' : ''}><span>${t('Alleen mijn favoriete huizen', 'Only my favourite houses')}</span></label>
        <p class="klein">${esc(meta().huiskenmerken?.toelichting)}</p>
        <button type="button" class="linkknop" id="f-wis">${t('Wis alle filters', 'Clear all filters')}</button>
      </div>
    </details>

    <div class="sorteerrij">
      <label class="veld">${t('Sorteer op', 'Sort by')}
        <select id="h-sort">${Object.entries(SORTEER).map(([id, [naam]]) => `<option value="${id}"${sortering === id ? ' selected' : ''}>${naam()}</option>`).join('')}</select>
      </label>
      <button type="button" class="knop" id="h-kaart" aria-pressed="false">${icoon('kaart')}${t('Kaart', 'Map')}</button>
    </div>
    <p class="huizen-aantal" id="h-aantal" aria-live="polite"></p>
    <p class="luxe-uitleg los">${icoon('ster')}<span>${t('<strong>Luxe-variant</strong> is het duurdere huis op een plek (tot ca. € 5.500 voor de week). Het zit binnen het budget, maar is niet de aanrader: die heet "Sterkste keuze".', '<strong>Luxury option</strong> is the pricier house in a place (up to approx. €5,500 for the week). It fits the budget, but it is not the recommendation: that one is called "Top pick".')}</span></p>
    <div class="huizenraster" id="huizenraster"></div>
    ${bronnenBlok()}
    <div class="vergelijkbalk" id="vergelijkbalk" hidden>
      <span id="vergelijk-tekst"></span>
      <button type="button" class="knop primair" id="h-vergelijk">${t('Vergelijk deze huizen', 'Compare these houses')}</button>
    </div>`;

  const $ = (s) => paneel.querySelector(s);
  const raster = $('#huizenraster');

  function tekenBalk() {
    const n = gekozen.size;
    $('#vergelijkbalk').hidden = n === 0;
    $('#vergelijk-tekst').textContent = n < 2 ? t('Kies er nog minstens één bij', 'Pick at least one more') : t(`${n} huizen gekozen`, `${n} houses picked`);
    $('#h-vergelijk').disabled = n < 2;
  }

  function teken() {
    const lijst = gefilterd();
    const actief = (filter.land ? 1 : 0) + (filter.maxPrijs != null && filter.maxPrijs < hoogste ? 1 : 0) + (filter.minKamers ? 1 : 0) + (filter.minScore ? 1 : 0) + filter.kenmerken.size + (filter.alleenFav ? 1 : 0) + (filter.zonderLuxe ? 1 : 0);
    $('#filter-aantal').textContent = actief ? `(${actief})` : '';
    $('#f-prijs-uit').textContent = euro(filter.maxPrijs ?? hoogste);
    $('#f-kids').setAttribute('aria-pressed', KIDSPROOF.every((k) => filter.kenmerken.has(k)));
    for (const knop of paneel.querySelectorAll('[data-kenmerk]')) knop.setAttribute('aria-pressed', filter.kenmerken.has(knop.dataset.kenmerk));
    const opKaart = lijst.filter(({ o }) => bekend(o));
    const geheim = lijst.length - opKaart.length;
    $('#h-aantal').textContent = lijst.length === 1 ? t('1 huis', '1 house') : t(`${lijst.length} huizen`, `${lijst.length} houses`);
    if (geheim) $('#h-aantal').textContent += t(` · ${geheim} op een plek die je nog niet kent (niet op de kaart)`, ` · ${geheim} in a place you haven't found yet (not on the map)`);
    raster.innerHTML = lijst.length
      ? lijst.map(kaartje).join('')
      : `<p class="leeg">${t('Geen huis voldoet aan al deze wensen. Zet een filter uit.', 'No house matches all of these. Switch a filter off.')}</p>`;
    for (const foto of raster.querySelectorAll('.huisfoto img')) {
      foto.addEventListener('error', () => {
        foto.nextElementSibling.hidden = false;
        foto.remove();
      }, { once: true });
    }
    kaart.toonHuizen(opKaart, (id) => raster.querySelector(`#hk-${CSS.escape(String(id))}`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    tekenBalk();
  }

  $('#filters').addEventListener('input', () => {
    filter.land = $('#f-land').value;
    filter.minKamers = Number($('#f-kamers').value);
    filter.minScore = Number($('#f-score').value);
    filter.maxPrijs = Number($('#f-prijs').value) >= hoogste ? null : Number($('#f-prijs').value);
    filter.alleenFav = $('#f-fav').checked;
    filter.zonderLuxe = $('#f-luxe').checked;
    teken();
  });
  $('#filters').addEventListener('click', (e) => {
    const kenmerk = e.target.closest('[data-kenmerk]');
    if (kenmerk) {
      const id = kenmerk.dataset.kenmerk;
      if (filter.kenmerken.has(id)) filter.kenmerken.delete(id);
      else filter.kenmerken.add(id);
      return teken();
    }
    if (e.target.closest('#f-kids')) {
      const aan = KIDSPROOF.every((k) => filter.kenmerken.has(k));
      for (const k of KIDSPROOF) (aan ? filter.kenmerken.delete(k) : filter.kenmerken.add(k));
      return teken();
    }
    if (e.target.closest('#f-wis')) {
      filter = leeg();
      toonHuizen(paneel);
    }
  });
  $('#h-sort').addEventListener('change', (e) => {
    sortering = e.target.value;
    teken();
  });
  $('#h-kaart').addEventListener('click', (e) => {
    const groot = document.body.classList.toggle('kaart-groot');
    e.currentTarget.setAttribute('aria-pressed', groot);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  raster.addEventListener('change', (e) => {
    const vak = e.target.closest('[data-kies]');
    if (!vak) return;
    if (vak.checked && gekozen.size >= 4) {
      vak.checked = false;
      $('#vergelijk-tekst').textContent = t('Maximaal vier huizen naast elkaar', 'Four houses side by side at most');
      return;
    }
    if (vak.checked) gekozen.add(vak.dataset.kies);
    else gekozen.delete(vak.dataset.kies);
    tekenBalk();
  });
  raster.addEventListener('click', (e) => {
    const knop = e.target.closest('[data-naar-huis]');
    if (!knop) return;
    const id = knop.dataset.naarHuis;
    wijzig({ huis: { ...staat().huis, [id]: Number(knop.dataset.index) } });
    document.dispatchEvent(new CustomEvent('naarhuis', { detail: { id } }));
  });
  $('#h-vergelijk').addEventListener('click', () => naastElkaar([...gekozen]));
  teken();
}

// Twee tot vier huizen als kolommen, alle velden en kenmerken als rijen.
function naastElkaar(ids) {
  const lijst = ids.map((id) => alleHuizen().find(({ h }) => String(h.airbnb_id) === id)).filter(Boolean);
  const dialoog = document.getElementById('dialoog');
  const rij = (naam, cel) => `<tr><th scope="row">${naam}</th>${lijst.map((x) => `<td>${cel(x)}</td>`).join('')}</tr>`;
  const vink = (aan) => (aan ? `<span class="status status-ja kaal">${icoon('check')}<span>${t('Ja', 'Yes')}</span></span>` : '<span class="dim">–</span>');
  dialoog.onclick = null;
  dialoog.className = 'dialoog breed';
  dialoog.setAttribute('aria-label', t('Huizen naast elkaar', 'Houses side by side'));
  dialoog.innerHTML = `<div class="dialoog-in">
      <h2>${t('Naast elkaar', 'Side by side')}</h2>
      <div class="naastwrap"><table class="naast">
        <thead><tr><th></th>${lijst.map(({ o, h }) => `<th scope="col" style="${themaStijl(o)}">
          ${h.foto ? `<img src="${esc(fotoUrl(h.foto))}" alt="" loading="lazy" referrerpolicy="no-referrer">` : ''}
          <strong>${esc(h.naam)}</strong>${rolLabel(h)}</th>`).join('')}</tr></thead>
        <tbody>
          ${rij(t('Waar', 'Where'), ({ o, h }) => `${esc(landNaam(o.land))}<br><span class="dim">${esc(plaats(o, h))}</span>`)}
          ${rij(t('Per persoon, hele week', 'Per person, full week'), ({ o, h }) => `<strong>${euro(kosten(o, h).totaal)}</strong>`)}
          ${rij(t('Huis, hele week', 'House, full week'), ({ h }) => euro(h.prijs_totaal))}
          ${rij(t(`Huis per persoon (${volwassenen()})`, `House per person (${volwassenen()})`), ({ h }) => euro(h.prijs_totaal / volwassenen()))}
          ${rij(t('Slaapkamers', 'Bedrooms'), ({ h }) => esc(h.slaapkamers))}
          ${rij(t('Max. gasten', 'Max. guests'), ({ h }) => esc(h.max_gasten))}
          ${rij(t('Beoordeling', 'Rating'), ({ h }) => (h.beoordeling ? `${nl(h.beoordeling, 2)} <span class="dim">(${nl(h.reviews)})</span>` : '–'))}
          ${rij(t('Reistijd', 'Travel time'), ({ o }) => uren(reistijd(o)))}
          ${rij(t('Zwembad', 'Pool'), ({ h }) => esc(h.zwembad))}
          ${huiskenmerken().map((k) => rij(esc(k.naam), ({ h }) => vink(h.kenmerken?.[k.id]))).join('')}
          ${rij(t('Waarom dit huis', 'Why this house'), ({ h }) => esc(h.waarom))}
          ${rij(t('Let op', 'Heads up'), ({ h }) => esc(h.let_op))}
          ${rij('Airbnb', ({ h }) => `<a href="${esc(airbnbUrl(h))}" target="_blank" rel="noopener">${t('Bekijk', 'View')}</a>`)}
        </tbody>
      </table></div>
      <p class="klein">${esc(meta().huiskenmerken?.toelichting)}</p>
    </div>
    <div class="dialoog-acties"><button type="button" class="knop" data-sluit>${t('Sluiten', 'Close')}</button></div>`;
  dialoog.showModal();
}
