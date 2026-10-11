// De cartoonpoppetjes: een zelfgetekend borstbeeld, opgebouwd uit losse kenmerken.
// De groep staat (zonder namen) in meta.groep_figuren; iedereen kan zijn eigen poppetje bijwerken.

export const KEUZES = {
  haar: [['kort', 'Kort', 'Short'], ['kuif', 'Kuif', 'Quiff'], ['krulkort', 'Korte krul', 'Short curls'], ['krul', 'Krullen', 'Curls'], ['lang', 'Lang', 'Long'], ['golvend', 'Golvend', 'Wavy'], ['knot', 'Knot', 'Bun'], ['staart', 'Staart', 'Ponytail'], ['kaal', 'Kaal', 'Bald']],
  haarkleur: ['#2B1D14', '#4A3324', '#6B4A2F', '#8A6A45', '#B98A4E', '#E7C873', '#B5482A', '#9A9A9A'],
  huid: ['#F6D3B8', '#EDBE98', '#D49B6E', '#A9714B', '#7A4A2E'],
  shirt: ['#F7F7F2', '#EFE6D2', '#E4572E', '#2E86AB', '#F2B134', '#3D9970', '#8E5572', '#7A7F8A', '#22313F'],
  extra: [['bril', 'Bril', 'Glasses'], ['zonnebril', 'Zonnebril', 'Sunglasses'], ['bril_op_hoofd', 'Zonnebril op hoofd', 'Shades on head'], ['baard', 'Baard', 'Beard'], ['stoppels', 'Stoppels', 'Stubble'], ['snor', 'Snor', 'Moustache'], ['oorbellen', 'Oorbellen', 'Earrings']],
};
export const UITERLIJK = ['huid', 'haar', 'scheiding', 'haarkleur', 'gezicht', 'mond', 'ogen', 'shirt', 'shirtmotief', 'shirtaccent', 'kraag', 'jas', 'jasmotief', 'jasaccent', 'trui_om', 'baard', 'stoppels', 'snor', 'bril', 'zonnebril', 'montuur', 'bril_op_hoofd', 'bril_aan_kraag', 'oorbellen'];

