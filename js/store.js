// Alles wat de bezoeker kiest, blijft alleen in de eigen browser staan.
// Lukt opslaan niet (privévenster, geblokkeerde opslag), dan werkt de site gewoon door in het geheugen.

const SLEUTEL = 'vriendenvakantie-v1';

const standaard = () => ({
  naam: '',
  figuur: null,
  avatar: null,
  koffer: [],
  gewichten: {},
  top3: [],
  bezocht: [],
  huis: {},
  hooghoud: {},
  jogo: 0,
  rollen: {},
  namen: [],
  taal: null,
  klaar: false,
  huisFav: [],
  gedeeld: false,
  paklijst: {},
  kv: {},
  codes: '',
});

let geheugen = standaard();

export function laadStaat() {
  try {
    const ruw = localStorage.getItem(SLEUTEL);
    if (ruw) geheugen = { ...standaard(), ...JSON.parse(ruw) };
  } catch {
    geheugen = standaard();
  }
  return geheugen;
}

export const staat = () => geheugen;

export function wijzig(deel) {
  Object.assign(geheugen, deel);
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(geheugen));
  } catch {
    // opslag niet beschikbaar: de keuze geldt dan alleen voor deze sessie
  }
}

// Alles wissen en opnieuw beginnen. De gekozen taal blijft staan.
export function wisStaat() {
  geheugen = { ...standaard(), taal: geheugen.taal };
  try {
    localStorage.setItem(SLEUTEL, JSON.stringify(geheugen));
  } catch {
    // opslag niet beschikbaar: het geheugen is hoe dan ook leeg
  }
}
