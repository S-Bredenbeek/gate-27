// Jogo bonito: hooghouden. Tik op de bal om hem in de lucht te houden; waar je hem raakt bepaalt de richting.
// Eenvoudige physics op een canvas. De achtergrond (landkleuren en patroon) komt uit de CSS van de omlijsting.

import { meta, land, esc, themaStijl } from './data.js';
import { staat, wijzig } from './store.js';
import { patroon } from './patterns.js';
import { kopieer } from './ui.js';

const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
let stop = null;

export function speel(o) {
  stop?.();
  const el = document.getElementById('spel');
  const l = o ? land(o) : null;
  const kleuren = l ? [l.kleuren.basis, l.kleuren.accent, l.kleuren.licht] : ['#12305A', '#FFC53D', '#FFFDF8'];
  const sleutel = o?.id ?? 'vertrekhal';
  const plek = o?.naam ?? `de vertrekhal van ${meta().vertrek.naam}`;
  const veld = o?.mogelijkheden?.hooghouden;
  const record = () => staat().hooghoud?.[sleutel] ?? 0;

  el.style.cssText = o ? `${themaStijl(o)};--patroon:${patroon(l.patroon, l.kleuren.basis)}` : '';
  el.innerHTML = `
    <div class="spel-kop">
      <button type="button" class="knop licht" id="spel-sluit">Stoppen</button>
      <p class="spel-stand"><b id="spel-score">0</b><span>record <i id="spel-record">${record()}</i></span></p>
    </div>
    <p class="spel-veld">${veld ? `<strong>${veld[0] === 'nee' ? 'Hier kan het alleen digitaal' : 'Speel hier echt'}:</strong> ${esc(veld[1])}` : 'Warm alvast op in de vertrekhal'}</p>
    <canvas id="spel-canvas" aria-label="Hooghoudspel: tik op de bal om hem in de lucht te houden"></canvas>
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
  let zwaarte;
  let fase; // 'klaar' (wacht op eerste tik), 'speelt', 'af'
  let vorige;
  let frame;
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

  function opnieuw() {
    pasMaat();
    const r = Math.max(26, Math.min(B, H) * 0.075);
    bal = { x: B / 2, y: H * 0.45, vx: 0, vy: 0, r, draai: 0 };
    score = 0;
    zwaarte = H * 2.1;
    fase = 'klaar';
    confetti = [];
    scoreEl.textContent = '0';
    eindeEl.hidden = true;
    teken();
  }

  function meld(tekst) {
    meldingEl.textContent = tekst;
    meldingEl.classList.add('zichtbaar');
    clearTimeout(meldTimer);
    meldTimer = setTimeout(() => meldingEl.classList.remove('zichtbaar'), 2400);
  }

  function mijlpaal() {
    if (score % 10 === 0) zwaarte *= 1.07;
    if (score === 10) {
      meld('Tien! Lekker bezig.');
      if (!rustig()) {
        confetti = Array.from({ length: 70 }, () => ({
          x: Math.random() * B, y: -20 - Math.random() * H * 0.4, vx: (Math.random() - 0.5) * 120, vy: 120 + Math.random() * 220,
          k: kleuren[Math.floor(Math.random() * kleuren.length)], h: Math.random() * 6, m: 5 + Math.random() * 6,
        }));
      }
    }
    for (const [grens, tekst] of [[25, 'Stempel verdiend: Jogo bonito!'], [50, 'Vijftig! De gouden stempel is van jou.']]) {
      if (score === grens) {
        if ((staat().jogo ?? 0) < grens) {
          wijzig({ jogo: grens });
          document.dispatchEvent(new Event('staatgewijzigd'));
        }
        meld(tekst);
      }
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
    score++;
    scoreEl.textContent = score;
    mijlpaal();
  }

  function lus(nu) {
    const dt = Math.min(0.033, (nu - vorige) / 1000);
    vorige = nu;
    bal.vy += zwaarte * dt;
    bal.x += bal.vx * dt;
    bal.y += bal.vy * dt;
    bal.draai += (bal.vx / bal.r) * dt;
    if (bal.x < bal.r) { bal.x = bal.r; bal.vx = Math.abs(bal.vx) * 0.8; }
    if (bal.x > B - bal.r) { bal.x = B - bal.r; bal.vx = -Math.abs(bal.vx) * 0.8; }
    if (bal.y < bal.r) { bal.y = bal.r; bal.vy = Math.abs(bal.vy) * 0.4; }
    for (const c of confetti) { c.x += c.vx * dt; c.y += c.vy * dt; c.h += dt * 6; }
    confetti = confetti.filter((c) => c.y < H + 20);
    if (bal.y >= H - bal.r - 8) {
      bal.y = H - bal.r - 8;
      teken();
      return af();
    }
    teken();
    frame = requestAnimationFrame(lus);
  }

  function teken() {
    ctx.clearRect(0, 0, B, H);
    // grond en schaduw
    ctx.fillStyle = 'rgba(26,34,51,.14)';
    ctx.fillRect(0, H - 8, B, 8);
    const hoogte = Math.max(0, Math.min(1, (H - bal.y) / H));
    ctx.beginPath();
    ctx.ellipse(bal.x, H - 8, bal.r * (1.1 - hoogte * 0.6), 6, 0, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(26,34,51,${0.3 - hoogte * 0.2})`;
    ctx.fill();
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
    ctx.strokeStyle = '#1A2233';
    ctx.stroke();
    ctx.fillStyle = '#1A2233';
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
      ctx.fillStyle = '#1A2233';
      ctx.font = `600 18px Inter, system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('Tik op de bal om te beginnen', B / 2, bal.y + bal.r + 44);
    }
  }

  function af() {
    fase = 'af';
    const oud = record();
    const nieuwRecord = score > oud;
    if (nieuwRecord) wijzig({ hooghoud: { ...staat().hooghoud, [sleutel]: score } });
    el.querySelector('#spel-record').textContent = record();
    const naam = staat().naam || 'Ik';
    eindeEl.innerHTML = `
      <p class="hand">${nieuwRecord && score > 0 ? 'nieuw record!' : score === 0 ? 'oeps' : 'bal op de grond'}</p>
      <p class="spel-eindscore"><b>${score}</b> keer hooggehouden</p>
      <div class="acties">
        <button type="button" class="knop primair" id="spel-opnieuw">Nog een keer</button>
        <button type="button" class="knop" id="spel-deel"${score ? '' : ' disabled'}>Deel je score</button>
      </div>`;
    eindeEl.hidden = false;
    eindeEl.querySelector('#spel-opnieuw').addEventListener('click', opnieuw);
    eindeEl.querySelector('#spel-deel').addEventListener('click', () => kopieer(`${naam} hield ${score} keer hoog in ${plek}`, 'Score gekopieerd: plak hem in de groepsapp'));
    eindeEl.querySelector('#spel-opnieuw').focus({ preventScroll: true });
  }

  function sluit() {
    cancelAnimationFrame(frame);
    clearTimeout(meldTimer);
    removeEventListener('resize', opnieuw);
    el.hidden = true;
    el.innerHTML = '';
    stop = null;
  }

  canvas.addEventListener('pointerdown', tik);
  el.querySelector('#spel-sluit').addEventListener('click', sluit);
  addEventListener('resize', opnieuw);
  stop = sluit;
  opnieuw();
  el.querySelector('#spel-sluit').focus({ preventScroll: true });
}

export const stopSpel = () => stop?.();
