// De cartoonpoppetjes: een zelfgetekend borstbeeld, opgebouwd uit losse keuzes.
// De groep staat (zonder namen) in meta.groep_figuren; iedereen kan zijn eigen poppetje bijwerken.

export const KEUZES = {
  haar: [['kort', 'Kort'], ['kuif', 'Kuif'], ['krul', 'Krullen'], ['lang', 'Lang'], ['golvend', 'Golvend'], ['knot', 'Knot'], ['staart', 'Staart'], ['kaal', 'Kaal']],
  haarkleur: ['#2B1D14', '#4A3324', '#6B4A2F', '#8A6A45', '#B98A4E', '#E7C873', '#B5482A', '#9A9A9A'],
  huid: ['#F6D3B8', '#EDBE98', '#D49B6E', '#A9714B', '#7A4A2E'],
  shirt: ['#F2F2EC', '#EFE6D2', '#E4572E', '#2E86AB', '#F2B134', '#3D9970', '#8E5572', '#5A5F68', '#22313F'],
  extra: [['bril', 'Bril'], ['zonnebril', 'Zonnebril'], ['bril_op_hoofd', 'Zonnebril op hoofd'], ['baard', 'Baard'], ['stoppels', 'Stoppels']],
};
export const UITERLIJK = ['huid', 'haar', 'haarkleur', 'shirt', 'shirtmotief', 'shirtaccent', 'baard', 'stoppels', 'bril', 'zonnebril', 'bril_op_hoofd'];

