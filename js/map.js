// De kaart: Leaflet met tegels van OpenStreetMap. Laadt Leaflet niet, dan werkt de rest van de site door.
// Bestemmingen die je nog niet hebt ontdekt staan niet als pin op de kaart: per land hangt er een wolk
// met een vraagteken, bewust een eind naast de echte plek.

import { meta, opties, landKleur, esc } from './data.js';
import { icoon } from './icons.js';
import { toestelBoven } from './plane.js';

let kaart = null;
let laagWolken;
let laagOpties;
let laagHuizen;
let laagVlucht;
let laagRit;
let huisPinnen = [];
let ritFrame;
let terug = {};

const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const hash = (s) => {
  let h = 7;
  for (const teken of s) h = (h * 31 + teken.codePointAt(0)) >>> 0;
  return h;
};

const pinHtml = (kleur) =>
  `<svg viewBox="0 0 30 38" width="30" height="38" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 24.5 15 37 15 37s14-12.5 14-22.2C29 7.2 22.7 1 15 1z" fill="${esc(kleur)}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14.5" r="5" fill="#fff"/></svg>`;

export function maakKaart({ opPin, opWolk }) {
  const el = document.getElementById('kaart');
  if (!window.L) {
    el.innerHTML = '<p class="kaart-fout">De kaart kon niet laden. De rest van de site werkt gewoon.</p>';
    return false;
  }
  terug = { opPin, opWolk };
  kaart = L.map(el, { zoomControl: false, zoomSnap: 0.25, minZoom: 3, maxZoom: 15 });
  kaart.setView([46, 8], 4);
  kaart.attributionControl.setPrefix(false);
  L.control.zoom({ position: 'topright', zoomInTitle: 'Inzoomen', zoomOutTitle: 'Uitzoomen' }).addTo(kaart);
  // CartoDB Voyager vraagt sinds kort een API-sleutel; de standaardtegels van OpenStreetMap werken zonder.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(kaart);

  laagWolken = L.layerGroup().addTo(kaart);
  laagVlucht = L.layerGroup().addTo(kaart);
  laagRit = L.layerGroup().addTo(kaart);
  laagHuizen = L.layerGroup().addTo(kaart);
  laagOpties = L.layerGroup().addTo(kaart);

  const v = meta().vertrek;
  L.marker([v.lat, v.lng], {
    icon: L.divIcon({ className: 'vertrekpin', html: `<span>${esc(v.code)}</span>`, iconSize: [46, 24], iconAnchor: [23, 12] }),
    interactive: false,
    keyboard: false,
  }).addTo(kaart);

  new ResizeObserver(() => kaart.invalidateSize({ pan: false })).observe(el);
  return true;
}

function pas(punten, { maxZoom = 9, animeer = true } = {}) {
  kaart.invalidateSize({ pan: false });
  const grenzen = L.latLngBounds(punten);
  const opties = { paddingTopLeft: [36, 44], paddingBottomRight: [36, 48], maxZoom };
  if (animeer && !rustig()) kaart.flyToBounds(grenzen, { ...opties, duration: 0.9 });
  else kaart.fitBounds(grenzen, { ...opties, animate: false });
}

function wis() {
  cancelAnimationFrame(ritFrame);
  for (const laag of [laagWolken, laagOpties, laagHuizen, laagVlucht, laagRit]) laag.clearLayers();
  huisPinnen = [];
}

// Ontdekte opties als pin, de rest als wolk per land. Met een actieve groep staat de rest op de achtergrond.
function tekenOverzicht(bezocht, actiefLand) {
  const wolken = new Map();
  for (const o of opties()) {
    const eigen = !actiefLand || o.land === actiefLand;
    if (bezocht.includes(o.id)) {
      const pin = L.marker([o.lat, o.lng], {
        icon: L.divIcon({ className: 'pin', html: pinHtml(landKleur(o)), iconSize: [30, 38], iconAnchor: [15, 37] }),
        title: o.naam,
        alt: `${o.naam}, ${o.land}`,
        opacity: eigen ? 1 : 0.35,
        riseOnHover: true,
      }).addTo(laagOpties);
      pin.bindTooltip(esc(o.naam), { direction: 'top', offset: [0, -34], className: 'pinlabel', permanent: !!actiefLand && eigen });
      pin.on('click', () => terug.opPin(o.id));
    } else {
      const sleutel = o.land;
      if (!wolken.has(sleutel)) wolken.set(sleutel, { o, lijst: [], eigen });
      wolken.get(sleutel).lijst.push(o);
    }
  }
  for (const [sleutel, { o, lijst, eigen }] of wolken) {
    const h = hash(sleutel);
    const lat = lijst.reduce((t, x) => t + x.lat, 0) / lijst.length + ((h % 100) / 100 - 0.5) * 0.9;
    const lng = lijst.reduce((t, x) => t + x.lng, 0) / lijst.length + (((h >>> 8) % 100) / 100 - 0.5) * 1.2;
    const kleur = landKleur(o);
    L.circle([lat, lng], { radius: 175000, color: kleur, weight: 1.5, dashArray: '4 6', fillColor: kleur, fillOpacity: eigen ? 0.2 : 0.07, opacity: eigen ? 0.8 : 0.3, interactive: false }).addTo(laagWolken);
    const wolk = L.marker([lat, lng], {
      icon: L.divIcon({ className: 'wolk', html: `<span style="--k:${esc(kleur)}">?${lijst.length > 1 ? `<i>${lijst.length}</i>` : ''}</span>`, iconSize: [44, 44], iconAnchor: [22, 22] }),
      title: `${lijst.length === 1 ? 'Een geheime bestemming' : `${lijst.length} geheime bestemmingen`} in ${o.land}`,
      alt: `Geheime bestemming in ${o.land}`,
      opacity: eigen ? 1 : 0.45,
    }).addTo(laagWolken);
    wolk.on('click', () => terug.opWolk(o.land));
  }
}

