// Eén vliegtuig, twee aanzichten. Romp, buik, staart, motoren en sierstreep krijgen de kleuren
// van meta.carriers; geen logo's of namen op het toestel.

const ROMP = '#FFFFFF';
const LIJN = '#1A2233';
const VLEUGEL = '#E3E8EE';

function kleuren(c = {}) {
  const romp = c.romp ?? ROMP;
  return { romp, buik: c.buik ?? romp, staart: c.staart ?? romp, motor: c.motor ?? LIJN, streep: c.streep ?? LIJN };
}

// Bovenaanzicht voor op de kaart. De neus wijst omhoog; map.js draait het mee met de route.
export function toestelBoven(carrier) {
  const k = kleuren(carrier);
  return `<svg viewBox="0 0 48 48" width="52" height="52" aria-hidden="true">
    <g stroke="${LIJN}" stroke-width="1.3" stroke-linejoin="round">
      <path d="M24 17L45 30v4L24 27.5 3 34v-4z" fill="${VLEUGEL}"/>
      <path d="M24 37l9 6.5V46l-9-2.5L15 46v-2.5z" fill="${k.staart}"/>
      <rect x="11.5" y="23" width="4.5" height="7" rx="2.2" fill="${k.motor}"/>
      <rect x="32" y="23" width="4.5" height="7" rx="2.2" fill="${k.motor}"/>
      <path d="M24 2c3 0 4.5 5 4.5 10.5V37c0 4-2.5 7.5-4.5 8.5-2-1-4.5-4.5-4.5-8.5V12.5C19.5 7 21 2 24 2z" fill="${k.romp}"/>
    </g>
    <path d="M24 11v27" stroke="${k.streep}" stroke-width="1.8" stroke-linecap="round"/>
    <path d="M21.3 8.5c1.7-1.3 3.7-1.3 5.4 0" fill="none" stroke="${LIJN}" stroke-width="1.6" stroke-linecap="round"/>
  </svg>`;
}

// Zijaanzicht voor de instapkaart, vliegend naar rechts.
export function toestelZij(carrier) {
  const k = kleuren(carrier);
  const ramen = Array.from({ length: 15 }, (_, i) => `<rect x="${58 + i * 9}" y="33" width="4" height="4.5" rx="1.2"/>`).join('');
  return `<svg class="toestel-zij" viewBox="0 0 244 84" aria-hidden="true" focusable="false">
    <g transform="translate(244 0) scale(-1 1)" stroke="${LIJN}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round">
      <path d="M198 32L221 4h13l-9 34z" fill="${k.staart}"/>
      <path d="M204 41h31l-7 8h-18z" fill="${k.staart}"/>
      <clipPath id="rompvorm"><path d="M14 45c0-9 24-17 56-17h130c18 0 33 7 37 11-5 7-22 15-41 15H58C34 54 14 51 14 45z"/></clipPath>
      <path d="M14 45c0-9 24-17 56-17h130c18 0 33 7 37 11-5 7-22 15-41 15H58C34 54 14 51 14 45z" fill="${k.romp}"/>
      <g clip-path="url(#rompvorm)" stroke="none">
        <rect x="0" y="45" width="244" height="14" fill="${k.buik}"/>
        <rect x="0" y="41.5" width="244" height="3.5" fill="${k.streep}"/>
      </g>
      <path d="M14 45c0-9 24-17 56-17h130c18 0 33 7 37 11-5 7-22 15-41 15H58C34 54 14 51 14 45z" fill="none"/>
      <path d="M24 37l11-5v6z" fill="${LIJN}"/>
      <g fill="${LIJN}" stroke="none" opacity=".75">${ramen}</g>
      <path d="M104 47h46l-26 27h-12z" fill="${VLEUGEL}"/>
      <rect x="98" y="56" width="26" height="11" rx="5.5" fill="${k.motor}"/>
    </g>
  </svg>`;
}
