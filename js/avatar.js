// De cartoonpoppetjes: een zelfgetekend borstbeeld, opgebouwd uit losse keuzes.
// De groep staat (zonder namen) in meta.groep_figuren; iedereen kan zijn eigen poppetje bijwerken.

export const KEUZES = {
  haar: [['kort', 'Kort'], ['lang', 'Lang'], ['krul', 'Krullen'], ['knot', 'Knot'], ['staart', 'Staart'], ['kaal', 'Kaal']],
  haarkleur: ['#2B1D14', '#5A3A22', '#8A5A2B', '#C99A4B', '#E7C873', '#B5482A', '#9A9A9A'],
  huid: ['#F6D3B8', '#EDBE98', '#D49B6E', '#A9714B', '#7A4A2E'],
  shirt: ['#E4572E', '#2E86AB', '#F2B134', '#3D9970', '#8E5572', '#22313F', '#F2F2EC'],
};

const INKT = '#1A2233';
const LIJN = `stroke="${INKT}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round"`;
const veilig = (kleur, anders) => (/^#[0-9a-f]{3,8}$/i.test(kleur ?? '') ? kleur : anders);

function gezicht(y = 0) {
  return `<circle cx="41" cy="${50 + y}" r="2.7" fill="${INKT}"/><circle cx="59" cy="${50 + y}" r="2.7" fill="${INKT}"/>
    <circle cx="35" cy="${58 + y}" r="4" fill="#E8776A" opacity=".35"/><circle cx="65" cy="${58 + y}" r="4" fill="#E8776A" opacity=".35"/>`;
}

function kind(a, huid, haar, shirt) {
  return `<path d="M26 112c0-17 9-24 24-24s24 7 24 24z" fill="${shirt}" ${LIJN}/>
    <circle cx="22" cy="56" r="5" fill="${huid}" ${LIJN}/><circle cx="78" cy="56" r="5" fill="${huid}" ${LIJN}/>
    <circle cx="50" cy="54" r="30" fill="${huid}" ${LIJN}/>
    <path d="M44 27c-2-8 8-11 10-4 1 4-4 5-3 9" fill="none" stroke="${haar}" stroke-width="4" stroke-linecap="round"/>
    ${gezicht(4)}
    <circle cx="50" cy="69" r="6.5" fill="#fff" ${LIJN}/><circle cx="50" cy="69" r="2.2" fill="${shirt}"/>`;
}

export function poppetje(a = {}, klasse = '') {
  const huid = veilig(a.huid, KEUZES.huid[0]);
  const haar = veilig(a.haarkleur, KEUZES.haarkleur[1]);
  const shirt = veilig(a.shirt, KEUZES.shirt[1]);
  const open = `<svg class="poppetje ${klasse}" viewBox="0 0 100 112" aria-hidden="true" focusable="false">`;
  if (a.kind) return `${open}${kind(a, huid, haar, shirt)}</svg>`;

  const stijl = a.haar ?? 'kort';
  const achter = {
    lang: `<path d="M23 50C17 12 83 12 77 50l4 44H19z" fill="${haar}" ${LIJN}/>`,
    staart: `<path d="M71 28c16 0 20 20 12 38-3-8-8-12-14-14z" fill="${haar}" ${LIJN}/>`,
    knot: `<circle cx="50" cy="13" r="10" fill="${haar}" ${LIJN}/>`,
  }[stijl] ?? '';
  const pony = `<path d="M26 48C21 20 40 14 50 14s29 6 24 34c-4-11-12-16-24-16s-20 5-24 16z" fill="${haar}" ${LIJN}/>`;
  const krullen = [[28, 40], [31, 28], [41, 20], [53, 18], [64, 22], [71, 31], [73, 42]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9.5" fill="${haar}" ${LIJN}/>`).join('');
  const voor = stijl === 'kaal' ? '' : stijl === 'krul' ? krullen : pony;

  return `${open}${achter}
    <path d="M10 112C10 91 29 85 50 85s40 6 40 27z" fill="${shirt}" ${LIJN}/>
    <path d="M42 70v15c0 6 16 6 16 0V70z" fill="${huid}" ${LIJN}/>
    <circle cx="26" cy="50" r="4.5" fill="${huid}" ${LIJN}/><circle cx="74" cy="50" r="4.5" fill="${huid}" ${LIJN}/>
    <ellipse cx="50" cy="48" rx="24" ry="27" fill="${huid}" ${LIJN}/>
    ${a.baard ? `<path d="M27 52c1 26 15 29 23 29s22-3 23-29c-6 10-14 12-23 12s-17-2-23-12z" fill="${haar}" ${LIJN}/>` : ''}
    ${voor}
    ${gezicht()}
    <path d="M43 60q7 8 14 0z" fill="#fff" ${LIJN}/>
    ${a.bril ? `<g fill="rgba(255,255,255,.35)" ${LIJN}><circle cx="41" cy="50" r="7.5"/><circle cx="59" cy="50" r="7.5"/><path d="M48.5 50h3M33.5 49l-7-2M66.5 49l7-2" fill="none"/></g>` : ''}
  </svg>`;
}
