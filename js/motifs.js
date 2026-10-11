// Eigen lijntekeningen (48 x 48) voor de stempels en de kop van een bestemming.
// Gezocht op de naam uit de JSON; een motief zonder tekening wordt overgeslagen.

const stip = (x, y, r = 1.2) => `<circle cx="${x}" cy="${y}" r="${r}" fill="currentColor" stroke="none"/>`;

const TEKENING = {
  vuurtoren: `<path d="M18 42l3-25h6l3 25zM21 17v-6h6v6M19 11h10M24 11V6M20.5 26h7M19.7 34h8.6M6 42h36M14 9L9 7M34 9l5-2M13 14H8M35 14h5"/>`,
  flamingo: `<ellipse cx="27" cy="23" rx="9" ry="6"/><path d="M19 21c-7-3-7-14 0-14 4 0 5 4 2 5M21 9l5 2-5 1M27 29v13M27 35l-5 4v3M6 42h36M36 23l5 2"/>${stip(18.5, 9, 0.9)}`,
  paleis: `<path d="M6 42V26h9v-9h7v9h7V13h7v29zM29 13l3.5-7 3.5 7M15 17l3.5-5 3.5 5M17 42v-7a3 3 0 0 1 6 0v7M9 30v4M31 19v4M31 29v4M4 42h40"/>`,
  druiventros: `<circle cx="17" cy="23" r="4.2"/><circle cx="25" cy="23" r="4.2"/><circle cx="33" cy="23" r="4.2"/><circle cx="21" cy="30.5" r="4.2"/><circle cx="29" cy="30.5" r="4.2"/><circle cx="25" cy="38" r="4.2"/><path d="M25 19V8M25 12c4-6 10-5 13-2-3 4-9 5-13 2z"/>`,
  bunker: `<path d="M7 38c0-18 34-18 34 0zM17 31h14M3 38h42M10 42h6M22 43h8M34 42h5"/>`,
  amfitheater: `<path d="M4 37a20 15 0 0 1 40 0M10 37a14 10 0 0 1 28 0M16 37a8 5.5 0 0 1 16 0M3 37h42M24 22v-4M13 26l-2-3M35 26l2-3M7 41h34"/>`,
  bergen: `<path d="M3 40l14-25 7 12 6-15 15 28zM13 22l4 3 3.5-3M26.5 19l3.5 2.5 3-2.5"/><circle cx="39" cy="10" r="3"/>`,
  padelracket: `<ellipse cx="21" cy="18" rx="11" ry="13" transform="rotate(-30 21 18)"/><path d="M28 29l10 13"/>${stip(17, 14)}${stip(23, 14)}${stip(20, 20)}${stip(26, 20)}${stip(15, 20)}<circle cx="39" cy="11" r="3.5"/>`,
  zuilen: `<path d="M7 13L24 4l17 9zM7 13h34M9 17h30M6 42h36M9 38h30M12 17v21M17 17v21M22 17v21M26 17v21M31 17v21M36 17v21"/>`,
  rotsgraf: `<path d="M5 43V15l9-8 9 3 10-4 10 9v28M15 41V26h18v15M13 26l11-8 11 8zM21 41V30M27 41V30"/>`,
  'luzzu-boot': `<path d="M6 25h36c-2 9-8 13-18 13S8 34 6 25zM42 25l3-9M6 25l-3-9M9 30h30M3 43c4-2 6-2 9 0s6 2 9 0 6-2 9 0 6 2 9 0 4-1 6 0"/><circle cx="35" cy="29.5" r="1.8"/>`,
  zeeschildpad: `<ellipse cx="24" cy="25" rx="10" ry="12"/><circle cx="24" cy="9.5" r="3.5"/><path d="M15 18L6 12l5 11M33 18l9-6-5 11M17 34l-5 7M31 34l5 7M24 17l5 4v8l-5 4-5-4v-8zM24 13v4M24 33v4"/>`,
  citroen: `<path d="M9 27c0-9 8-15 16-15 4 0 6-2 9-1 2 3-1 5-1 9 0 9-6 17-15 17-5 0-7 2-9 0-2-3 0-6 0-10zM30 12c0-5 4-8 9-8 0 5-3 9-9 8z"/>${stip(17, 27)}${stip(23, 22)}${stip(24, 30)}`,
  sardine: `<path d="M5 24c7-9 21-9 29 0-8 9-22 9-29 0zM34 24l9-7v14zM14 19c2 3 2 7 0 10M21 21v6M26 22v4"/>${stip(10, 23)}`,
  sardinespit: `<path d="M5 24c7-9 21-9 29 0-8 9-22 9-29 0zM34 24l9-7v14zM2 40L46 8M14 19c2 3 2 7 0 10"/>${stip(10, 23)}`,
  zeilboot: `<path d="M6 34h36l-6 8H12zM24 4v30M24 8l13 20H24M20 14l-9 14h9"/>`,
  olijftak: `<path d="M6 40C16 30 28 20 42 8M14 33c-6-1-8-5-7-9 5 0 8 4 7 9zM22 26c-6-2-7-6-5-10 5 1 7 5 5 10zM30 19c-5-3-5-7-3-11 5 2 6 7 3 11zM20 28c4 4 9 4 12 1-3-4-8-4-12-1zM28 22c4 3 9 3 12-1-4-3-9-3-12 1z"/><ellipse cx="13" cy="40" rx="3" ry="4"/>`,
  theeglas: `<path d="M17 8h14c-1 6-4 8-4 12s5 7 5 13c0 5-4 7-8 7s-8-2-8-7c0-6 5-9 5-13s-3-6-4-12zM16 22h16M10 42h28"/>`,
  bal: `<circle cx="24" cy="24" r="17"/><path d="M24 16l7.5 5.5-3 8.8h-9l-3-8.8zM24 16V7M31.5 21.5l8.5-3M28.5 30.3l5.5 7.5M19.5 30.3L14 37.8M16.5 21.5L8 18.5"/>`,
  burcht: `<path d="M3 43c9-13 33-13 42 0M12 35V19h4v-4h4v4h8v-4h4v4h4v16M20 35v-6a4 4 0 0 1 8 0v6M16 23v3M32 23v3M24 15V8l5 2-5 2"/>`,
  pelikaan: `<ellipse cx="21" cy="29" rx="12" ry="7"/><path d="M30 25c3-7 0-14 6-15 4 0 5 4 3 7M36 12l10 3-10 6c-3-2-3-6 0-9zM9 29l-6 4M18 36v6M25 36v6M15 42h13M14 27c4-3 9-3 13 0"/>${stip(35, 13, 0.9)}`,
  tegel: `<rect x="8" y="8" width="32" height="32"/><path d="M24 12q6 7 0 12-6-5 0-12zM24 36q6-7 0-12-6 5 0 12zM12 24q7-6 12 0-5 6-12 0zM36 24q-7-6-12 0 5 6 12 0z"/>`,
  baai: `<path d="M4 16c10-4 16 6 14 14s6 12 14 10 12-6 12-12M4 30c3-2 5-2 8 0M30 12c3-2 5-2 8 0M34 20c3-2 5-2 8 0"/><circle cx="12" cy="9" r="3"/>`,
  megaliet: `<path d="M8 42V18h7v24M33 42V18h7v24M5 18h38v-6H5zM3 42h42M20 42V30h8v12"/>`,
  paraglider: `<path d="M6 16c4-10 32-10 36 0-6-3-30-3-36 0zM8 16l14 18M40 16L26 34M24 15v17"/><circle cx="24" cy="36" r="3"/><path d="M24 39v5"/>`,
};

export const heeftMotief = (naam) => naam in TEKENING;

export function motiefTekening(naam) {
  return TEKENING[naam] ?? '';
}

export function motief(naam, klasse = '') {
  if (!heeftMotief(naam)) return '';
  return `<svg class="motief ${klasse}" viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${TEKENING[naam]}</svg>`;
}
