# Naruto MG

Gestionale privato della collezione: box, sealed, carte singole, acquisti, vendite, preordini, negozi e saldo "chi deve a chi".
Frontend React su GitHub Pages, backend Supabase. Vetrina pubblica in sola lettura su `/#/vetrina`.

## 1. Progetto Supabase

1. Crea un progetto su [supabase.com](https://supabase.com) (piano free).
2. Da terminale, nella cartella del progetto:
   ```bash
   supabase login
   supabase link --project-ref <ref-del-progetto>   # chiede la password del database
   supabase db push                                  # applica le migrazioni in supabase/migrations
   ```
3. **Authentication → Sign In / Providers → Email**: disattiva **Allow new users to sign up**.
4. **Authentication → Users → Add user**: crea i due account (email + password, spunta "Auto confirm").
5. **SQL Editor**: registra i due account come membri (sostituisci le email e i nomi):
   ```sql
   insert into public.members (user_id, display_name)
   select id, 'Riccardo' from auth.users where email = 'tua@email.it';
   insert into public.members (user_id, display_name)
   select id, 'Amico' from auth.users where email = 'sua@email.it';
   ```
6. **Authentication → URL Configuration**: Site URL `https://<utente-github>.github.io/naruto-mg/` (aggiungilo anche ai Redirect URLs).
7. **Project Settings → API**: copia `Project URL` e la chiave `anon` / `publishable`.
   **Mai** usare la chiave `service_role` nel frontend.

## 2. Sviluppo locale

```bash
cp .env.example .env.local     # incolla URL e chiave anon
npm install
npm run dev                    # http://localhost:5173/naruto-mg/
```

Il sito in locale usa lo stesso database del sito online.

## 3. GitHub Pages

1. Crea un repository pubblico `naruto-mg` e fai push del branch `main`.
2. **Settings → Pages → Source**: `GitHub Actions`.
3. **Settings → Secrets and variables → Actions → Variables**: aggiungi
   `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
4. A ogni push su `main` il workflow `.github/workflows/deploy.yml` pubblica il sito.

## Modifiche al database

Aggiungi un nuovo file in `supabase/migrations/` (es. `20270101000001_descrizione.sql`) e lancia `supabase db push`.
Non usare `supabase db reset --linked`: cancellerebbe tutti i dati.

## Note

- Il piano free di Supabase mette in pausa il progetto dopo ~7 giorni senza attività: si riattiva dalla dashboard.
- La sicurezza è nel database (Row Level Security): solo gli utenti presenti in `members` vedono e modificano i dati.
  Chi non ha fatto login può solo chiamare `get_showcase()`, che restituisce dati descrittivi senza prezzi.
- Gli importi sono salvati in centesimi; ripartizioni di spedizione, commissioni e costo box sommano sempre esattamente al totale.
