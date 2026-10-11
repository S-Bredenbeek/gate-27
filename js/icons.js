// Zelfgetekende lijniconen (24 x 24). Categorie-iconen worden gezocht op het id uit de JSON;
// een categorie zonder eigen tekening krijgt het standaardicoon.

const S = '<circle cx="{x}" cy="{y}" r=".7" fill="currentColor" stroke="none"/>';
const stip = (x, y) => S.replace('{x}', x).replace('{y}', y);

const TEKENING = {
  // categorieën
  strand: '<path d="M3 13a9 9 0 0 1 18 0z"/><path d="M12 4V2.5M12 13v5.5"/><path d="M3 21c1.5-1.2 3-1.2 4.5 0s3 1.2 4.5 0 3-1.2 4.5 0 3 1.2 4.5 0"/>',
  restaurants: '<path d="M5 3v6a3 3 0 0 0 6 0V3M8 3v18"/><path d="M18 21v-8h-3c0-5 1-8 3-10z"/>',
  uitgaan: `<path d="M4 5h16l-8 9z"/><path d="M12 14v6M8 20h8M15.5 5l2-3"/>${stip(10, 8)}`,
  wijn: '<path d="M8 3h8v5a4 4 0 0 1-8 0z"/><path d="M8 7.5h8M12 12v8M8.5 20h7"/>',
  boot: '<path d="M3 17h18l-3 4H6z"/><path d="M12 2v15M12 4l6.5 10H12M10 7l-4.5 7H10"/>',
  natuur: '<path d="M2 20l6.5-11 4 6.5 2.5-4L22 20z"/><circle cx="17" cy="5.5" r="2"/>',
  stad: '<path d="M3 21h18M5 21V10l4-2v13M9 21V4h7v17M16 21v-9h3v9"/><path d="M11.5 8h2M11.5 12h2M11.5 16h2"/>',
  padel: `<ellipse cx="10" cy="9" rx="5.5" ry="6.5" transform="rotate(-35 10 9)"/><path d="M13.6 14.6l5.4 6.4"/>${stip(8.3, 7.5)}${stip(11.3, 7.8)}${stip(9.8, 10.6)}<circle cx="19" cy="5" r="1.6"/>`,
  watersport: '<path d="M2 17c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 21c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M11 13V3l7 9z"/>',
  kids: `<circle cx="12" cy="13.5" r="6.5"/><circle cx="6.5" cy="6.8" r="2.5"/><circle cx="17.5" cy="6.8" r="2.5"/>${stip(9.7, 12.5)}${stip(14.3, 12.5)}<path d="M10.5 16c1 .8 2 .8 3 0"/>`,
  hooghouden: '<circle cx="12" cy="12" r="9"/><path d="M12 8l3.8 2.8-1.5 4.4H9.7l-1.5-4.4z"/><path d="M12 8V3.2M15.8 10.8l4.6-1.5M14.3 15.2l2.8 3.9M9.7 15.2l-2.8 3.9M8.2 10.8L3.6 9.3"/>',
  standaard: '<circle cx="12" cy="12" r="8"/><path d="M12 8v4l2.5 2.5"/>',

  // interface
  koffer: '<rect x="4" y="7" width="16" height="13" rx="2"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M9 11v5M15 11v5"/>',
  hart: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  terug: '<path d="M15 5l-7 7 7 7"/>',
  verder: '<path d="M9 5l7 7-7 7"/>',
  vliegtuig: '<path d="M12 2c1 0 1.6 1.2 1.6 3v4.2l7.4 4.6v2l-7.4-2.3v4l2.2 1.7V21L12 20l-3.8 1v-1.8l2.2-1.7v-4L3 15.8v-2l7.4-4.6V5c0-1.8.6-3 1.6-3z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  kruis: '<path d="M6 6l12 12M18 6L6 18"/>',
  vraag: `<path d="M9 9a3 3 0 1 1 4.5 2.6c-.9.5-1.5 1.2-1.5 2.4"/>${stip(12, 18)}`,
  beperkt: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  bed: '<path d="M3 18V7M3 11h14a4 4 0 0 1 4 4v3M3 15h18M7 11V9h4v2"/>',
  personen: '<circle cx="9" cy="8" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.3"/><path d="M16 14.2c2.8.2 5 2.6 5 5.8"/>',
  ster: '<path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.8z"/>',
  zwembad: '<path d="M2 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/><path d="M8 15V6a2 2 0 0 1 4 0M14 15V6a2 2 0 0 1 4 0M8 9h6M8 12.5h6"/>',
  extern: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  kopieer: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  op: '<path d="M6 15l6-6 6 6"/>',
  neer: '<path d="M6 9l6 6 6-6"/>',
  klok: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  auto: `<path d="M3 16v-3l2-5h14l2 5v3zM5 16v2.5M19 16v2.5M4 11h16"/>${stip(7, 13.5)}${stip(17, 13.5)}`,
  zon: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8"/>',
  golf: '<path d="M2 9c2-2 4-2 6 0s4 2 6 0 4-2 6 0M2 15c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/>',
  regen: '<path d="M7 15a4 4 0 0 1 .5-8 5 5 0 0 1 9.6 1.2A3.5 3.5 0 0 1 17 15z"/><path d="M9 18l-1 2.5M13 18l-1 2.5M17 18l-1 2.5"/>',
  bier: '<path d="M6 8h10v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2z"/><path d="M16 10h2a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2M6 8a2.5 2.5 0 0 1 1-4.5 3 3 0 0 1 5.5-.5A2.5 2.5 0 0 1 16 5.5V8"/>',
  huis: '<path d="M3 11.5L12 4l9 7.5M5.5 10v10h13V10M10 20v-6h4v6"/>',
  weging: '<path d="M4 7h10M18 7h2M4 17h2M10 17h10"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="17" r="2"/>',
  bord: '<rect x="3" y="4" width="18" height="13" rx="1.5"/><path d="M7 8.5h6M7 12.5h10M9 21l1-4M15 21l-1-4"/>',
};

export function icoon(naam, klasse = '') {
  const tekening = TEKENING[naam] ?? TEKENING.standaard;
  return `<svg class="ico ${klasse}" viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${tekening}</svg>`;
}
