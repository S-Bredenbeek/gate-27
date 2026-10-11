// Jogo bonito: hooghouden. Tik op de bal om hem in de lucht te houden; waar je hem raakt bepaalt de richting.
// Elke plek heeft zijn eigen spelregel (optie.spel in de JSON): opkomend water, windvlagen, wijnranken in de hoeken,
// overvliegers om te ontwijken, een smal straatje of bonusvoorwerpen. De records van alle plekken tellen op tot één totaal.

import { meta, land, esc, themaStijl } from './data.js';
import { staat, wijzig } from './store.js';
import { patroon } from './patterns.js';
import { motiefTekening } from './motifs.js';
import { kopieer } from './ui.js';
import { t } from './i18n.js';

const INKT = '#1A2233';
const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
// Vanaf zoveel keer hooghouden op een plek krijgt de stempel van die plek een gouden rand.
export const GOUD = 10;
export const isGoud = (id) => (staat().hooghoud?.[id] ?? 0) >= GOUD;
export const totaalHooghouden = () => Object.values(staat().hooghoud ?? {}).reduce((som, n) => som + n, 0);
let stop = null;

function plaatje(motief) {
  if (!motiefTekening(motief)) return null;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="96" height="96" color="${INKT}" fill="none" stroke="${INKT}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="24" cy="24" r="23" fill="#FFFDF8" stroke="none"/>${motiefTekening(motief)}</svg>`;
  const beeld = new Image();
  beeld.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  return beeld;
}