export function toonHal(bezocht) {
  if (!kaart) return;
  wis();
  tekenOverzicht(bezocht, null);
  const v = meta().vertrek;
  pas([[v.lat, v.lng], ...opties().map((o) => [o.lat, o.lng])], { maxZoom: 5 });
}

export function toonGate(landNaam, bezocht) {
  if (!kaart) return;
  wis();
  tekenOverzicht(bezocht, landNaam);
  const punten = opties().filter((o) => o.land === landNaam).map((o) => [o.lat, o.lng]);
  if (!punten.length) return;
  // wat lucht rond de groep, zodat de wolken helemaal in beeld zijn
  const g = L.latLngBounds(punten);
  pas([[g.getSouth() - 1.6, g.getWest() - 2], [g.getNorth() + 1.6, g.getEast() + 2]], { maxZoom: 6.5 });
}

export function toonBestemming(o, gekozen, opHuis, animeer = true) {
  if (!kaart) return;
  wis();
  const kleur = landKleur(o);
  const lh = o.luchthaven;
  L.marker([lh.lat, lh.lng], {
    icon: L.divIcon({ className: 'luchthavenpin', html: `${icoon('vliegtuig')}<span>${esc(lh.code)}</span>`, iconSize: [62, 26], iconAnchor: [31, 13] }),
    interactive: false,
    keyboard: false,
  }).addTo(laagHuizen);
  o.huizen.forEach((h, i) => {
    const pin = L.marker([h.lat, h.lng], {
      icon: L.divIcon({ className: 'huispin', html: `<span style="--k:${esc(kleur)}">${i + 1}</span>`, iconSize: [34, 34], iconAnchor: [17, 17] }),
      title: h.naam,
      alt: `Huis ${i + 1}: ${h.naam}`,
    }).addTo(laagHuizen);
    pin.bindTooltip(esc(h.naam), { direction: 'top', offset: [0, -16], className: 'pinlabel' });
    pin.on('click', () => opHuis(i));
    huisPinnen.push(pin);
  });
  markeerHuis(gekozen);
  pas([[lh.lat, lh.lng], ...o.huizen.map((h) => [h.lat, h.lng])], { maxZoom: 11, animeer });
}

export function markeerHuis(index) {
  huisPinnen.forEach((pin, i) => {
    pin.getElement()?.classList.toggle('gekozen', i === index);
    pin.setZIndexOffset(i === index ? 500 : 0);
  });
}

// Het autootje rijdt van de luchthaven naar het aangetikte huis en laat de reistijd zien.
export function rij(o, index) {
  if (!kaart) return;
  cancelAnimationFrame(ritFrame);
  laagRit.clearLayers();
  const h = o.huizen[index];
  const a = [o.luchthaven.lat, o.luchthaven.lng];
  const b = [h.lat, h.lng];
  const ruim = L.latLngBounds([a, b]).pad(0.35);
  pas([ruim.getSouthWest(), ruim.getNorthEast()], { maxZoom: 11, animeer: false });
  L.polyline([a, b], { color: '#1A2233', weight: 3, opacity: 0.55, dashArray: '2 8', lineCap: 'round', interactive: false }).addTo(laagRit);
  const auto = L.marker(a, {
    icon: L.divIcon({ className: 'autootje', html: `<span style="--k:${esc(landKleur(o))}">${icoon('auto')}</span>`, iconSize: [40, 40], iconAnchor: [20, 20] }),
    interactive: false,
    keyboard: false,
    zIndexOffset: 900,
  }).addTo(laagRit);
  const klaar = () => {
    auto.setLatLng(b);
    auto.bindTooltip(esc(o.transfer), { direction: 'bottom', offset: [0, 18], className: 'pinlabel ritlabel', permanent: true }).openTooltip();
  };
  if (rustig()) return klaar();
  const DUUR = 1800;
  let start;
  const stap = (nu) => {
    start ??= nu;
    const p = Math.min(1, (nu - start) / DUUR);
    const e = p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2;
    auto.setLatLng([a[0] + (b[0] - a[0]) * e, a[1] + (b[1] - a[1]) * e]);
    if (p < 1) ritFrame = requestAnimationFrame(stap);
    else klaar();
  };
  ritFrame = requestAnimationFrame(stap);
}

