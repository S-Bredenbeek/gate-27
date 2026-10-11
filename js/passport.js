// Het paspoort: een pagina per land met de verzamelde stempels, schuin en half over elkaar.

import { meta, opties, land, esc } from './data.js';
import { staat } from './store.js';
import { poppetje } from './avatar.js';
import { thema } from './patterns.js';
import { stempel, kanteling } from './stamps.js';

export function paspoort() {
  const s = staat();
  const perLand = new Map();
  for (const o of opties()) {
    if (!perLand.has(o.land)) perLand.set(o.land, []);
    perLand.get(o.land).push(o);
  }
  const totaal = opties().length;
  const aantal = opties().filter((o) => s.bezocht.includes(o.id)).length;

  const paginas = [...perLand].map(([naam, lijst]) => {
    const bekend = lijst.some((o) => s.bezocht.includes(o.id));
    const l = land(lijst[0]);
    const stempels = lijst.map((o) => (s.bezocht.includes(o.id)
      ? `<a class="pp-stempel" href="#/b/${esc(o.id)}" style="--kantel:${kanteling(o.id)}deg" aria-label="Stempel van ${esc(o.naam)}: bekijk deze bestemming">${stempel(o.stempel)}</a>`
      : '<span class="pp-leeg" aria-label="Nog niet ontdekt">?</span>')).join('');
    return `<section class="pp-pagina${bekend ? '' : ' onbekend'}" style="${bekend ? thema(lijst[0]) : ''}">
      <h3>${bekend ? esc(naam) : 'Nog geheim'}</h3>
      <p class="hand">${bekend ? esc(l.welkom) : 'hier moet je nog heen'}</p>
      <div class="pp-stempels n${lijst.length}">${stempels}</div>
    </section>`;
  }).join('');

  return `<div class="paspoort">
    <header class="pp-kop">
      <div class="pp-foto">${poppetje(s.avatar)}</div>
      <div>
        <p class="kicker">Paspoort</p>
        <h2>${esc(s.naam || 'Reiziger')}</h2>
        <p class="pp-teller"><strong>${aantal} van ${totaal}</strong> stempels verzameld</p>
      </div>
    </header>
    ${aantal === totaal ? `<div class="pp-klaar"><strong>Je hebt alles gezien: tijd om te kiezen</strong><a class="knop primair" href="#/vergelijk">Naar de vergelijking</a></div>` : ''}
    <div class="pp-paginas">${paginas}${s.jogo ? `<section class="pp-pagina"><h3>Jogo bonito</h3><p class="hand">${s.jogo >= 50 ? 'vijftig keer hoog, goud!' : 'vijfentwintig keer hoog'}</p><div class="pp-stempels"><span class="pp-stempel" style="--kantel:-7deg">${stempel({ vorm: 'rond', motief: 'bal', tekst: 'JOGO BONITO', code: s.jogo >= 50 ? '50+' : '25+', datum: 'HOOGHOUDEN', kleur: s.jogo >= 50 ? '#B8860B' : '#17603A' })}</span></div></section>` : ''}</div>
    <p class="klein">${esc(meta().reisdata)}</p>
  </div>`;
}
