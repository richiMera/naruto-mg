# UI scura "da collezionista": design breve

Data: 2026-11-26. Approvato dall'utente sul mockup (`.superpowers/brainstorm/.../stile-scuro.html`).

## Intento
Rendere il sito più accattivante: oggi è Mantine di base con tabelle, sembra un pannello admin.

## Decisioni
- Solo tema scuro (sfondo #0d0e12, pannelli #15171d, bordi #2a2e39), accento arancione #ff7a1a. Nessun interruttore chiaro/scuro (mia scelta: il mockup approvato è solo scuro).
- Font: Rajdhani per titoli e numeri grandi, Inter per il testo, caricati da Google Fonts.
- Collezione: vista a griglia di carte (predefinita) + vista tabella; scelta ricordata nel browser.
  Bordo colorato per rarità (segreta/ultra oro, super rara viola, rara blu, comune grigio, box/sealed arancione), riflesso olografico animato sulle prime due, inclinazione al passaggio del mouse. Sotto: valore stimato e margine.
- Dashboard: riquadro principale con il saldo dal punto di vista di chi è loggato ("Luca ti deve…", "Devi … a Luca", "Siete pari") e pulsante verso Conti; 4 riquadri grandi; grafico e preordini in arrivo affiancati.
- Telefono: barra di navigazione in basso (Home, Collezione, Preordini, Conti, Altro) e pulsante "+" che apre il nuovo acquisto.
- Vetrina: intestazione grande e la stessa griglia di carte, senza prezzi.
- Nessun logo, personaggio o grafica ufficiale: solo colori e forme.

## Approcci
- **Tema Mantine + un foglio CSS per effetti carta (scelto)**: nessuna nuova dipendenza.
- Libreria di effetti olografici: più resa, ma dipendenza per un effetto che bastano 30 righe di CSS.
- Riscrivere la UI con Tailwind: costo alto, nessun vantaggio su Mantine già in uso.

## Lasciato al builder
Euristica di riconoscimento della rarità dal testo libero; colori segnaposto quando manca l'immagine.
