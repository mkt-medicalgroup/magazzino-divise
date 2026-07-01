# Magazzino Divise

App per gestire carico/scarico delle divise dipendenti: catalogo articoli (tipologia,
colore, genere, taglia), registro movimenti, giacenze in tempo reale, elenco
dipendenti per sede con storico assegnazioni. Login con utente e password.

Tecnologie: **React + Vite** (frontend, pubblicato su GitHub Pages) e
**Supabase** (database + autenticazione, gratuito, sempre attivo — non si "spegne"
come alcuni hosting gratuiti).

---

## 1. Crea il progetto Supabase (5 minuti)

1. Vai su [supabase.com](https://supabase.com) → crea un account gratuito → **New project**.
2. Scegli nome, password del database (salvala, non serve per l'app ma per l'accesso admin) e regione (es. Europa).
3. Attendi che il progetto sia pronto (1-2 minuti).
4. Vai su **SQL Editor** (menu a sinistra) → **New query**.
5. Apri il file `supabase/schema.sql` di questo progetto, copia tutto il contenuto, incollalo nell'editor e premi **Run**.
   Questo crea tutte le tabelle (sedi, dipendenti, articoli, movimenti), la vista delle giacenze e le regole di sicurezza.
6. Vai su **Project Settings** (icona ingranaggio) → **API**. Copia:
   - **Project URL**
   - **anon public key**

   Ti serviranno al passo 3.

## 2. Crea gli utenti operatori (chi può accedere all'app)

1. Nel progetto Supabase vai su **Authentication** → **Users** → **Add user** → **Create new user**.
2. Come email puoi usare un indirizzo vero oppure, se preferisci username semplici,
   un formato come `mario@magazzino.local` (non serve che il domino esista davvero:
   serve solo come identificativo di accesso).
3. Imposta una password. Spunta **Auto Confirm User** così l'utente può accedere subito senza email di verifica.
4. Ripeti per ogni operatore che deve poter usare l'app (es. un utente per sede, o un utente unico condiviso).

> Suggerimento: se in futuro vuoi che ogni sede veda/gestisca solo i propri movimenti,
> si può aggiungere una tabella "profili" che collega ogni utente a una sede e
> restringere le policy di sicurezza di conseguenza. L'app attuale è pensata per
> operatori che gestiscono tutto il magazzino centralmente.

## 3. Configura il progetto in locale

1. Installa [Node.js](https://nodejs.org) (versione 18 o superiore) se non lo hai già.
2. Nella cartella del progetto, crea un file chiamato `.env` (copia `.env.example` e rinominalo)
   e inserisci i valori copiati al passo 1:

   ```
   VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
   VITE_SUPABASE_ANON_KEY=la-tua-anon-key-pubblica
   ```

3. Apri il terminale nella cartella del progetto ed esegui:

   ```
   npm install
   npm run dev
   ```

4. Apri il link mostrato (di solito `http://localhost:5173`) e prova ad accedere con
   uno degli utenti creati al passo 2.

## 4. Pubblica su GitHub Pages

1. Crea un nuovo repository su GitHub (es. `magazzino-divise`) e carica tutti i file di questo progetto
   (**tranne** `node_modules`, `dist` e `.env`, che sono già esclusi da `.gitignore`).

   ```
   git init
   git add .
   git commit -m "Primo commit"
   git branch -M main
   git remote add origin https://github.com/TUO-UTENTE/magazzino-divise.git
   git push -u origin main
   ```

2. Apri `vite.config.js` e imposta il campo `base` con il nome del tuo repository, ad esempio:

   ```js
   base: '/magazzino-divise/',
   ```

3. Installa il pacchetto per la pubblicazione (se non già installato con `npm install`) e pubblica:

   ```
   npm run deploy
   ```

   Questo comando compila l'app e la pubblica sul branch `gh-pages` del repository.

4. Su GitHub vai in **Settings** → **Pages** del repository → in "Build and deployment"
   seleziona come source il branch **gh-pages**. Dopo un minuto il sito sarà visibile a:

   ```
   https://TUO-UTENTE.github.io/magazzino-divise/
   ```

> **Nota sulle variabili d'ambiente**: il file `.env` non viene mai caricato su GitHub
> (è escluso volutamente, perché contiene informazioni collegate al tuo progetto).
> Il comando `npm run deploy` legge il file `.env` presente **sul tuo computer** al
> momento della build e incorpora quei valori nel sito pubblicato — è normale e
> corretto per questo tipo di app, perché la chiave "anon" di Supabase è pensata per
> essere pubblica (la sicurezza vera è garantita dal login e dalle regole del database,
> non dal nascondere questa chiave).

## 5. Uso quotidiano

- **Giacenze**: mostra la scorta attuale per ogni combinazione tipologia/colore/genere/taglia,
  con filtri e segnalazione delle scorte sotto la soglia minima impostata.
- **Movimenti**: qui si registra ogni carico (arrivo dal fornitore) o scarico (assegnazione
  a un dipendente). Il database calcola automaticamente la giacenza e blocca gli scarichi
  se i pezzi disponibili non sono sufficienti.
- **Catalogo articoli**: qui si crea ogni combinazione unica di tipologia, colore, genere,
  taglia. Il codice articolo (es. `CAS-BLU-U-M`) viene generato automaticamente.
- **Dipendenti**: elenco diviso per sede, con possibilità di aggiungere sedi e dipendenti,
  e di consultare lo storico delle divise assegnate a ciascuno.

## Struttura del progetto

```
supabase/schema.sql   → schema del database da eseguire su Supabase
src/pages/             → le 4 schermate principali (Giacenze, Movimenti, Articoli, Dipendenti)
src/components/        → sidebar di navigazione e "cartellino" articolo riutilizzabile
src/lib/AuthContext.jsx → gestione sessione di login
```

## Perché non si "spegne"

- **GitHub Pages** è hosting statico gratuito e permanente: il sito resta online senza limiti di tempo.
- **Supabase** (piano gratuito) mette in pausa solo i progetti completamente inattivi per
  più di una settimana — è sufficiente usare l'app almeno una volta ogni pochi giorni
  per restare sempre attivi, oppure passare al piano a pagamento (economico) se serve
  la massima continuità senza pensarci.
