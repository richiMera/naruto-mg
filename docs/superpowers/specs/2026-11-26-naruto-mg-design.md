# naruto-mg: design

Data: 2026-11-26

## Intento

Un gestionale privato per due amici che condividono una collezione di carte collezionabili (linea Naruto, ma il modello è generico). Serve a sapere cosa possiedono (box, prodotti sealed, carte singole), quanto hanno speso, quanto hanno incassato rivendendo, quali preordini sono aperti e presso quali negozi, e **chi deve soldi a chi**.

Il sito è ospitato gratis su GitHub Pages. Tutto il lato operativo (prezzi, movimenti, saldo) è visibile solo ai due membri dopo il login. Esiste una **vetrina pubblica** che mostra solo cosa c'è nella collezione, senza alcun dato economico.

## Obiettivi

- Inventario comune di box, sealed e carte singole, con stato (posseduto, in vendita, venduto, aperto).
- Catalogo carte e prodotti che si riempie da solo: la prima volta si inserisce a mano, poi si cerca.
- Acquisti con più righe e spedizione ripartita sul costo reale di ogni pezzo.
- Apertura box: registrare le carte uscite e ripartire il costo della box su di esse.
- Vendite con commissioni piattaforma e spedizione → margine reale per pezzo.
- Preordini per negozio, con acconto/saldo, data prevista e stato; all'arrivo diventano articoli in inventario.
- Anagrafica negozi (online/fisici).
- Registro movimenti di denaro con chi ha pagato/incassato e ripartizione (50/50 predefinito, modificabile). Saldo "chi deve a chi" sempre aggiornato; i rimborsi lo azzerano.
- Valore di mercato stimato inserito a mano, con storico.
- Dashboard: saldo tra i due, speso/incassato per persona, P&L comune, valore stimato della collezione.
- Wishlist con prezzo obiettivo.
- Foto degli articoli.
- Esportazione CSV di inventario e movimenti.
- Vetrina pubblica in sola lettura.

## Non obiettivi (v1)

