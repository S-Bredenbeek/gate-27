// Twee talen. Interfaceteksten staan op de plek waar ze gebruikt worden als t('Nederlands', 'English');
// de inhoud komt uit vakantie-data.json, met de Engelse vertaling in vakantie-data.en.json.

let taal = 'nl';

export const TALEN = ['nl', 'en'];
export const huidigeTaal = () => taal;
export const zetTaal = (nieuw) => {
  taal = TALEN.includes(nieuw) ? nieuw : 'nl';
};
export const t = (nl, en) => (taal === 'en' ? en ?? nl : nl);
export const locale = () => (taal === 'en' ? 'en-GB' : 'nl-NL');
export const voorkeurstaal = () => ((navigator.language ?? 'nl').toLowerCase().startsWith('nl') ? 'nl' : 'en');
