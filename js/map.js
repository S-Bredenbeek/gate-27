// De kaart: Leaflet met tegels van OpenStreetMap. Laadt Leaflet niet, dan werkt de rest van de site door.

import { meta, opties, landKleur, esc } from './data.js';
import { icoon } from './icons.js';
import { toestelBoven } from './plane.js';

let kaart = null;
let laagOpties;
let laagHuizen;
let laagVlucht;
let huisPinnen = [];
const pinnen = new Map();

const rustig = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

const pinHtml = (kleur) =>
  `<svg viewBox="0 0 30 38" width="30" height="38" aria-hidden="true"><path d="M15 1C7.3 1 1 7.2 1 14.8 1 24.500 15 37 15 37s14-12.500 14-22.200C29 7.200 22.700 1 15 1z" fill="${esc(kleur)}" stroke="#fff" stroke-width="2"/><circle cx="15" cy="14.500" r="5" fill="#fff"/></svg>`;

export function maakKaart(opPin) {
  const el = document.getElementById('kaart');
  if (!window.L) {
    el.innerHTML = '<p class="kaart-fout">De kaart kon niet laden. De rest van de site werkt gewoon.</p>';
    return false;
  }
  kaart = L.map(el, { zoomControl: false, zoomSnap: 0.25, minZoom: 3, maxZoom: 15 });
  kaart.setView([46, 8], 4);
  kaart.attributionControl.setPrefix(false);
  L.control.zoom({ position: 'topright', zoomInTitle: 'Inzoomen', zoomOutTitle: 'Uitzoomen' }).addTo(kaart);
  // CartoDB Voyager vraagt sinds kort een API-sleutel; de standaardtegels van OpenStreetMap werken zonder.
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  }).addTo(kaart);

  laagVlucht = L.layerGroup().addTo(kaart);
  laagHuizen = L.layerGroup().addTo(kaart);
  laagOpties = L.layerGroup().addTo(kaart);

  const v = meta().vertrek;
  L.marker([v.lat, v.lng], {
    icon: L.divIcon({ className: 'vertrekpin', html: `<span>${esc(v.code)}</span>`, iconSize: [46, 24], iconAnchor: [23, 12] }),
    interactive: false,
    keyboard: false,
  }).addTo(kaart);

  for (const o of opties()) {
    const pin = L.marker([o.lat, o.lng], {
      icon: L.divIcon({ className: 'pin', html: pinHtml(landKleur(o)), iconSize: [30, 38], iconAnchor: [15, 37] }),
      title: o.naam,
      alt: `${o.naam}, ${o.land}`,
      riseOnHover: true,
    }).addTo(laagOpties);
    pin.on('click', () => opPin(o.id));
    pinnen.set(o.id, pin);
  }

  new ResizeObserver(() => kaart.invalidateSize({ pan: false })).observe(el);
  return true;
}

function label(pin, tekst, vast) {
  pin.unbindTooltip();
  pin.bindTooltip(esc(tekst), { direction: 'top', offset: [0, -34], className: 'pinlabel', permanent: vast });
}

function pas(punten, { maxZoom = 9, animeer = true } = {}) {
  kaart.invalidateSize({ pan: false });
  const grenzen = L.latLngBounds(punten);
  const opties = { paddingTopLeft: [36, 44], paddingBottomRight: [36, 48], maxZoom };
  if (animeer && !rustig()) kaart.flyToBounds(grenzen, { ...opties, duration: 0.9 });
  else kaart.fitBounds(grenzen, { ...opties, animate: false });
}

function wis() {
  laagVlucht.clearLayers();
  laagHuizen.clearLayers();
  huisPinnen = [];
}

export function toonHal() {
  if (!kaart) return;
  wis();
  laagOpties.addTo(kaart);
  for (const o of opties()) {
    pinnen.get(o.id).setOpacity(1);
    label(pinnen.get(o.id), o.naam, false);
  }
  const v = meta().vertrek;
  pas([[v.lat, v.lng], ...opties().map((o) => [o.lat, o.lng])], { maxZoom: 5 });
}

export function toonGate(groepId) {
  if (!kaart) return;
  wis();
  laagOpties.addTo(kaart);
  const punten = [];
  for (const o of opties()) {
    const eigen = o.groep === groepId;
    pinnen.get(o.id).setOpacity(eigen ? 1 : 0.3);
    pinnen.get(o.id).setZIndexOffset(eigen ? 500 : 0);
    label(pinnen.get(o.id), o.naam, eigen);
    if (eigen) punten.push([o.lat, o.lng]);
  }
  if (punten.length) pas(punten, { maxZoom: 7 });
}

export function toonBestemming(o, gekozen, opHuis, animeer = true) {
  if (!kaart) return;
  wis();
  laagOpties.remove();
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
  laagOpties.remove();
  const v = meta().vertrek;
  const punten = boog([v.lat, v.lng], [o.luchthaven.lat, o.luchthaven.lng]);
  kaart.invalidateSize({ pan: false });
  kaart.fitBounds(L.latLngBounds(punten).pad(0.12), { animate: false });

  L.polyline(punten, { color: '#12305A', weight: 2, opacity: 0.3, dashArray: '3 7', interactive: false }).addTo(laagVlucht);
  const rand = L.polyline([], { color: '#12305A', weight: 7, opacity: 0.18, interactive: false }).addTo(laagVlucht);
  const streep = L.polyline([], { color: '#FFFFFF', weight: 4, opacity: 0.95, interactive: false }).addTo(laagVlucht);
  L.circleMarker([o.luchthaven.lat, o.luchthaven.lng], { radius: 6, color: '#fff', weight: 2, fillColor: landKleur(o), fillOpacity: 1, interactive: false }).addTo(laagVlucht);
  const toestel = L.marker(punten[0], {
    icon: L.divIcon({ className: 'toestel', html: toestelBoven(), iconSize: [48, 48], iconAnchor: [24, 24] }),
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
  }).addTo(laagVlucht);
  const tekening = toestel.getElement().querySelector('svg');

  const DUUR = 3000;
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
    streep.setLatLngs(spoor);
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
