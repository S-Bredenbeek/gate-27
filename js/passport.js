// Het paspoort: een pagina per land met de verzamelde stempels, schuin en half over elkaar.

import { meta, opties, land, landNaam, esc } from './data.js';
import { staat } from './store.js';
import { poppetje } from './avatar.js';
import { thema } from './patterns.js';
import { stempel, kanteling } from './stamps.js';
import { isGoud, GOUD as GOUD_DOEL } from './game.js';
import { t } from './i18n.js';

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
      ? `<a class="pp-stempel${isGoud(o.id) ? ' goud' : ''}" href="#/b/${esc(o.id)}" style="--kantel:${kanteling(o.id)}deg" aria-label="${t(`Stempel van ${esc(o.naam)}: bekijk deze bestemming`, `Stamp from ${esc(o.naam)}: view this destination`)}">${stempel(o.stempel)}</a>`
      : `<span class="pp-leeg" aria-label="${t('Nog niet ontdekt', 'Not discovered yet')}">?</span>`)).join('');
    return `<section class="pp-pagina${bekend ? '' : ' onbekend'}" style="${bekend ? thema(lijst[0]) : ''}">
      <h3>${bekend ? esc(landNaam(naam)) : t('Nog geheim', 'Still secret')}</h3>
      <p class="hand">${bekend ? esc(l.welkom) : t('hier moet je nog heen', 'you still need to go here')}</p>
      <div class="pp-stempels n${lijst.length}">${stempels}</div>
    </section>`;
  }).join('');

  return `<div class="paspoort">
    <header class="pp-kop">
      <div class="pp-foto">${poppetje(s.avatar)}</div>
      <div>
        <p class="kicker">${t('Paspoort', 'Passport')}</p>
        <h2>${esc(s.naam || t('Reiziger', 'Traveller'))}</h2>
        <p class="pp-teller">${t(`<strong>${aantal} van ${totaal}</strong> stempels verzameld`, `<strong>${aantal} of ${totaal}</strong> stamps collected`)}</p>
        <p class="pp-teller goudteller">${t(`${opties().filter((o) => isGoud(o.id)).length} met een gouden rand (houd er ${GOUD_DOEL} keer hoog)`, `${opties().filter((o) => isGoud(o.id)).length} with a golden rim (do ${GOUD_DOEL} keepy-uppies there)`)}</p>
      </div>
    </header>
    ${aantal === totaal ? `<div class="pp-klaar"><strong>${t('Je hebt alles gezien: tijd om te kiezen', "You've seen it all: time to choose")}</strong><a class="knop primair" href="#/vergelijk">${t('Naar de vergelijking', 'To the comparison')}</a></div>` : ''}
    <div class="pp-paginas">${paginas}${s.jogo ? `<section class="pp-pagina"><h3>Jogo bonito</h3><p class="hand">${s.jogo >= 50 ? t('vijftig keer hoog, goud!', 'fifty keepy-uppies, gold!') : t('vijfentwintig keer hoog', 'twenty-five keepy-uppies')}</p><div class="pp-stempels"><span class="pp-stempel" style="--kantel:-7deg">${stempel({ vorm: 'rond', motief: 'bal', tekst: 'JOGO BONITO', code: s.jogo >= 50 ? '50+' : '25+', datum: t('HOOGHOUDEN', 'KEEPY-UPPIES'), kleur: s.jogo >= 50 ? '#B8860B' : '#17603A' })}</span></div></section>` : ''}</div>
    <p class="klein">${esc(meta().reisdata)}</p>
  </div>`;
}