- Prezzi di mercato automatici (API Cardmarket/eBay ecc.): il valore si inserisce a mano.
- Valute diverse dall'euro.
- App mobile nativa (il sito deve però essere usabile da telefono).
- Più di due utenti attivi (il modello lo permette, ma non c'è gestione inviti/ruoli).
- Sincronizzazione con piattaforme di vendita.

## Anti-obiettivi (sarebbe un fallimento anche se "funziona")

- Qualunque prezzo, movimento o saldo leggibile senza login, inclusa la vetrina.
- La chiave `service_role` di Supabase nel repo o nel bundle.
- Un saldo tra i due che non torna con i movimenti registrati.
- Inserire una carta deve essere rapido: se è più lento di un foglio Excel, non verrà usato.

## Vincoli

- Hosting: GitHub Pages, repo pubblico, base path `/naruto-mg/`. Nessun server proprio.
- Backend: Supabase (piano gratuito: Postgres, Auth, Storage). Il progetto va in pausa dopo ~7 giorni di inattività; accettato.
- Sicurezza interamente nel database tramite RLS; il frontend usa solo la chiave `anon`/`publishable`.
- Interfaccia in italiano.

## Approcci considerati

| Approccio | Pro | Contro |
|---|---|---|
| **A. Vite + React + TS, UI su misura (scelto)** | Controllo totale sui flussi particolari (apertura box, ripartizioni, saldo) | Più codice per tabelle/form base |
| B. React + Refine/React-Admin | CRUD quasi automatici | Aspetto da pannello admin; i flussi su misura vanno scritti comunque, attrito col framework |
| C. Next.js export statico | — | Su Pages perde SSR/API, nessun vantaggio |

Scelto **A** dall'utente: il valore del progetto è nei flussi su misura.

## Decisioni prese con l'utente

- React (approccio A).
- Collezione **unica e comune**; tracciamento di chi ha pagato e saldo tra i due.
- Catalogo che si riempie da solo.
- Vetrina pubblica sì, senza dati economici.

## Stack (mia scelta, approvata con l'approccio A)

- Vite + React + TypeScript.
- Mantine (componenti, form, tabelle, date, grafici via `@mantine/charts`).
- React Router in modalità hash (`/#/...`) per evitare problemi di routing su Pages.
- TanStack Query per fetch/cache/mutazioni.
- `@supabase/supabase-js`; tipi generati con `supabase gen types`.
- Migrazioni SQL versionate in `supabase/migrations/`, applicate con Supabase CLI.
- Deploy: GitHub Actions (build → `actions/deploy-pages`) a ogni push su `main`. `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` come variabili del repository.

## Autenticazione e sicurezza

- Login email + password (Supabase Auth). Registrazioni pubbliche **disattivate**; i due account si creano dalla dashboard Supabase.
- Tabella `members (user_id → auth.users, display_name)`.
- Funzione `private.is_member()` `security definer`, `stable`, che verifica `auth.uid()` in `members`. Lo schema `private` non è esposto dall'API.
- Ogni tabella operativa: RLS attiva, policy `to authenticated using ((select private.is_member())) with check ((select private.is_member()))`. Nessun grant/policy per `anon`.
- Vetrina: funzione RPC `public.get_showcase()` `security definer`, eseguibile da `anon`, che restituisce **solo** colonne descrittive (tipo, nome, set, numero, rarità, condizione, foto) degli articoli con `showcase = true` e stato non `sold`. Nessun accesso diretto di `anon` alle tabelle.
- Redirect URL di Auth configurato su `https://<utente>.github.io/naruto-mg/`.

## Modello dati

Importi in **centesimi interi** (`bigint`), sempre EUR. Date con `date`, timestamp con `timestamptz`. Chiavi `uuid` (default `gen_random_uuid()`). Indici su tutte le FK e sulle colonne di ricerca del catalogo (trigram su `name`).

**Catalogo**
- `catalog_cards`: game, set_code, set_name, number, name, rarity, variant, image_url. Unico su (game, set_code, number, variant).
- `catalog_products`: game, name, product_type (`box`, `booster`, `starter`, `bundle`, `other`), set_code, image_url.
- Nel form di inserimento: campo di ricerca; se non trova nulla, "crea nuova" inserisce nel catalogo e collega l'articolo.

**Inventario**
- `items`: kind (`box`, `sealed`, `card`), catalog_card_id / catalog_product_id (uno dei due, vincolo check), status (`owned`, `for_sale`, `sold`, `opened`), condition, language, grading_company, grade, opened_from_item_id (carta uscita da quale box), showcase (bool, default false), photo_path, notes, created_at.
- Un record per copia fisica (niente quantità): rende esatti costo e margine per pezzo. L'interfaccia permette "aggiungi N copie".
- `item_valuations`: item_id, valued_on, value_cents, source (testo libero). Il valore attuale è l'ultima valutazione.

**Negozi**
- `stores`: name, kind (`online`, `fisico`), url, city, notes.

**Acquisti**
- `purchases`: store_id (nullable per privati), purchased_on, shipping_cents, notes.
- `purchase_lines`: purchase_id, item_id, price_cents.
- Costo per pezzo = price_cents + quota spedizione proporzionale al prezzo (calcolato in una view).

**Apertura box**
- La box passa a `opened`; le carte uscite sono nuovi `items` con `opened_from_item_id`.
- Costo per carta: il costo della box viene ripartito in parti uguali tra le carte uscite (mia scelta: semplice e prevedibile). Il ROI della box = valore stimato delle carte uscite − costo box.

**Preordini**
- `preorders`: store_id, catalog_product_id, description, quantity, total_cents, expected_on, status (`ordinato`, `arrivato`, `ritirato`, `annullato`), notes.
- Pagamenti (acconto, saldo) sono movimenti collegati al preordine.
- Azione "segna arrivato": crea gli `items` e un `purchase` collegato al preordine, senza duplicare i movimenti già registrati.

**Vendite**
- `sales`: sold_on, platform (`cardmarket`, `ebay`, `vinted`, `diretto`, `altro`), buyer_note, fees_cents, shipping_cents.
- `sale_lines`: sale_id, item_id, price_cents. L'articolo passa a `sold`.
- Margine per pezzo = prezzo − quota commissioni/spedizione − costo per pezzo.

**Movimenti di denaro e saldo**
- `money_movements`: occurred_on, kind (`purchase`, `preorder_payment`, `sale`, `expense`, `settlement`), amount_cents (> 0), member_id (chi ha pagato, o chi ha incassato per `sale`), counterpart_member_id (solo per `settlement`: chi riceve il rimborso), purchase_id / preorder_id / sale_id (nullable), description.
- `movement_shares`: movement_id, member_id, share_bp (punti base, somma 10000 per movimento, verificata da trigger/funzione). Default 50/50 creato dall'interfaccia. Non usata per `settlement`.
- Saldo (view `member_balances`): per ogni membro, Σ(pagato) − Σ(quota delle spese) − Σ(incassato) + Σ(quota degli incassi) ± rimborsi. Due membri → "X deve a Y € N".
- I movimenti `purchase`/`sale` si creano insieme all'acquisto/vendita (stesso form, chi ha pagato/incassato e ripartizione), tramite funzione RPC transazionale.

**Wishlist**
- `wishlist`: catalog_card_id / catalog_product_id / free_text, target_price_cents, priority, notes.

**Storage**
- Bucket `item-photos` pubblico in lettura (percorsi con uuid, non indovinabili), scrittura solo membri via policy Storage. Mia scelta: serve per la vetrina; le foto non contengono dati economici.

## Schermate

- **Login**
- **Dashboard**: saldo tra i due, speso/incassato per persona, P&L, valore stimato, preordini in arrivo nei prossimi 30 giorni.
- **Collezione**: tabella filtrabile (tipo, stato, set, rarità, in vetrina), dettaglio articolo con costo, valutazioni, storia.
- **Catalogo**: ricerca/modifica voci.
- **Acquisti**: elenco + nuovo acquisto multi-riga.
- **Apertura box**: dalla scheda box, inserimento rapido delle carte uscite.
- **Vendite**: elenco + nuova vendita con margine calcolato.
- **Preordini**: elenco per stato/data, azione "arrivato".
- **Negozi**: anagrafica, con preordini e acquisti per negozio.
- **Conti**: registro movimenti, saldo, "registra rimborso".
- **Wishlist**
- **Vetrina pubblica** (`/#/vetrina`): griglia foto, nessun login.
- Esportazione CSV da Collezione e Conti.

## Lasciato al builder

- Struttura delle cartelle e dei componenti, stile visivo dentro Mantine.
- Nomi esatti di funzioni/view, purché rispettino le regole di sicurezza sopra.
- Test: test delle policy RLS (anon non legge nulla; membro sì; non-membro autenticato no) e test del calcolo saldo sono obbligatori; per il resto a discrezione.
- Ordine di implementazione (suggerito: auth + RLS → catalogo/inventario → acquisti/movimenti/saldo → vendite → preordini/negozi → apertura box → dashboard → vetrina → wishlist/CSV).
