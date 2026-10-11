// De extra's op de bestemmingspagina: pilsmeter, kostenverdeler, kamerverdeling, vragen voor de host en de paklijst.
// Alles wordt afgeleid uit de JSON; keuzes en vinkjes blijven in de eigen browser staan.

import { meta, opties, land, volwassenen, euro, esc } from './data.js';
import { staat, wijzig } from './store.js';
import { icoon } from './icons.js';
import { poppetje } from './avatar.js';
import { kopieer } from './ui.js';

// ---------- pilsmeter ----------

export function pilsmeter(o) {
  const prijs = o.pils?.prijs ?? o.lokaal?.bier;
  if (prijs == null) return '';
  const goedkoopst = Math.min(...opties().map((x) => x.pils?.prijs ?? Infinity));
  const vulling = Math.max(0.15, Math.min(1, goedkoopst / prijs));
  const top = 78 - vulling * 62;
  const merken = (o.pils?.merken ?? land(o).pils ?? []).join(' en ');
  return `<div class="pilsmeter">
    <svg viewBox="0 0 70 90" role="img" aria-label="Pilsmeter: het glas is voor ${Math.round(vulling * 100)} procent gevuld">
      <clipPath id="pilsglas"><path d="M12 8h40l-5 72H17z"/></clipPath>
      <g clip-path="url(#pilsglas)">
        <rect x="0" y="${top}" width="70" height="90" fill="#F2A900"/>
        <rect x="0" y="${top - 9}" width="70" height="11" fill="#FFF8E1"/>
        <circle cx="24" cy="${top + 16}" r="1.6" fill="#FFE08A"/><circle cx="38" cy="${top + 30}" r="1.3" fill="#FFE08A"/><circle cx="30" cy="${top + 44}" r="1.5" fill="#FFE08A"/>
      </g>
      <path d="M12 8h40l-5 72H17z" fill="none" stroke="#1A2233" stroke-width="3" stroke-linejoin="round"/>
      <path d="M52 22h7a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5h-9" fill="none" stroke="#1A2233" stroke-width="3"/>
    </svg>
    <div>
      <p class="pils-prijs"><strong>${euro(prijs, 2)}</strong> per pils</p>
      ${merken ? `<p>Op de tap: ${esc(merken)}</p>` : ''}
      ${o.pils?.rondje_mannen != null ? `<p class="rondje">Rondje voor de mannen: <strong>${euro(o.pils.rondje_mannen, 2)}</strong></p>` : ''}
      <p class="klein">Hoe voller het glas, hoe meer pils voor je geld.</p>
    </div>
  </div>`;
}

// ---------- kostenverdeler ----------

export function kostenverdeler() {
  const kv = staat().kv ?? {};
  const ikBenStel = meta().groep_figuren?.lijst?.find((f) => f.id === staat().figuur)?.stel != null;
  const soort = kv.soort ?? (ikBenStel ? 'stel' : 'single');
  return `<div class="kostenverdeler" id="kostenverdeler">
    <fieldset class="segment">
      <legend>Reken voor</legend>
      <label><input type="radio" name="kv-soort" value="single"${soort === 'single' ? ' checked' : ''}><span>Single</span></label>
      <label><input type="radio" name="kv-soort" value="stel"${soort === 'stel' ? ' checked' : ''}><span>Stel</span></label>
    </fieldset>
    <label class="vinkje"><input type="checkbox" id="kv-kind"${kv.kind ? ' checked' : ''}><span>Met kind</span></label>
    <div id="kv-kindblok"${kv.kind ? '' : ' hidden'}>
      <p class="klein">${esc(meta().extra_kosten_kids)}</p>
      <label class="veld" for="kv-baby">Babytarief per vlucht (in euro)</label>
      <input type="number" id="kv-baby" min="0" step="5" inputmode="decimal" value="${esc(kv.baby ?? '')}" placeholder="Bijvoorbeeld 30">
    </div>
    <p class="kv-totaal"><span id="kv-label"></span><strong id="kv-bedrag"></strong></p>
  </div>`;
}

