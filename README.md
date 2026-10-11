# Vriendenvakantie 2027

Een statische site waarmee de groep zelf ontdekt en kiest waar de vakantie heen gaat. Geen build-stap: gewoon HTML, CSS en JavaScript. Alle inhoud staat in `vakantie-data.json`.

## Lokaal bekijken

```
python3 -m http.server 8765
```

Open daarna http://127.0.0.1:8765. Rechtstreeks het bestand `index.html` openen werkt niet, omdat de browser de JSON dan niet mag laden.

## Inhoud aanpassen

Alles wat je op de site leest, komt uit `vakantie-data.json`. Na een wijziging ververs je de pagina.

**Een plek toevoegen.** Kopieer een bestaand blok in `opties` en pas het aan. Geef het een eigen `id` (kleine letters, geen spaties) en zet bij `land` exact dezelfde naam als de sleutel in `meta.landen`. De plek verschijnt vanzelf als mysterievlucht achter de gate van dat land.

**Een huis toevoegen.** Voeg een blok toe aan `huizen` van de plek. Het eerste huis in de lijst is altijd de sterkste keuze en bepaalt het bedrag per persoon op het vertrekbord. `kosten_pp` is het totaal per volwassene; de site rekent zelf het huisdeel uit (`prijs_totaal` gedeeld door het aantal volwassenen uit `meta.groep_indeling`).

**De rol van een huis.** `rol` is het label op de huiskaart en mag elke tekst zijn. Begint hij met "Sterkste keuze", "Luxe-variant" of "Tip uit de groep", dan krijgt het huis het bijbehorende label (luxe-varianten met een gouden rand en een ster, tips met een praatwolkje). Alles daarbuiten telt als gewoon alternatief.

**Kenmerken van een huis.** Elk huis heeft `kenmerken` met ja/nee-waarden (wieg, kinderstoel, omheind, airco, zwembad_verwarmd, zeezicht, strand_loopafstand, speeltuin, bbq, buiten_eten, wellness). De namen en de toelichting staan in `meta.huiskenmerken`. Wat op `false` staat of ontbreekt, wordt niet getoond. Een nieuw kenmerk voeg je toe aan `meta.huiskenmerken.lijst`; het verschijnt dan vanzelf als filter in "Alle huizen" (zonder eigen tekening krijgt het een standaardicoon uit `js/icons.js`).

**Alle huizen.** De weergave "Alle huizen" (vanuit de vertrekhal en de vergelijking) toont elk huis uit de JSON met filters, sorteren, een kaart en twee tot vier huizen naast elkaar. Er hoeft niets voor ingesteld te worden.

**Medailles.** `meta.medailles` bepaalt bij welk record op een plek je brons, zilver en goud krijgt (`vanaf`) en in welke kleur de rand om de stempel komt. Pas de getallen aan als het te makkelijk of te moeilijk blijkt.

**Een land toevoegen.** Voeg het toe aan `meta.landen` met `welkom`, `intro`, `kleuren` (basis, licht, accent), `patroon`, `motieven`, `pils` en `stekker`. Het patroon wordt gekozen op een trefwoord in `patroon`: azulejo, weef, ster, dambord, bloem of iznik, strepen of luzzu, meander, majolica of citroen. Zonder trefwoord krijgt het land stippen. De motieven en stempelmotieven die een tekening hebben staan in `js/motifs.js`; een onbekend motief wordt overgeslagen.

**Een maatschappij toevoegen.** Voeg een blok toe aan `meta.carriers` met `romp`, `staart`, `motor` en `streep` (en eventueel `buik`), en verwijs ernaar met `carrier` in de optie.

**De poppetjes.** `meta.groep_figuren.lijst` beschrijft de groep zonder namen: haar, haarkleur, huid, kleding, bril en baard. De mogelijke waarden staan in de toelichting in de JSON.

## Twee talen

De site is in het Nederlands en het Engels, te wisselen met de knop rechtsboven.

- Interfaceteksten staan in de code als `t('Nederlands', 'English')`.
- De Engelse inhoud staat in `vakantie-data.en.json`: een platte lijst van pad naar tekst, bijvoorbeeld `"opties.sintra.tagline": "..."`. Voeg je in het Nederlands iets toe of wijzig je een tekst, zet dan de vertaling onder hetzelfde pad. Wat daar ontbreekt, blijft in de Engelse versie gewoon Nederlands.
- Prijzen, scores en andere getallen staan alleen in `vakantie-data.json`.

## Namen

De voornamen onder de poppetjes staan in `meta.groep_figuren.namen_code`, in de volgorde van `meta.groep_figuren.lijst`. Ze zijn gecodeerd, zodat ze niet als leesbare tekst in deze openbare repository staan en dus niet via een zoekmachine te vinden zijn. Het is geen beveiliging: wie de site opent, ziet de namen gewoon.

Een nieuwe code maak je in de console van de browser:

```js
btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(['Naam 1', 'Naam 2'])))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
```

Zet de uitkomst in `namen_code`. Dezelfde code achter de link (`?wie=CODE`) gaat voor op wat in de JSON staat. Alles wat iemand kiest (poppetje, koffer, top 3, records) blijft in de eigen browser.

## Opnieuw publiceren

```
git add -A
git commit -m "Wat je hebt aangepast"
git push
```

GitHub Pages zet de nieuwe versie binnen een paar minuten online.

## Link-voorvertoning en icoon

`og.jpg` is het plaatje dat WhatsApp en andere apps bij de link tonen; `apple-touch-icon.png` en de twee `icoon-*.png` zijn het icoon op het beginscherm. De titel en tekst van de voorvertoning staan bovenin `index.html` (de `og:`-regels), samen met het volledige adres van de site. Verhuist de site naar een ander adres, pas dat adres daar dan aan.

## Goed om te weten

- De kaart gebruikt de tegels van OpenStreetMap. CartoDB Voyager vraagt tegenwoordig een API-sleutel.
- De huisfoto's worden rechtstreeks van Airbnb geladen; verdwijnt een advertentie, dan toont de site een nette lege plek.
- Vluchtprijzen en kosten per persoon zijn indicaties. De bronnen staan onder "Hoe is dit onderzocht?".
