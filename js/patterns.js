// Herhalende landpatronen als SVG-tegel, gekozen op trefwoorden uit meta.landen[land].patroon.
// Eén patroon per land, getekend in één lijnkleur, bedoeld om met lage dekking achter tekst te liggen.

const TEGELS = [
  [/azulejo/i, (k) => `<g fill="none" stroke="${k}" stroke-width="2"><rect x="1" y="1" width="58" height="58"/><circle cx="30" cy="30" r="7"/><circle cx="0" cy="0" r="12"/><circle cx="60" cy="0" r="12"/><circle cx="0" cy="60" r="12"/><circle cx="60" cy="60" r="12"/></g><g fill="${k}"><path d="M30 8q7 12 0 20-7-8 0-20zM30 52q7-12 0-20-7 8 0 20zM8 30q12-7 20 0-8 7-20 0zM52 30q-12-7-20 0 8 7 20 0z"/></g>`],
  [/weef/i, (k) => `<g fill="none" stroke="${k}" stroke-width="2.5" stroke-linejoin="miter"><path d="M0 15l15-15 15 15 15-15 15 15M0 45l15-15 15 15 15-15 15 15M0 75l15-15 15 15 15-15 15 15"/></g><g fill="${k}"><path d="M15 26l5 5-5 5-5-5zM45 26l5 5-5 5-5-5zM30 54l4 4-4 4-4-4zM0 54l4 4-4 4-4-4zM60 54l4 4-4 4-4-4z"/></g>`],
  [/ster/i, (k) => `<g fill="none" stroke="${k}" stroke-width="2"><rect x="17" y="17" width="26" height="26"/><rect x="17" y="17" width="26" height="26" transform="rotate(45 30 30)"/><circle cx="30" cy="30" r="5"/><path d="M0 0l8 8M60 0l-8 8M0 60l8-8M60 60l-8-8"/></g><g fill="${k}"><path d="M0 26l4 4-4 4zM60 26l-4 4 4 4zM26 0l4 4 4-4zM26 60l4-4 4 4z"/></g>`],
  [/dambord/i, (k) => `<g fill="${k}"><rect width="30" height="30"/><rect x="30" y="30" width="30" height="30"/></g>`],
  [/bloem|iznik/i, (k) => `<g fill="none" stroke="${k}" stroke-width="2" stroke-linecap="round"><path d="M30 58V34M30 46c-8 0-12-4-14-10M30 50c8 0 12-4 14-10"/><path d="M30 34c-9-4-10-16 0-26 10 10 9 22 0 26z"/><path d="M30 34c-3-6-3-14 0-20 3 6 3 14 0 20z"/><circle cx="6" cy="8" r="3"/><circle cx="54" cy="8" r="3"/></g>`],
  [/streep|strepen|luzzu/i, (k) => `<g fill="none" stroke="${k}" stroke-linecap="round"><path d="M0 12q15-8 30 0t30 0" stroke-width="5"/><path d="M0 30q15-8 30 0t30 0" stroke-width="2.5"/><path d="M0 46q15-8 30 0t30 0" stroke-width="5"/></g><g fill="none" stroke="${k}" stroke-width="2"><path d="M20 30q10-9 20 0-10 9-20 0z"/></g><circle cx="30" cy="30" r="2.5" fill="${k}"/>`],
  [/meander/i, (k) => `<g fill="none" stroke="${k}" stroke-width="3" stroke-linejoin="miter"><path d="M0 44h48V14H12v20h24V24H24M48 44h12M0 54h60M0 4h60"/></g>`],
  [/majolica|citroen/i, (k) => `<g fill="none" stroke="${k}" stroke-width="2" stroke-linejoin="round"><path d="M30 2l28 28-28 28L2 30z"/><path d="M20 32c0-7 6-11 12-11 3 0 4-2 7-1 1 2-1 4-1 7 0 6-5 12-12 12-3 0-5 2-7 0-1-2 1-4 1-7z"/><path d="M36 21c0-4 3-6 7-6 0 4-2 7-7 6z"/></g><g fill="${k}"><circle cx="0" cy="0" r="4"/><circle cx="60" cy="0" r="4"/><circle cx="0" cy="60" r="4"/><circle cx="60" cy="60" r="4"/></g>`],
];
const STIPPEN = (k) => `<g fill="${k}"><circle cx="15" cy="15" r="3"/><circle cx="45" cy="45" r="3"/></g>`;

// Geeft een CSS-waarde voor background-image terug.
export function patroon(beschrijving, kleur) {
  const tegel = (TEGELS.find(([trefwoord]) => trefwoord.test(beschrijving ?? '')) ?? [null, STIPPEN])[1];
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">${tegel(kleur)}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}