export function koppelKostenverdeler(wortel, perVolwassene) {
  const blok = wortel.querySelector('#kostenverdeler');
  if (!blok) return;
  const reken = () => {
    const stel = blok.querySelector('[name=kv-soort]:checked').value === 'stel';
    const kind = blok.querySelector('#kv-kind').checked;
    const baby = Math.max(0, Number(blok.querySelector('#kv-baby').value) || 0);
    wijzig({ kv: { soort: stel ? 'stel' : 'single', kind, baby: baby || '' } });
    blok.querySelector('#kv-kindblok').hidden = !kind;
    const totaal = perVolwassene * (stel ? 2 : 1) + (kind ? baby * 2 : 0);
    blok.querySelector('#kv-label').textContent = `${stel ? 'Voor jullie samen' : 'Voor jou'}${kind ? ', met kind (heen en terug)' : ''}`;
    blok.querySelector('#kv-bedrag').textContent = euro(totaal);
  };
  blok.addEventListener('input', reken);
  reken();
}

// ---------- wie doet wat ----------
// Het lot verdeelt de vakantietaken uit meta.rollen over de volwassen poppetjes.

const volwassenFiguren = () => (meta().groep_figuren?.lijst ?? []).filter((f) => !f.kind);
export const figuurNaam = (index) => staat().namen?.[index] || '';

function schud(n) {
  const rij = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rij[i], rij[j]] = [rij[j], rij[i]];
  }
  return rij;
}

function rolTekst(o, rolIndex) {
  const rol = meta().rollen?.[rolIndex] ?? '';
  return rolIndex === 0 && o.pils?.rondje_mannen != null ? `${rol} (${euro(o.pils.rondje_mannen, 2)})` : rol;
}

export function taakverdeling() {
  return `<h2>Wie doet wat?</h2>
    <p class="dim">Het lot verdeelt de taken. Niet blij met de uitkomst? Schud gewoon opnieuw.</p>
    <ul class="rollen" id="rollen"></ul>
    <div class="acties">
      <button type="button" class="knop primair" id="rollen-schud">Schud de taken</button>
      <button type="button" class="knop" id="rollen-kopieer" hidden>${icoon('kopieer')}Kopieer voor de groepsapp</button>
    </div>`;
}

