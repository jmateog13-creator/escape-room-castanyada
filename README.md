# El Misteri Musical de la Nit 🎃🌰

Escape room de Música per a 2n i 3r d'ESO, ambientat a la Castanyada i Halloween.
El Bruixot Estornut ha trencat la Melodia de la Nit en 8 segells. Cal recórrer el poble amb el gat Marrameu, superar 8 reptes i obrir el bagul encantat en **50 minuts**.

## Com funciona
- Obriu `index.html`. Primer l'equip escriu els seus **noms** (i, si vol, un nom d'equip): els personatges els faran servir durant la història.
- El mapa del poble té un marcador per a cada repte.
- Cada repte superat dona un **segell** (una lletra o un número). Cal escriure'ls al bagul en ordre (I → VIII).
- **Cada ordinador té segells diferents** (llavor aleatòria desada al navegador): copiar la contrasenya d'un altre grup no serveix. Cada grup ha de jugar sempre al mateix ordinador i navegador.
- Cada repte perdut, cada intent fallit al bagul i cada **pista** (botó 💡, 3 per repte) **resten 1 minut** del rellotge.
- **Final**: si obren el bagul, la Melodia de la Nit torna a sonar; si s'acaba el temps, surt la pantalla «S'ha acabat el temps» i el bruixot es queda la música. En tots dos casos poden veure el seu **diploma** (`diploma.html`), que es pot imprimir o desar en PDF, i el botó **«Tornar a l'inici»** deixa l'ordinador a punt per al grup següent (partida nova i segells nous).
- No es pot copiar, enganxar ni fer captures sense que el bruixot ho vegi.

## Els 8 reptes
| Repte | Lloc | Contingut |
|---|---|---|
| I | La Torre del Rellotge (`teoria.html`) | Nom de les notes en clau de sol, contrarellotge |
| II | La Plaça del Marrameu (`repte_ritmic_marrameu.html`) | Escoltar ritmes i triar la partitura |
| III | La Parada de la Castanyera (`lapsuspoeta.html`) | Vocabulari musical (penjat i lletres desordenades) |
| IV | L'Hort de les Carbasses (`castaween_simon_says.html`) | Simon musical, al final només d'oïda |
| V | El Teatre de la Banda (`relacionar_compositors.html`) | Famílies d'instruments i l'intrús |
| VI | La Biblioteca del Bruixot (`jeroglific_castanyada.html`) | Memory de figures, noms i valors |
| VII | La Cuina del Calder (`halloween_ritmes.html`) | Omplir compassos exactes |
| VIII | La Porta del Bruixot (`endevinalla_notes_halloween.html`) | Duel final: veritat o mite, oïda i lectura |

Cada partida treu el contingut a l'atzar d'un banc més gran. Per ampliar-lo, busqueu el comentari `BANC` (o "Docent") dins de cada fitxer.

## Per al docent
- **Reiniciar una partida**: botó "Reiniciar la partida (docent)" al peu del mapa (genera segells nous).
- **Codi d'equip**: surt al peu del mapa; si un grup canvia d'ordinador, el codi canvia.
- Si el navegador no deixa desar dades (mode privat estricte), la contrasenya és la fixa `1A5OC74W`.
- **Pistes**: es poden canviar a `comu.js` (objecte `PISTES`).
- Fitxers comuns: `comu.js` (so, pentagrama, diàlegs, segells, rellotge, antitrampes) i `comu.css`.
- Il·lustracions a `img/` (generades amb Higgsfield).

AulaTech · L'aula que jugues
