// Het vliegtuig in bovenaanzicht voor op de kaart. De neus wijst omhoog; map.js draait het mee met de route.
// De kleurstelling per maatschappij en het zijaanzicht volgen in fase 2.

export function toestelBoven() {
  return `<svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
    <g stroke="#12305A" stroke-width="1.4" stroke-linejoin="round">
      <path d="M24 17 L44 29 V33 L24 27 L4 33 V29 Z" fill="#E6EAF0"/>
      <path d="M24 37 L32 43 V45 L24 43 L16 45 V43 Z" fill="#E6EAF0"/>
      <rect x="12" y="23" width="4" height="6" rx="2" fill="#12305A"/>
      <rect x="32" y="23" width="4" height="6" rx="2" fill="#12305A"/>
      <path d="M24 3 C27 3 28 8 28 13 V37 C28 41 26 44 24 45 C22 44 20 41 20 37 V13 C20 8 21 3 24 3 Z" fill="#FFFFFF"/>
    </g>
  </svg>`;
}