// Gebogen route: een kwadratische bezier met het stuurpunt haaks op de rechte lijn.
function boog(a, b, stappen = 72) {
  const dx = b[1] - a[1];
  const dy = b[0] - a[0];
  const kant = dx < 0 ? -1 : 1; // altijd met de bolling naar het noorden
  const stuur = [(a[0] + b[0]) / 2 + kant * dx * 0.16, (a[1] + b[1]) / 2 - kant * dy * 0.16];
  const punten = [];
  for (let i = 0; i <= stappen; i++) {
    const t = i / stappen;
    const u = 1 - t;
    punten.push([u * u * a[0] + 2 * u * t * stuur[0] + t * t * b[0], u * u * a[1] + 2 * u * t * stuur[1] + t * t * b[1]]);
  }
  return punten;
}

// Vliegt van het vertrekpunt naar de luchthaven van de optie. Geeft een functie terug om over te slaan.
export function vlieg(o, klaar) {
  if (!kaart || rustig()) {
    klaar();
    return () => {};
  }
  wis();
  const v = meta().vertrek;
  const punten = boog([v.lat, v.lng], [o.luchthaven.lat, o.luchthaven.lng]);
  kaart.invalidateSize({ pan: false });
  kaart.fitBounds(L.latLngBounds(punten).pad(0.12), { animate: false });

  L.polyline(punten, { color: '#12305A', weight: 2, opacity: 0.25, dashArray: '3 7', interactive: false }).addTo(laagVlucht);
  // De condensstreep vervaagt naar achteren: vier stukken, het oudste het lichtst.
  const DEKKING = [0.2, 0.4, 0.65, 0.95];
  const rand = L.polyline([], { color: '#12305A', weight: 8, opacity: 0.12, interactive: false }).addTo(laagVlucht);
  const stukken = DEKKING.map((opacity) => L.polyline([], { color: '#FFFFFF', weight: 4.5, opacity, lineCap: 'butt', interactive: false }).addTo(laagVlucht));
  const toestel = L.marker(punten[0], {
    icon: L.divIcon({ className: 'toestel', html: toestelBoven(meta().carriers?.[o.carrier]), iconSize: [52, 52], iconAnchor: [26, 26] }),
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
  }).addTo(laagVlucht);
  const tekening = toestel.getElement().querySelector('svg');

  const DUUR = 3200;
  let start;
  let frame;
  let af = false;
  const zacht = (p) => (p < 0.5 ? 2 * p * p : 1 - (-2 * p + 2) ** 2 / 2);

  function stap(nu) {
    start ??= nu;
    const p = Math.min(1, (nu - start) / DUUR);
    const plek = zacht(p) * (punten.length - 1);
    const i = Math.min(Math.floor(plek), punten.length - 2);
    const f = plek - i;
    const [p0, p1] = [punten[i], punten[i + 1]];
    const positie = [p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f];
    toestel.setLatLng(positie);
    const spoor = [...punten.slice(0, i + 1), positie];
    rand.setLatLngs(spoor);
    const deel = Math.ceil(spoor.length / stukken.length);
    stukken.forEach((stuk, n) => stuk.setLatLngs(spoor.slice(Math.max(0, n * deel - 1), (n + 1) * deel)));
    const [s0, s1] = [kaart.latLngToLayerPoint(p0), kaart.latLngToLayerPoint(p1)];
    tekening.style.transform = `rotate(${(Math.atan2(s1.y - s0.y, s1.x - s0.x) * 180) / Math.PI + 90}deg)`;
    if (p < 1) frame = requestAnimationFrame(stap);
    else einde();
  }

  function einde(stil = false) {
    if (af) return;
    af = true;
    cancelAnimationFrame(frame);
    if (!stil) klaar();
  }

  frame = requestAnimationFrame(stap);
  return einde;
}