export function koppelTaakverdeling(wortel, o) {
  const lijst = wortel.querySelector('#rollen');
  if (!lijst) return;
  const figuren = volwassenFiguren();
  const eigen = staat().figuur;
  const aantalRollen = meta().rollen?.length ?? 0;
  const wie = (f, i) => (f.id === eigen ? staat().naam || figuurNaam(i) || 'Jij' : figuurNaam(i));
  const teken = (verdeling) => {
    lijst.innerHTML = figuren.map((f, i) => `<li class="${f.id === eigen ? 'ik' : ''}">
      ${poppetje(f.id === eigen ? { ...f, ...staat().avatar } : f)}
      <span>${wie(f, i) ? `<strong>${esc(wie(f, i))}</strong>` : ''}<span class="rol">${verdeling ? esc(rolTekst(o, verdeling[i] % aantalRollen)) : '?'}</span></span>
    </li>`).join('');
    wortel.querySelector('#rollen-kopieer').hidden = !verdeling;
  };
  teken(staat().rollen?.[o.id]);

  wortel.querySelector('#rollen-schud').addEventListener('click', () => {
    const uitkomst = schud(Math.max(figuren.length, aantalRollen)).slice(0, figuren.length);
    const klaar = () => {
      wijzig({ rollen: { ...staat().rollen, [o.id]: uitkomst } });
      teken(uitkomst);
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return klaar();
    let beurt = 0;
    const timer = setInterval(() => {
      if (!lijst.isConnected || ++beurt > 9) {
        clearInterval(timer);
        if (lijst.isConnected) klaar();
      } else teken(schud(Math.max(figuren.length, aantalRollen)).slice(0, figuren.length));
    }, 90);
  });
  wortel.querySelector('#rollen-kopieer').addEventListener('click', () => {
    const verdeling = staat().rollen?.[o.id];
    if (!verdeling) return;
    const regels = figuren.map((f, i) => `- ${wie(f, i) || `Poppetje ${i + 1}`}: ${rolTekst(o, verdeling[i] % aantalRollen)}`);
    kopieer(`Wie doet wat in ${o.naam}:\n${regels.join('\n')}`, 'Taakverdeling gekopieerd: plak hem in de groepsapp');
  });
}

// ---------- vragen voor de host ----------

const lang = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

export function hostbericht(o, h) {
  const p = meta().periode ?? {};
  const kids = meta().groep_indeling?.kids ?? 0;
  const k = o.kidscheck ?? {};
  const bad = (h.zwembad ?? '').toLowerCase();
  const vragen = [];
  if (/seizoen|season/.test(bad)) vragen.push('Het zwembad is seizoensgebonden: is het in die week zeker open, en is het verwarmd?');
  else if (/verwarmd|heated/.test(bad)) vragen.push('Is het zwembad in die week open en wordt het dan nog verwarmd?');
  else vragen.push('Is het zwembad in die week open, en is het verwarmd?');
  vragen.push(k.wieg && k.kinderstoel
    ? `Klopt het dat er een wieg en een kinderstoel zijn, en kunnen dat er ${kids} van elk worden?`
    : `Zijn er ${kids} wiegen (of kinderbedjes) en ${kids} kinderstoelen, of kunnen die geregeld worden?`);
  vragen.push(/dak|roof/.test(bad)
    ? 'Het zwembad ligt op het dak: is de toegang voor kleine kinderen af te sluiten?'
    : 'Is het zwembad afgeschermd, bijvoorbeeld met een hek of een afdekzeil?');
  if (!k.omheind) vragen.push('Is de tuin omheind of kan een peuter zo de weg op?');
  vragen.push(`Tellen kinderen onder de 2 mee voor het maximum van ${h.max_gasten} gasten?`);
  if (h.let_op) vragen.push(`In de advertentie viel ons dit op: "${h.let_op}" Kun je daar iets meer over vertellen?`);
  return `Hoi! Wij denken erover om ${h.naam} te boeken van ${lang(p.van)} tot ${lang(p.tot)}, met ${volwassenen()} volwassenen en ${kids} kinderen onder de 2. We hebben nog een paar vragen:\n\n${vragen.map((v, i) => `${i + 1}. ${v}`).join('\n')}\n\nAlvast bedankt!`;
}

// ---------- paklijst ----------

export function paklijst(o) {
  const lijst = [...(o.paklijst_extra ?? [])];
  const kids = (meta().groep_indeling?.kids ?? 0) > 0;
  const dak = o.huizen.some((h) => /dak|roof/.test((h.zwembad ?? '').toLowerCase()));
  if (kids && (dak || !o.kidscheck?.omheind)) lijst.push(dak ? 'Zwembandjes en een traphekje (zwembad op het dak)' : 'Zwembandjes en een zwembadhekje (tuin is niet omheind)');
  if ((o.klimaat?.lucht ?? 0) >= 28) lijst.push(`Zonnetentje voor de kleintjes (${o.klimaat.lucht}°C overdag)`);
  if (kids) lijst.push('Autostoeltjes: meenemen of bij de huurauto reserveren');
  if (land(o).stekker) lijst.push(`Stekker: ${land(o).stekker}`);
  if (o.klimaat?.zee != null) lijst.push(`Zwemspullen (zee ${o.klimaat.zee}°C)`);
  lijst.push('Paspoort of ID-kaart, ook voor de kleintjes');
  return lijst;
}

export function voorbereiden(o) {
  const afgevinkt = staat().paklijst?.[o.id] ?? [];
  return `
    ${taakverdeling()}

    <h2>Vragen voor de host</h2>
    <p class="dim">Kant-en-klaar om via Airbnb te sturen, per huis.</p>
    ${o.huizen.map((h, i) => `<details class="hostvraag"${i === 0 ? ' open' : ''}>
      <summary>${esc(h.naam)} <span class="dim">(${esc(h.rol)})</span></summary>
      <pre>${esc(hostbericht(o, h))}</pre>
      <button type="button" class="knop" data-kopieer-host="${i}">${icoon('kopieer')}Kopieer dit bericht</button>
    </details>`).join('')}

    <h2>Paklijst</h2>
    <ul class="paklijst" id="paklijst">
      ${paklijst(o).map((item) => `<li><label class="vinkje"><input type="checkbox" value="${esc(item)}"${afgevinkt.includes(item) ? ' checked' : ''}><span>${esc(item)}</span></label></li>`).join('')}
    </ul>`;
}

export function koppelVoorbereiden(wortel, o) {
  koppelTaakverdeling(wortel, o);
  for (const knop of wortel.querySelectorAll('[data-kopieer-host]')) {
    knop.addEventListener('click', () => kopieer(hostbericht(o, o.huizen[Number(knop.dataset.kopieerHost)]), 'Bericht gekopieerd: plak het in Airbnb'));
  }
  wortel.querySelector('#paklijst')?.addEventListener('change', () => {
    const aan = [...wortel.querySelectorAll('#paklijst input:checked')].map((v) => v.value);
    wijzig({ paklijst: { ...staat().paklijst, [o.id]: aan } });
  });
}
