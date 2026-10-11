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

// ---------- kamerverdeling ----------

function eenheden() {
  const figuren = meta().groep_figuren?.lijst ?? [];
  const lijst = [];
  const stellen = new Map();
  for (const f of figuren) {
    if (f.kind) lijst.push({ id: f.id, soort: 'kind', figuren: [f], naam: 'Kleintje' });
    else if (f.stel != null) {
      if (!stellen.has(f.stel)) {
        stellen.set(f.stel, { id: `stel-${f.stel}`, soort: 'stel', figuren: [], naam: `Stel ${f.stel}` });
        lijst.push(stellen.get(f.stel));
      }
      stellen.get(f.stel).figuren.push(f);
    } else lijst.push({ id: f.id, soort: 'single', figuren: [f], naam: 'Single' });
  }
  const volgorde = { stel: 0, single: 1, kind: 2 };
  return lijst.sort((a, b) => volgorde[a.soort] - volgorde[b.soort]);
}

// Startverdeling: elk stel een kamer, de singles daarna; zijn er te weinig kamers, dan delen de singles de laatste.
function startverdeling(kamers) {
  const plek = {};
  let k = 0;
  for (const e of eenheden()) {
    if (e.soort === 'kind') plek[e.id] = null;
    else plek[e.id] = Math.min(k++, kamers - 1);
  }
  return plek;
}

export function kamerverdeling(h) {
  return `<details class="kamers" data-kamers="${esc(h.airbnb_id)}" data-n="${esc(h.slaapkamers)}">
    <summary>${icoon('bed')}Wie slaapt waar?</summary>
    <div class="kamers-in"></div>
  </details>`;
}

export function koppelKamers(wortel) {
  for (const blok of wortel.querySelectorAll('[data-kamers]')) {
    const sleutel = blok.dataset.kamers;
    const n = Number(blok.dataset.n) || 1;
    const lijst = eenheden();
    const eigen = staat().figuur;
    let gekozen = null;
    const plekken = () => ({ ...startverdeling(n), ...(staat().kamers?.[sleutel] ?? {}) });
    const bewaar = (plek) => wijzig({ kamers: { ...staat().kamers, [sleutel]: plek } });

    const teken = () => {
      const plek = plekken();
      const chip = (e) => `<button type="button" class="bewoner${e.figuren.some((f) => f.id === eigen) ? ' ik' : ''}" draggable="true" data-eenheid="${e.id}" aria-pressed="${gekozen === e.id}" aria-label="${e.naam}${plek[e.id] == null ? ', nog geen kamer' : `, kamer ${plek[e.id] + 1}`}">${e.figuren.map((f) => poppetje(f.id === eigen ? { ...f, ...staat().avatar } : f)).join('')}</button>`;
      const kamers = Array.from({ length: n }, (_, i) => {
        const hier = lijst.filter((e) => plek[e.id] === i);
        const groten = hier.reduce((t, e) => t + (e.soort === 'kind' ? 0 : e.figuren.length), 0);
        return `<div class="kamer${groten > 2 ? ' vol' : ''}" data-kamer="${i}">
          <p>Kamer ${i + 1}${groten > 2 ? ' <span>krap</span>' : ''}</p>
          <div class="kamer-in">${hier.map(chip).join('')}</div>
          ${gekozen ? `<button type="button" class="hierheen" data-naar="${i}">Hierheen</button>` : ''}
        </div>`;
      }).join('');
      const los = lijst.filter((e) => plek[e.id] == null);
      const groot = lijst.filter((e) => e.soort !== 'kind').length;
      const meldingen = [];
      if (n < groot) meldingen.push('De singles moeten dan een kamer delen.');
      if (los.some((e) => e.soort === 'kind')) meldingen.push('Zet de kleintjes bij hun ouders op de kamer.');
      blok.querySelector('.kamers-in').innerHTML = `
        <p class="klein">Tik een poppetje aan en kies een kamer (of sleep). ${n} slaapkamers.</p>
        <div class="plattegrond">${kamers}</div>
        ${los.length ? `<div class="kamer los" data-kamer="los"><p>Nog geen kamer</p><div class="kamer-in">${los.map(chip).join('')}</div></div>` : ''}
        ${meldingen.map((m) => `<p class="kamermelding">${icoon('vraag')}${esc(m)}</p>`).join('')}
        <button type="button" class="linkknop" data-herstel>Begin opnieuw</button>`;
    };

    const zet = (id, naar) => {
      bewaar({ ...plekken(), [id]: naar });
      gekozen = null;
      teken();
    };
    blok.addEventListener('click', (e) => {
      const bewoner = e.target.closest('[data-eenheid]');
      const naar = e.target.closest('[data-naar]');
      if (bewoner) {
        gekozen = gekozen === bewoner.dataset.eenheid ? null : bewoner.dataset.eenheid;
        teken();
      } else if (naar && gekozen) zet(gekozen, Number(naar.dataset.naar));
      else if (e.target.closest('[data-herstel]')) {
        bewaar(startverdeling(n));
        gekozen = null;
        teken();
      }
    });
    blok.addEventListener('dragstart', (e) => {
      const bewoner = e.target.closest?.('[data-eenheid]');
      if (bewoner) e.dataTransfer.setData('text/plain', bewoner.dataset.eenheid);
    });
    blok.addEventListener('dragover', (e) => {
      if (e.target.closest?.('[data-kamer]')) e.preventDefault();
    });
    blok.addEventListener('drop', (e) => {
      const kamer = e.target.closest?.('[data-kamer]');
      const id = e.dataTransfer.getData('text/plain');
      if (!kamer || !lijst.some((x) => x.id === id)) return;
      e.preventDefault();
      zet(id, kamer.dataset.kamer === 'los' ? null : Number(kamer.dataset.kamer));
    });
    teken();
  }
}

// ---------- vragen voor de host ----------

const lang = (iso) => new Date(`${iso}T12:00:00`).toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' });

export function hostbericht(o, h) {
  const p = meta().periode ?? {};
  const kids = meta().groep_indeling?.kids ?? 0;
  const k = o.kidscheck ?? {};
  const bad = (h.zwembad ?? '').toLowerCase();
  const vragen = [];
  if (bad.includes('seizoen')) vragen.push('Het zwembad is seizoensgebonden: is het in die week zeker open, en is het verwarmd?');
  else if (bad.includes('verwarmd')) vragen.push('Is het zwembad in die week open en wordt het dan nog verwarmd?');
  else vragen.push('Is het zwembad in die week open, en is het verwarmd?');
  vragen.push(k.wieg && k.kinderstoel
    ? `Klopt het dat er een wieg en een kinderstoel zijn, en kunnen dat er ${kids} van elk worden?`
    : `Zijn er ${kids} wiegen (of kinderbedjes) en ${kids} kinderstoelen, of kunnen die geregeld worden?`);
  vragen.push(bad.includes('dak')
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
  const dak = o.huizen.some((h) => (h.zwembad ?? '').toLowerCase().includes('dak'));
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
  for (const knop of wortel.querySelectorAll('[data-kopieer-host]')) {
    knop.addEventListener('click', () => kopieer(hostbericht(o, o.huizen[Number(knop.dataset.kopieerHost)]), 'Bericht gekopieerd: plak het in Airbnb'));
  }
  wortel.querySelector('#paklijst')?.addEventListener('change', () => {
    const aan = [...wortel.querySelectorAll('#paklijst input:checked')].map((v) => v.value);
    wijzig({ paklijst: { ...staat().paklijst, [o.id]: aan } });
  });
}
