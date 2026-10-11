// De ansichtkaart: je naam, je drie favorieten met hun stempels en een groet, getekend op een canvas.

import { meta, optie, land, landNaam, kosten, euro } from './data.js';
import { staat } from './store.js';
import { poppetje } from './avatar.js';
import { stempel, kanteling } from './stamps.js';
import { t } from './i18n.js';

const B = 1200;
const H = 800;

const INKTFILTER = '<filter id="inkt" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" result="grof"/><feDisplacementMap in="SourceGraphic" in2="grof" scale="3.5"/></filter>';

function alsBeeld(svg, extra = '') {
  const los = svg.replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" `).replace(/(<svg[^>]*>)/, `$1${extra}`);
  return new Promise((klaar) => {
    const beeld = new Image();
    beeld.onload = () => klaar(beeld);
    beeld.onerror = () => klaar(null);
    beeld.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(los)}`;
  });
}

function regelAf(ctx, tekst, x, y, breedte, hoogte, maxRegels = 2) {
  const woorden = tekst.split(' ');
  let regel = '';
  let n = 0;
  for (const woord of woorden) {
    const proef = regel ? `${regel} ${woord}` : woord;
    if (ctx.measureText(proef).width > breedte && regel) {
      ctx.fillText(regel, x, y + n * hoogte);
      regel = woord;
      if (++n >= maxRegels) return n;
    } else regel = proef;
  }
  ctx.fillText(regel, x, y + n * hoogte);
  return n + 1;
}

export async function tekenAnsichtkaart(canvas) {
  const s = staat();
  const top = s.top3.map(optie).filter(Boolean);
  const eerste = top[0];
  const k = eerste ? land(eerste).kleuren : { basis: '#12305A', licht: '#FBF6EA', accent: '#E3A72F' };
  canvas.width = B;
  canvas.height = H;
  const ctx = canvas.getContext('2d');
  try {
    await Promise.all(['700 80px Fraunces', '600 48px Caveat', '600 28px Inter', '700 26px "JetBrains Mono"'].map((f) => document.fonts.load(f)));
  } catch {
    // zonder webfonts tekent de kaart in een systeemletter
  }

  // luchtpostrand
  ctx.fillStyle = '#FBF6EA';
  ctx.fillRect(0, 0, B, H);
  const rand = 26;
  for (let i = -H; i < B + H; i += 56) {
    for (const [verschuiving, kleur] of [[0, '#C8202F'], [28, '#1F4E9C']]) {
      ctx.fillStyle = kleur;
      ctx.beginPath();
      ctx.moveTo(i + verschuiving, 0);
      ctx.lineTo(i + verschuiving + 14, 0);
      ctx.lineTo(i + verschuiving + 14 - H, H);
      ctx.lineTo(i + verschuiving - H, H);
      ctx.fill();
    }
  }
  ctx.fillStyle = '#FBF6EA';
  ctx.fillRect(rand, rand, B - 2 * rand, H - 2 * rand);

  // linkerhelft: de groet
  ctx.fillStyle = k.basis;
  ctx.fillRect(rand + 24, rand + 24, 10, H - 2 * rand - 48);
  ctx.fillStyle = '#1A2233';
  ctx.textBaseline = 'alphabetic';
  ctx.font = '600 54px Caveat, cursive';
  ctx.fillText(eerste ? t('Mijn stem gaat naar', 'My vote goes to') : t('Ik ben er nog niet uit', "I haven't decided yet"), 96, 130);
  ctx.font = '700 76px Fraunces, Georgia, serif';
  ctx.fillStyle = k.basis;
  const regelsTitel = eerste ? regelAf(ctx, eerste.naam, 96, 220, 520, 80) : 0;
  let y = 240 + regelsTitel * 80;
  ctx.font = '600 30px Inter, system-ui, sans-serif';
  top.forEach((o, i) => {
    ctx.fillStyle = '#1A2233';
    ctx.fillText(`${i + 1}. ${o.naam}`, 96, y);
    ctx.fillStyle = '#566074';
    ctx.font = '400 24px Inter, system-ui, sans-serif';
    ctx.fillText(t(`${landNaam(o.land)} · ca. ${euro(kosten(o, o.huizen[0]).totaal)} p.p.`, `${landNaam(o.land)} · approx. ${euro(kosten(o, o.huizen[0]).totaal)} p.p.`), 132, y + 32);
    ctx.font = '600 30px Inter, system-ui, sans-serif';
    y += 84;
  });
  ctx.font = '600 46px Caveat, cursive';
  ctx.fillStyle = '#1A2233';
  ctx.fillText(t(`Groetjes, ${s.naam || 'een van ons'}`, `Cheers, ${s.naam || 'one of us'}`), 96, H - 120);
  const beste = Math.max(0, ...Object.values(s.hooghoud ?? {}));
  ctx.font = '700 18px "JetBrains Mono", monospace';
  ctx.fillStyle = '#566074';
  ctx.fillText(String(meta().reisdata).toUpperCase().slice(0, 46), 96, H - 84);
  if (beste) ctx.fillText(t(`RECORD HOOGHOUDEN: ${beste}`, `KEEPY-UPPIES BEST: ${beste}`), 96, H - 58);

  // scheidslijn en adresregels
  ctx.strokeStyle = '#C9BBA0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(660, 90);
  ctx.lineTo(660, H - 90);
  ctx.stroke();

  // rechterhelft: postzegel met poppetje en de stempels
  const zegel = { x: 950, y: 80, b: 170, h: 200 };
  ctx.fillStyle = '#fff';
  ctx.fillRect(zegel.x, zegel.y, zegel.b, zegel.h);
  ctx.fillStyle = k.licht;
  ctx.fillRect(zegel.x + 12, zegel.y + 12, zegel.b - 24, zegel.h - 24);
  ctx.fillStyle = '#FBF6EA';
  for (let i = 0; i <= zegel.b; i += 17) {
    for (const yy of [zegel.y, zegel.y + zegel.h]) { ctx.beginPath(); ctx.arc(zegel.x + i, yy, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  for (let i = 0; i <= zegel.h; i += 17) {
    for (const xx of [zegel.x, zegel.x + zegel.b]) { ctx.beginPath(); ctx.arc(xx, zegel.y + i, 5, 0, Math.PI * 2); ctx.fill(); }
  }
  const pop = await alsBeeld(poppetje(s.avatar ?? {}));
  if (pop) ctx.drawImage(pop, zegel.x + 22, zegel.y + 28, zegel.b - 44, (zegel.b - 44) * 1.12);

  const plekken = [[700, 300, 250], [900, 330, 230], [770, 500, 240]];
  for (const [i, o] of top.entries()) {
    const beeld = await alsBeeld(stempel(o.stempel), INKTFILTER);
    if (!beeld) continue;
    const [x, yy, m] = plekken[i];
    ctx.save();
    ctx.translate(x + m / 2, yy + m / 2);
    ctx.rotate((kanteling(o.id) * Math.PI) / 180);
    ctx.globalAlpha = 0.92;
    ctx.drawImage(beeld, -m / 2, -m / 2, m, m);
    ctx.restore();
  }
  if (!top.length) {
    ctx.font = '600 44px Caveat, cursive';
    ctx.fillStyle = '#566074';
    ctx.fillText(t('kies eerst je top 3', 'pick your top 3 first'), 720, 460);
  }
}

export function kaartNaam() {
  return `vakantie-top3-${(staat().naam || 'ik').toLowerCase().replace(/[^a-z0-9]+/g, '-')}.png`;
}