const INKT = '#1A2233';
const LIJN = `stroke="${INKT}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const veilig = (kleur, anders) => (/^#[0-9a-f]{3,8}$/i.test(kleur ?? '') ? kleur : anders);
let volgnummer = 0;

function gezicht(y = 0) {
  return `<circle cx="41" cy="${50 + y}" r="2.7" fill="${INKT}"/><circle cx="59" cy="${50 + y}" r="2.7" fill="${INKT}"/>
    <circle cx="35" cy="${58 + y}" r="4" fill="#E8776A" opacity=".35"/><circle cx="65" cy="${58 + y}" r="4" fill="#E8776A" opacity=".35"/>`;
}

function kind(huid, haar, shirt) {
  return `<path d="M26 112c0-17 9-24 24-24s24 7 24 24z" fill="${shirt}" ${LIJN}/>
    <circle cx="22" cy="56" r="5" fill="${huid}" ${LIJN}/><circle cx="78" cy="56" r="5" fill="${huid}" ${LIJN}/>
    <circle cx="50" cy="54" r="30" fill="${huid}" ${LIJN}/>
    <path d="M44 27c-2-8 8-11 10-4 1 4-4 5-3 9" fill="none" stroke="${haar}" stroke-width="4" stroke-linecap="round"/>
    ${gezicht(4)}
    <circle cx="50" cy="69" r="6.5" fill="#fff" ${LIJN}/><circle cx="50" cy="69" r="2.2" fill="${shirt}"/>`;
}

const ROMP = 'M10 112C10 91 29 85 50 85s40 6 40 27z';
const glazen = (y, vul) => `<g ${LIJN} fill="${vul}"><path d="M32 ${y}h15v4a7.5 7.5 0 0 1-15 0z"/><path d="M53 ${y}h15v4a7.5 7.5 0 0 1-15 0z"/><path d="M47 ${y + 1}h6" fill="none"/></g>`;

function shirtmotief(soort, accent, id) {
  const tekening = {
    streep: `<rect x="0" y="93" width="100" height="3.5" fill="${accent}"/><rect x="0" y="101" width="100" height="3.5" fill="${accent}"/>`,
    zebra: `<g fill="${accent}"><path d="M14 112l8-22 5 2-7 20zM30 112l7-26 5 1-6 25zM47 112l3-27h5l-2 27zM63 112l-3-26 5-1 5 27zM79 112l-8-22 5-2 9 24z"/></g>`,
    ruit: `<g stroke="${accent}" stroke-width="1.4" opacity=".7"><path d="M0 92h100M0 100h100M0 108h100M22 84v30M34 84v30M46 84v30M58 84v30M70 84v30M82 84v30"/></g>`,
  }[soort];
  if (!tekening) return '';
  return `<clipPath id="romp-${id}"><path d="${ROMP}"/></clipPath><g clip-path="url(#romp-${id})">${tekening}</g><path d="${ROMP}" fill="none" ${LIJN}/>`;
}

export function poppetje(a = {}, klasse = '') {
  const huid = veilig(a.huid, KEUZES.huid[0]);
  const haar = veilig(a.haarkleur, KEUZES.haarkleur[1]);
  const shirt = veilig(a.shirt, KEUZES.shirt[3]);
  const open = `<svg class="poppetje ${klasse}" viewBox="0 0 100 112" aria-hidden="true" focusable="false">`;
  if (a.kind) return `${open}${kind(huid, haar, shirt)}</svg>`;

  const stijl = a.haar ?? 'kort';
  const achter = {
    lang: `<path d="M23 50C17 12 83 12 77 50l4 44H19z" fill="${haar}" ${LIJN}/>`,
    golvend: `<path d="M24 50C15 8 85 8 76 50c7 7 1 13 5 21s-3 13 3 23H16c6-10-1-15 3-23s-2-14 5-21z" fill="${haar}" ${LIJN}/>`,
    staart: `<path d="M71 28c16 0 20 20 12 38-3-8-8-12-14-14z" fill="${haar}" ${LIJN}/>`,
    knot: `<circle cx="50" cy="13" r="10" fill="${haar}" ${LIJN}/>`,
  }[stijl] ?? '';
  const pony = `<path d="M26 48C21 20 40 14 50 14s29 6 24 34c-4-11-12-16-24-16s-20 5-24 16z" fill="${haar}" ${LIJN}/>`;
  const kuif = `<path d="M26 49C19 28 27 11 39 13c4-6 13-7 18-2 7-3 15 1 17 9 5 7 3 18 1 29-4-11-13-16-25-16s-20 5-24 16z" fill="${haar}" ${LIJN}/>`;
  const krullen = [[28, 40], [31, 28], [41, 20], [53, 18], [64, 22], [71, 31], [73, 42]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.5" fill="${haar}" ${LIJN}/>`).join('');
  const voor = { kaal: '', krul: krullen, kuif }[stijl] ?? pony;
  const baardvorm = 'M27 52c1 26 15 29 23 29s22-3 23-29c-6 10-14 12-23 12s-17-2-23-12z';

  return `${open}${achter}
    <path d="${ROMP}" fill="${shirt}" ${LIJN}/>
    ${shirtmotief(a.shirtmotief, veilig(a.shirtaccent, INKT), ++volgnummer)}
    <path d="M42 70v15c0 6 16 6 16 0V70z" fill="${huid}" ${LIJN}/>
    <circle cx="26" cy="50" r="4.5" fill="${huid}" ${LIJN}/><circle cx="74" cy="50" r="4.5" fill="${huid}" ${LIJN}/>
    <ellipse cx="50" cy="48" rx="24" ry="27" fill="${huid}" ${LIJN}/>
    ${a.baard ? `<path d="${baardvorm}" fill="${haar}" ${LIJN}/>` : a.stoppels ? `<path d="${baardvorm}" fill="${haar}" opacity=".3"/>` : ''}
    ${voor}
    ${a.zonnebril ? '' : gezicht()}
    <path d="M43 60q7 8 14 0z" fill="#fff" ${LIJN}/>
    ${a.zonnebril ? `${glazen(44, INKT)}<circle cx="35" cy="59" r="4" fill="#E8776A" opacity=".35"/><circle cx="65" cy="59" r="4" fill="#E8776A" opacity=".35"/>` : ''}
    ${a.bril && !a.zonnebril ? `<g fill="rgba(255,255,255,.35)" ${LIJN}><circle cx="41" cy="50" r="7.5"/><circle cx="59" cy="50" r="7.5"/><path d="M48.5 50h3M33.5 49l-7-2M66.5 49l7-2" fill="none"/></g>` : ''}
    ${a.bril_op_hoofd && stijl !== 'kaal' ? glazen(19, INKT) : ''}
  </svg>`;
}