const INKT = '#1A2233';
const GOUD = '#D4A017';
const LIJN = `stroke="${INKT}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const DUN = `stroke="${INKT}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"`;
const veilig = (kleur, anders) => (/^#[0-9a-f]{3,8}$/i.test(kleur ?? '') ? kleur : anders);
let volgnummer = 0;

const blos = (y = 58) => `<circle cx="35" cy="${y}" r="4" fill="#E8776A" opacity=".35"/><circle cx="65" cy="${y}" r="4" fill="#E8776A" opacity=".35"/>`;
const ogenOpen = (y = 50) => `<circle cx="41" cy="${y}" r="2.7" fill="${INKT}"/><circle cx="59" cy="${y}" r="2.7" fill="${INKT}"/>`;
const ogenDicht = `<path d="M37 51q4-4 8 0M55 51q4-4 8 0" fill="none" ${LIJN}/>`;

function kind(huid, haar, shirt) {
  return `<path d="M26 112c0-17 9-24 24-24s24 7 24 24z" fill="${shirt}" ${LIJN}/>
    <circle cx="22" cy="56" r="5" fill="${huid}" ${LIJN}/><circle cx="78" cy="56" r="5" fill="${huid}" ${LIJN}/>
    <circle cx="50" cy="54" r="30" fill="${huid}" ${LIJN}/>
    <path d="M44 27c-2-8 8-11 10-4 1 4-4 5-3 9" fill="none" stroke="${haar}" stroke-width="4" stroke-linecap="round"/>
    ${ogenOpen(54)}${blos(62)}
    <circle cx="50" cy="69" r="6.5" fill="#fff" ${LIJN}/><circle cx="50" cy="69" r="2.2" fill="${shirt}"/>`;
}

const ROMP = 'M10 112C10 91 29 85 50 85s40 6 40 27z';
const JAS = 'M10 112C10 92 27 86 43 85l-6 27zM90 112C90 92 73 86 57 85l6 27z';

const MOTIEF = {
  streep: (k) => `<rect x="0" y="94" width="100" height="3.5" fill="${k}"/><rect x="0" y="102" width="100" height="3.5" fill="${k}"/>`,
  zebra: (k) => `<g fill="${k}"><path d="M12 112l7-24 4 1-5 23zM24 112l6-27 4 1-5 26zM35 112l4-27h4l-3 27zM66 112l-4-27 4-1 6 28zM78 112l-7-25 4-1 9 26zM88 112l-6-18 3-2 6 20z"/></g>`,
  ruit: (k) => `<g stroke="${k}" stroke-width="1.4" opacity=".75"><path d="M0 92h100M0 99h100M0 106h100M16 84v30M24 84v30M32 84v30M40 84v30M60 84v30M68 84v30M76 84v30M84 84v30"/></g>`,
};

function metMotief(vorm, soort, accent) {
  if (!MOTIEF[soort]) return '';
  const id = `knip-${++volgnummer}`;
  return `<clipPath id="${id}"><path d="${vorm}"/></clipPath><g clip-path="url(#${id})">${MOTIEF[soort](accent)}</g><path d="${vorm}" fill="none" ${LIJN}/>`;
}

const ZONNEBRIL = {
  rond: () => `<g ${LIJN} fill="${INKT}"><circle cx="40" cy="50" r="8"/><circle cx="60" cy="50" r="8"/><path d="M48 49h4M32 49l-6-2M68 49l6-2" fill="none"/></g><path d="M36 47l3-2M56 47l3-2" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".6"/>`,
  kat: (montuur) => `<g stroke="${montuur}" stroke-width="3" stroke-linejoin="round" fill="${INKT}"><path d="M30 45l17 2v4a7 7 0 0 1-14 1zM70 45l-17 2v4a7 7 0 0 0 14 1z"/></g><path d="M47 48h6" stroke="${montuur}" stroke-width="3"/><g fill="none" ${DUN}><path d="M29 44l18 2v5a8 8 0 0 1-16 1zM71 44l-18 2v5a8 8 0 0 0 16 1z"/></g>`,
  piloot: () => `<g ${DUN} fill="${INKT}"><path d="M32 45h15v5c0 5-4 8-8 8s-8-4-7-13zM68 45H53v5c0 5 4 8 8 8s8-4 7-13z"/><path d="M47 46h6M47 49.5h6M32 46l-6-1M68 46l6-1" fill="none"/></g><path d="M35 48l4-2M56 48l4-2" stroke="#fff" stroke-width="1.5" stroke-linecap="round" opacity=".55"/>`,
};
const kleinGlas = (x, y) => `<g ${DUN} fill="${INKT}"><path d="M${x - 11} ${y}h9v3a4.5 4.5 0 0 1-9 0zM${x + 2} ${y}h9v3a4.5 4.5 0 0 1-9 0z"/><path d="M${x - 2} ${y + 1}h4" fill="none"/></g>`;

export function poppetje(a = {}, klasse = '') {
  const huid = veilig(a.huid, KEUZES.huid[0]);
  const haar = veilig(a.haarkleur, KEUZES.haarkleur[1]);
  const shirt = veilig(a.shirt, KEUZES.shirt[3]);
  const open = `<svg class="poppetje ${klasse}" viewBox="0 0 100 112" aria-hidden="true" focusable="false">`;
  if (a.kind) return `${open}${kind(huid, haar, shirt)}</svg>`;

  const stijl = a.haar ?? 'kort';
  const [rx, ry] = a.gezicht === 'lang' ? [22, 29] : a.gezicht === 'rond' ? [25, 26] : [24, 27];
  const achter = {
    lang: `<path d="M23 50C17 12 83 12 77 50l4 44H19z" fill="${haar}" ${LIJN}/>`,
    golvend: `<path d="M24 50C14 6 86 6 76 50c8 6 1 13 6 21s-4 13 3 23H15c7-10-2-15 3-23s-2-15 6-21z" fill="${haar}" ${LIJN}/>`,
    staart: `<path d="M71 28c16 0 20 20 12 38-3-8-8-12-14-14z" fill="${haar}" ${LIJN}/>`,
    knot: `<circle cx="50" cy="13" r="10" fill="${haar}" ${LIJN}/>`,
  }[stijl] ?? '';
  const pony = `<path d="M26 48C21 20 40 14 50 14s29 6 24 34c-4-11-12-16-24-16s-20 5-24 16z" fill="${haar}" ${LIJN}/>`;
  const kuif = `<path d="M26 49C19 28 27 11 39 13c4-6 13-7 18-2 7-3 15 1 17 9 5 7 3 18 1 29-4-11-13-16-25-16s-20 5-24 16z" fill="${haar}" ${LIJN}/>`;
  const bol = ([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${haar}" ${LIJN}/>`;
  const krullen = [[28, 40, 9.5], [31, 28, 9.5], [41, 20, 9.5], [53, 18, 9.5], [64, 22, 9.5], [71, 31, 9.5], [73, 42, 9.5]].map(bol).join('');
  const krulkort = `<path d="M27 46C24 28 38 20 50 20s26 8 23 26c-4-8-12-13-23-13s-19 5-23 13z" fill="${haar}" ${LIJN}/>${[[33, 25, 8], [42, 18, 8.5], [53, 16, 8.5], [63, 20, 8], [69, 28, 7]].map(bol).join('')}`;
  const voor = { kaal: '', krul: krullen, krulkort, kuif }[stijl] ?? pony;
  const scheiding = a.scheiding && ['lang', 'golvend', 'kort', 'staart', 'knot'].includes(stijl) ? `<path d="M50 15c-1 6-1 11 0 16" fill="none" ${DUN}/>` : '';
  const baardvorm = 'M27 52c1 26 15 29 23 29s22-3 23-29c-6 10-14 12-23 12s-17-2-23-12z';
  const bedekt = !!a.zonnebril;
  const soortBril = ZONNEBRIL[a.zonnebril] ?? ZONNEBRIL.rond;
  const mond = {
    lach: `<path d="M41 59q9 11 18 0z" fill="#fff" ${LIJN}/>`,
    glimlach: `<path d="M42 61q8 6 16 0" fill="none" ${LIJN}/>`,
    grijns: `<path d="M42 62q9 4 16-4" fill="none" ${LIJN}/>`,
  }[a.mond] ?? `<path d="M43 60q7 8 14 0z" fill="#fff" ${LIJN}/>`;
  const oorbel = a.oorbellen === 'ring' || a.oorbellen === true
    ? `<circle cx="25" cy="59" r="3.8" fill="none" stroke="${GOUD}" stroke-width="2"/><circle cx="75" cy="59" r="3.8" fill="none" stroke="${GOUD}" stroke-width="2"/>`
    : a.oorbellen ? `<circle cx="26" cy="56" r="2" fill="${GOUD}"/><circle cx="74" cy="56" r="2" fill="${GOUD}"/>` : '';

  return `${open}${achter}
    <path d="${ROMP}" fill="${shirt}" ${LIJN}/>
    ${metMotief(ROMP, a.shirtmotief, veilig(a.shirtaccent, INKT))}
    ${a.jas ? `<path d="${JAS}" fill="${veilig(a.jas, '#5A5F68')}" ${LIJN}/>${metMotief(JAS, a.jasmotief, veilig(a.jasaccent, INKT))}` : ''}
    ${a.trui_om ? `<path d="M13 100c8-13 24-16 37-7 13-9 29-6 37 7l-6 5c-8-9-21-10-31-2-10-8-23-7-31 2z" fill="${veilig(a.trui_om, '#22313F')}" ${LIJN}/><path d="M45 93l5 8 5-8M47 101l-3 9M53 101l3 9" fill="none" stroke="${veilig(a.trui_om, '#22313F')}" stroke-width="5" stroke-linecap="round"/>` : ''}
    <path d="M42 70v15c0 6 16 6 16 0V70z" fill="${huid}" ${LIJN}/>
    ${a.kraag ? `<path d="M42 83l-9 4 10 8zM58 83l9 4-10 8z" fill="${shirt}" ${LIJN}/>` : ''}
    ${a.bril_aan_kraag ? kleinGlas(50, 96) : ''}
    <circle cx="${50 - rx - 1}" cy="50" r="4.5" fill="${huid}" ${LIJN}/><circle cx="${50 + rx + 1}" cy="50" r="4.5" fill="${huid}" ${LIJN}/>
    ${oorbel}
    <ellipse cx="50" cy="48" rx="${rx}" ry="${ry}" fill="${huid}" ${LIJN}/>
    ${a.baard ? `<path d="${baardvorm}" fill="${haar}" ${LIJN}/>` : a.stoppels ? `<path d="${baardvorm}" fill="${haar}" opacity=".28"/>` : ''}
    ${voor}${scheiding}
    ${bedekt ? '' : a.ogen === 'dicht' ? ogenDicht : ogenOpen()}
    ${blos(bedekt ? 60 : 58)}
    ${mond}
    ${a.snor ? `<path d="M41 57.5q4.5-3.5 9-.500 4.5-3 9 .500-4.5 2.5-9 1-4.5 1.5-9-1z" fill="${haar}" ${DUN}/>` : ''}
    ${bedekt ? soortBril(veilig(a.montuur, INKT)) : ''}
    ${a.bril && !bedekt ? `<g fill="rgba(255,255,255,.35)" ${LIJN}><circle cx="41" cy="50" r="7.5"/><circle cx="59" cy="50" r="7.5"/><path d="M48.5 50h3M33.5 49l-7-2M66.5 49l7-2" fill="none"/></g>` : ''}
    ${a.bril_op_hoofd && stijl !== 'kaal' ? kleinGlas(50, 19) : ''}
  </svg>`;
}