export function speel(o) {
  stop?.();
  const el = document.getElementById('spel');
  const l = o ? land(o) : null;
  const kleuren = l ? [l.kleuren.basis, l.kleuren.accent, l.kleuren.licht] : ['#12305A', '#FFC53D', '#FFFDF8'];
  const sleutel = o?.id ?? 'vertrekhal';
  const plek = o?.naam ?? t(`de vertrekhal van ${meta().vertrek.naam}`, `Departures at ${meta().vertrek.naam}`);
  const soort = o?.spel?.soort ?? null;
  const beeld = plaatje(o?.spel?.motief);
  const record = () => staat().hooghoud?.[sleutel] ?? 0;

  el.style.cssText = o ? `${themaStijl(o)};--patroon:${patroon(l.patroon, l.kleuren.basis)}` : '';
  el.innerHTML = `
    <div class="spel-kop">
      <button type="button" class="knop licht" id="spel-sluit">${t('Stoppen', 'Stop')}</button>
      <p class="spel-stand"><b id="spel-score">0</b><span>${t('record', 'best')} <i id="spel-record">${record()}</i> · ${t('totaal', 'total')} <i id="spel-totaal">${totaalHooghouden()}</i></span></p>
    </div>
    <p class="spel-veld">${o?.spel ? `<strong>${esc(o.spel.naam)}.</strong> ${esc(o.spel.regel)}` : t('Warm alvast op in de vertrekhal. Elke plek heeft straks zijn eigen spelregel.', 'Warm up in Departures. Every place has its own twist later on.')}</p>
    <canvas id="spel-canvas" aria-label="${t('Hooghoudspel: tik op de bal om hem in de lucht te houden', 'Keepy-uppy game: tap the ball to keep it in the air')}"></canvas>
    <p class="spel-melding" id="spel-melding" role="status" aria-live="polite"></p>
    <div class="spel-einde" id="spel-einde" hidden></div>`;
  el.hidden = false;

  const canvas = el.querySelector('#spel-canvas');
  const ctx = canvas.getContext('2d');
  const scoreEl = el.querySelector('#spel-score');
  const meldingEl = el.querySelector('#spel-melding');
  const eindeEl = el.querySelector('#spel-einde');
  let B = 0;
  let H = 0;
  let bal;
  let score;
  let basisZwaarte;
  let fase; // 'klaar' (wacht op eerste tik), 'speelt', 'af'
  let vorige;
  let frame;
  let tijd;
  let dingen; // overvliegers of bonusvoorwerpen
  let volgendDing;
  let vlaag;
  let volgendeVlaag;
  let confetti = [];
  let meldTimer;

  function pasMaat() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    B = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = B * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // De spelregels per soort, als maten van het veld.
  const marge = () => (soort === 'smal' ? B * 0.17 : 0);
  const water = () => (soort === 'zee' ? H * (0.05 + (0.5 + 0.5 * Math.sin(tijd * 1.1 - 1.5)) * Math.min(0.27, 0.1 + score * 0.006)) : 0);
  const vloer = () => H - 8 - water();
  const ranken = () => (soort === 'takken' ? [{ x: 0, y: 0, b: B * 0.3, h: H * 0.2 }, { x: B * 0.7, y: 0, b: B * 0.3, h: H * 0.2 }] : []);

  // De adresbalk van een telefoon schuift in en uit: dan alleen de maat bijwerken, niet het spel herstarten.
  function opMaat() {
    if (fase !== 'speelt') return opnieuw();
    pasMaat();
  }

  function opnieuw() {
    pasMaat();
    const r = Math.max(26, Math.min(B, H) * 0.075);
    bal = { x: B / 2, y: H * 0.5, vx: 0, vy: 0, r, draai: 0 };
    score = 0;
    basisZwaarte = H * 2.1;
    fase = 'klaar';
    tijd = 0;
    dingen = [];
    volgendDing = 1.5;
    vlaag = null;
    volgendeVlaag = 2;
    confetti = [];
    scoreEl.textContent = '0';
    eindeEl.hidden = true;
    teken();
  }

  function meld(tekst) {
    meldingEl.textContent = tekst;
    meldingEl.classList.add('zichtbaar');
    clearTimeout(meldTimer);
    meldTimer = setTimeout(() => meldingEl.classList.remove('zichtbaar'), 2200);
  }

  function punten(erbij) {
    const eerst = score;
    score += erbij;
    scoreEl.textContent = score;
    const gehaald = (grens) => eerst < grens && score >= grens;
    if (gehaald(10)) {
      meld(o && !isGoud(sleutel) ? t('Goud! Je stempel krijgt een gouden rand.', 'Gold! Your stamp gets a golden rim.') : t('Tien! Lekker bezig.', 'Ten! Nice going.'));
      if (!rustig()) {
        confetti = Array.from({ length: 70 }, () => ({
          x: Math.random() * B, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 220,
          k: kleuren[Math.floor(Math.random() * kleuren.length)], h: Math.random() * 6, m: 5 + Math.random() * 6,
        }));
      }
    }
    for (const [grens, tekst] of [[25, t('Stempel verdiend: Jogo bonito!', 'Stamp earned: Jogo bonito!')], [50, t('Vijftig! De gouden stempel is van jou.', 'Fifty! The golden stamp is yours.')]]) {
      if (!gehaald(grens)) continue;
      if ((staat().jogo ?? 0) < grens) {
        wijzig({ jogo: grens });
        document.dispatchEvent(new Event('staatgewijzigd'));
      }
      meld(tekst);
    }
  }

  function tik(e) {
    if (fase === 'af') return;
    const vak = canvas.getBoundingClientRect();
    const x = e.clientX - vak.left;
    const y = e.clientY - vak.top;
    if (Math.hypot(x - bal.x, y - bal.y) > bal.r * 1.7) return;
    e.preventDefault();
    if (fase === 'klaar') {
      fase = 'speelt';
      vorige = performance.now();
      frame = requestAnimationFrame(lus);
    }
    // links raken stuurt de bal naar rechts, en andersom
    bal.vx = Math.max(-1, Math.min(1, (bal.x - x) / bal.r)) * B * 0.55;
    bal.vy = -H * 1.05;
    punten(1);
  }

  function lus(nu) {
    const dt = Math.min(0.033, (nu - vorige) / 1000);
    vorige = nu;
    tijd += dt;

    if (soort === 'wind') {
      if (!vlaag && tijd > volgendeVlaag) vlaag = { kant: Math.random() < 0.5 ? -1 : 1, tot: tijd + 1.3 };
      if (vlaag) {
        bal.vx += vlaag.kant * B * 1.7 * dt;
        if (tijd > vlaag.tot) {
          vlaag = null;
          volgendeVlaag = tijd + 1.6 + Math.random() * 2;
        }
      }
    }
    if ((soort === 'vliegers' || soort === 'bonus') && tijd > volgendDing) {
      const kant = Math.random() < 0.5 ? -1 : 1;
      dingen.push({ x: kant > 0 ? -30 : B + 30, y: H * (0.12 + Math.random() * 0.4), vx: kant * B * (0.2 + Math.random() * 0.16), r: Math.max(22, bal.r * 0.85), golf: Math.random() * 6 });
      volgendDing = tijd + (soort === 'bonus' ? 2.2 : Math.max(1.5, 3.2 - score * 0.04));
    }

    bal.vy += basisZwaarte * 1.07 ** Math.floor(score / 10) * dt;
    bal.x += bal.vx * dt;
    bal.y += bal.vy * dt;
    bal.draai += (bal.vx / bal.r) * dt;
    const links = marge() + bal.r;
    const rechts = B - marge() - bal.r;
    if (bal.x < links) { bal.x = links; bal.vx = Math.abs(bal.vx) * 0.8; }
    if (bal.x > rechts) { bal.x = rechts; bal.vx = -Math.abs(bal.vx) * 0.8; }
    if (bal.y < bal.r) { bal.y = bal.r; bal.vy = Math.abs(bal.vy) * 0.4; }

    for (const d of dingen) {
      d.x += d.vx * dt;
      d.golf += dt * 3;
      if (Math.hypot(d.x - bal.x, d.y + Math.sin(d.golf) * 8 - bal.y) < bal.r + d.r * 0.8) {
        if (soort === 'bonus') {
          d.weg = true;
          punten(2);
          meld('+2');
        } else {
          teken();
          return af('botsing');
        }
      }
    }
    dingen = dingen.filter((d) => !d.weg && d.x > -60 && d.x < B + 60);
    for (const r of ranken()) {
      const dx = bal.x - Math.max(r.x, Math.min(bal.x, r.x + r.b));
      const dy = bal.y - Math.max(r.y, Math.min(bal.y, r.y + r.h));
      if (dx * dx + dy * dy < bal.r * bal.r) {
        teken();
        return af('takken');
      }
    }
    for (const c of confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.h += dt * 6; }
    confetti = confetti.filter((c) => c.y < H + 20);
    if (bal.y >= vloer() - bal.r) {
      bal.y = vloer() - bal.r;
      teken();
      return af(soort === 'zee' ? 'zee' : 'grond');
    }
    teken();
    frame = requestAnimationFrame(lus);
  }

  function teken() {
    ctx.clearRect(0, 0, B, H);
    const grond = vloer();

    if (soort === 'smal') {
      ctx.fillStyle = kleuren[0];
      ctx.fillRect(0, 0, marge(), H);
      ctx.fillRect(B - marge(), 0, marge(), H);
      ctx.fillStyle = 'rgba(255,255,255,.55)';
      for (let y = 30; y < H - 60; y += 78) {
        ctx.fillRect(marge() * 0.25, y, marge() * 0.5, 34);
        ctx.fillRect(B - marge() * 0.75, y + 30, marge() * 0.5, 34);
      }
    }
    for (const r of ranken()) {
      ctx.fillStyle = 'rgba(61,122,58,.28)';
      ctx.fillRect(r.x, r.y, r.b, r.h);
      ctx.strokeStyle = '#3D7A3A';
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.strokeRect(r.x + 1.5, r.y + 1.5, r.b - 3, r.h - 3);
      ctx.setLineDash([]);
      if (beeld?.complete) {
        const m = Math.min(r.b / 2.4, r.h * 0.6);
        ctx.drawImage(beeld, r.x + r.b * 0.12, r.y + r.h * 0.2, m, m);
        ctx.drawImage(beeld, r.x + r.b * 0.52, r.y + r.h * 0.32, m, m);
      }
    }
    if (soort === 'wind' && vlaag) {
      ctx.strokeStyle = 'rgba(26,34,51,.3)';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const y = H * (0.12 + i * 0.11);
        const x = ((tijd * 520 * vlaag.kant + i * 137) % (B + 120) + B + 120) % (B + 120) - 60;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 46 * vlaag.kant, y);
        ctx.stroke();
      }
    }

    // grond, water en schaduw
    if (soort === 'zee') {
      ctx.fillStyle = 'rgba(31,111,168,.78)';
      ctx.beginPath();
      ctx.moveTo(0, H);
      for (let x = 0; x <= B; x += 12) ctx.lineTo(x, grond + 8 + Math.sin(x / 34 + tijd * 3) * 6);
      ctx.lineTo(B, H);
      ctx.fill();
    } else {
      ctx.fillStyle = 'rgba(26,34,51,.14)';
      ctx.fillRect(0, H - 8, B, 8);
    }
    const hoogte = Math.max(0, Math.min(1, (grond - bal.y) / H));
    ctx.beginPath();
    ctx.ellipse(bal.x, grond, bal.r * (1.1 - hoogte * 0.6), 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26,34,51,${0.3 - hoogte * 0.2})`;
    ctx.fill();

    for (const d of dingen) {
      const y = d.y + Math.sin(d.golf) * 8;
      if (beeld?.complete) ctx.drawImage(beeld, d.x - d.r, y - d.r, d.r * 2, d.r * 2);
      else {
        ctx.beginPath();
        ctx.arc(d.x, y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = soort === 'bonus' ? kleuren[1] : INKT;
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(d.x, y, d.r, 0, Math.PI * 2);
      ctx.lineWidth = 3;
      ctx.strokeStyle = soort === 'bonus' ? '#2E9A5F' : '#C83A30';
      ctx.stroke();
    }
    for (const c of confetti) {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.h);
      ctx.fillStyle = c.k;
      ctx.fillRect(-c.m / 2, -c.m / 4, c.m, c.m / 2);
      ctx.restore();
    }

    // de bal: wit met een vijfhoek en vijf naden
    ctx.save();
    ctx.translate(bal.x, bal.y);
    if (!rustig()) ctx.rotate(bal.draai);
    ctx.beginPath();
    ctx.arc(0, 0, bal.r, 0, Math.PI * 2);
    ctx.fillStyle = '#FFFFFF';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = INKT;
    ctx.stroke();
    ctx.fillStyle = INKT;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const h = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.lineTo(Math.cos(h) * bal.r * 0.4, Math.sin(h) * bal.r * 0.4);
    }
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 5; i++) {
      const h = (i / 5) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(h) * bal.r * 0.4, Math.sin(h) * bal.r * 0.4);
      ctx.lineTo(Math.cos(h) * bal.r, Math.sin(h) * bal.r);
      ctx.stroke();
    }
    ctx.restore();
    if (fase === 'klaar') {
      ctx.fillStyle = INKT;
      ctx.font = '600 18px Inter, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(t('Tik op de bal om te beginnen', 'Tap the ball to start'), B / 2, bal.y + bal.r + 44);
    }
  }

  function af(reden) {
    fase = 'af';
    cancelAnimationFrame(frame);
    const nieuwRecord = score > record();
    if (nieuwRecord) wijzig({ hooghoud: { ...staat().hooghoud, [sleutel]: score } });
    el.querySelector('#spel-record').textContent = record();
    el.querySelector('#spel-totaal').textContent = totaalHooghouden();
    const naam = staat().naam || t('Ik', 'I');
    const afloop = {
      zee: t('weggespoeld door de zee', 'washed away by the sea'),
      takken: t('bal in de wijnranken', 'ball in the vines'),
      botsing: t('botsing in de lucht', 'mid-air collision'),
      grond: t('bal op de grond', 'ball on the ground'),
    }[reden];
    eindeEl.innerHTML = `
      <p class="hand">${nieuwRecord && score > 0 ? t(`${afloop}, maar wel een record!`, `${afloop}, but a new best!`) : afloop}</p>
      <p class="spel-eindscore"><b>${score}</b> ${t('keer hooggehouden', score === 1 ? 'keepy-uppie' : 'keepy-uppies')}</p>
      ${o ? `<p class="spel-goud${isGoud(sleutel) ? ' binnen' : ''}">${isGoud(sleutel) ? t('Gouden stempel binnen voor deze plek', 'Golden stamp earned for this place') : t(`Nog ${GOUD - record()} voor een gouden stempel`, `${GOUD - record()} more for a golden stamp`)}</p>` : ''}
      <p class="spel-totaal">${t(`Totaal over alle plekken: <strong>${totaalHooghouden()}</strong>`, `Total across all places: <strong>${totaalHooghouden()}</strong>`)}</p>
      <div class="acties">
        <button type="button" class="knop primair" id="spel-opnieuw">${t('Nog een keer', 'Again')}</button>
        <button type="button" class="knop" id="spel-deel"${score ? '' : ' disabled'}>${t('Deel je score', 'Share your score')}</button>
        ${o ? `<button type="button" class="knop" id="spel-verder">${t('Volgende plek', 'Next place')}</button>` : ''}
      </div>`;
    if (nieuwRecord) document.dispatchEvent(new Event('staatgewijzigd'));
    eindeEl.querySelector('#spel-verder')?.addEventListener('click', () => {
      sluit();
      document.dispatchEvent(new CustomEvent('verrasvlucht', { detail: { land: o.land } }));
    });
    eindeEl.hidden = false;
    eindeEl.querySelector('#spel-opnieuw').addEventListener('click', opnieuw);
    eindeEl.querySelector('#spel-deel').addEventListener('click', () => kopieer(
      t(`${naam} hield ${score} keer hoog in ${plek} (totaal ${totaalHooghouden()})`, `${naam} did ${score} ${score === 1 ? 'keepy-uppie' : 'keepy-uppies'} in ${plek} (total ${totaalHooghouden()})`),
      t('Score gekopieerd: plak hem in de groepsapp', 'Score copied: paste it in the group chat'),
    ));
    eindeEl.querySelector('#spel-opnieuw').focus({ preventScroll: true });
  }

  function sluit() {
    cancelAnimationFrame(frame);
    clearTimeout(meldTimer);
    removeEventListener('resize', opMaat);
    el.hidden = true;
    el.innerHTML = '';
    stop = null;
  }

  canvas.addEventListener('pointerdown', tik);
  el.querySelector('#spel-sluit').addEventListener('click', sluit);
  addEventListener('resize', opMaat);
  if (beeld) beeld.onload = () => fase !== 'speelt' && teken();
  stop = sluit;
  opnieuw();
  el.querySelector('#spel-sluit').focus({ preventScroll: true });
}

export const stopSpel = () => stop?.();
