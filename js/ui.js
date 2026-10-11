// Kleine bouwstenen die op meerdere schermen terugkomen.

import { icoon } from './icons.js';
import { meta, esc } from './data.js';
import { staat } from './store.js';

let toastTimer;
export function toast(tekst) {
  const el = document.getElementById('toast');
  el.textContent = tekst;
  el.classList.add('zichtbaar');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('zichtbaar'), 2800);
}

export async function kopieer(tekst, melding = 'Gekopieerd') {
  try {
    await navigator.clipboard.writeText(tekst);
  } catch {
    const veld = document.createElement('textarea');
    veld.value = tekst;
    veld.setAttribute('readonly', '');
    veld.style.cssText = 'position:fixed;opacity:0;top:0;left:0';
    (document.querySelector('dialog[open]') ?? document.body).append(veld);
    veld.select();
    let gelukt = false;
    try {
      gelukt = document.execCommand('copy');
    } catch {
      gelukt = false;
    }
    veld.remove();
    if (!gelukt) return toast('Kopiëren lukte niet: selecteer de tekst zelf');
  }
  toast(melding);
}

const STATUS = {
  ja: { icoon: 'check', kort: 'Ja' },
  beperkt: { icoon: 'beperkt', kort: 'Beperkt' },
  nee: { icoon: 'kruis', kort: 'Nee' },
  onbekend: { icoon: 'vraag', kort: 'Onbekend' },
};

// Statuslabel uit meta.mogelijkheden.statussen; "kort" voor de matrix.
export function statusLabel(status, kort = false) {
  const sleutel = status in STATUS ? status : 'onbekend';
  const s = STATUS[sleutel];
  const tekst = kort ? s.kort : meta().mogelijkheden.statussen[status] ?? status;
  return `<span class="status status-${sleutel}">${icoon(s.icoon)}<span>${esc(tekst)}</span></span>`;
}

export function hartKnop(id, naam) {
  const aan = staat().top3.includes(id);
  return `<button type="button" class="hart" data-hart="${esc(id)}" aria-pressed="${aan}" aria-label="${esc(naam)} in mijn top 3" title="In mijn top 3">${icoon('hart')}</button>`;
}

export function bolletjes(n, max = 5) {
  const stippen = Array.from({ length: max }, (_, i) => `<i class="${i < n ? 'aan' : ''}"></i>`).join('');
  return `<span class="bolletjes" role="img" aria-label="${n} van ${max}">${stippen}</span>`;
}

export function beren(n, max = 5) {
  const rij = Array.from({ length: max }, (_, i) => `<span class="${i < n ? 'aan' : ''}">${icoon('kids')}</span>`).join('');
  return `<span class="beren" role="img" aria-label="${n} van ${max} beren">${rij}</span>`;
}

const BRONNAAM = {
  huizen: 'Huizen',
  vluchten: 'Vluchten',
  klimaat: 'Klimaat',
  prijzen_lokaal: 'Lokale prijzen',
  veiligheid: 'Veiligheid',
  kosten: 'Kosten per persoon',
  mogelijkheden: 'Wat kan er',
  pils: 'Bierprijs',
};

export function bronnenBlok() {
  const rijen = Object.entries(meta().bronnen ?? {})
    .map(([sleutel, tekst]) => `<dt>${esc(BRONNAAM[sleutel] ?? sleutel)}</dt><dd>${esc(tekst)}</dd>`)
    .join('');
  return `<details class="bronnen"><summary>Hoe is dit onderzocht?</summary><dl>${rijen}</dl></details>`;
}
