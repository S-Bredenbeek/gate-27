// Het vertrekbord met splitflap: elk teken zit in een eigen klepje dat een paar keer doorklapt
// voordat het op de juiste letter stilvalt.

import { esc } from './data.js';

const TEKENS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const willekeurig = () => TEKENS[Math.floor(Math.random() * TEKENS.length)];

// Breekt een naam op woordgrenzen in regels die op het bord passen.
export function regels(tekst, breedte) {
  const uit = [''];
  for (const woord of String(tekst).toUpperCase().split(/\s+/)) {
    const proef = `${uit[uit.length - 1]} ${woord}`.trim();
    if (proef.length <= breedte) uit[uit.length - 1] = proef;
    else uit.push(woord.slice(0, breedte));
  }
  return uit;
}

export function flaps(tekst, lengte) {
  const tekens = [...String(tekst).toUpperCase().padEnd(lengte)].slice(0, lengte);
  return `<span class="flaps" aria-hidden="true">${tekens.map((t) => `<span class="flap" data-t="${esc(t)}">${t === ' ' ? '&nbsp;' : esc(t)}</span>`).join('')}</span>`;
}

let timer;
export function draai(wortel) {
  clearInterval(timer);
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const kleppen = [...wortel.querySelectorAll('.flap')].filter((k) => k.dataset.t !== ' ');
  kleppen.forEach((klep, i) => {
    klep.beurten = 3 + (i % 9) + Math.floor(Math.random() * 6);
    klep.textContent = willekeurig();
  });
  timer = setInterval(() => {
    let bezig = false;
    for (const klep of kleppen) {
      if (!klep.beurten) continue;
      klep.beurten--;
      klep.textContent = klep.beurten ? willekeurig() : klep.dataset.t;
      klep.classList.toggle('klapt', klep.beurten % 2 === 1);
      bezig = true;
    }
    if (!bezig) clearInterval(timer);
  }, 60);
}
