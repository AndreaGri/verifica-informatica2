# verifica-informatica2

Torrent Sharing Platform (SPA)
Una piattaforma web moderna per la condivisione di file torrent, sviluppata con un'architettura Single Page Application (SPA). Il backend è gestito da Python/Flask con database MongoDB, mentre il frontend è realizzato in JavaScript Vanilla (senza framework esterni).

✨ Funzionalità Principali
Autenticazione: Registrazione e Login utenti.

Ricerca Avanzata: Filtri per testo, categoria e ordinamento (Data/Dimensione).

Upload: Caricamento di nuovi file torrent con metadati.

Social: Sistema di commenti e valutazioni (1-5 stelle).

Moderazione: Ruoli speciali (Moderator/Admin) per bannare utenti e cancellare contenuti.

Dashboard Admin: Statistiche grafiche sui download e categorie popolari.

🏗️ Struttura del Progetto
Il progetto è unificato: il server Flask gestisce sia le API REST che il servizio dei file statici (Frontend).

Plaintext

/ (root)
├── app.py                 # SERVER PRINCIPALE (Backend + Web Server)
├── create_roles.py        # Script per creare Admin e Moderatori
├── requirements.txt       # Lista dipendenze Python
├── README.md              # Documentazione
└── frontend/              # Cartella Frontend (File Statici)
    ├── index.html         # Struttura HTML (SPA Container)
    ├── css/
    │   └── styles.css     # Stili e Layout
    └── js/
        ├── api.js         # Configurazione chiamate HTTP (Fetch)
        └── app.js         # Logica SPA, Router e gestione DOM
⚙️ Configurazione e Installazione
1. Prerequisiti
Assicurati di avere installato:

Python 3.8 o superiore

Un account su MongoDB Atlas (o un'istanza locale di MongoDB).

2. Installazione Dipendenze
Apri il terminale nella cartella del progetto ed esegui:

Bash

pip install flask flask-pymongo flask-cors dnspython
3. Configurazione Database
Apri il file app.py e cerca la sezione MONGO_URI. Inserisci la tua stringa di connessione fornita da MongoDB Atlas:

Python

# In app.py
app.config["MONGO_URI"] = (
    "mongodb+srv://tuo_utente:LA_TUA_PASSWORD@cluster0.mongodb.net/Torrent_Sharing?retryWrites=true&w=majority"
)
Nota: Se la password contiene caratteri speciali, usa urllib.parse.quote_plus come mostrato nel codice.

4. Configurazione Frontend
Apri il file frontend/js/api.js. Poiché Frontend e Backend girano sulla stessa porta, usa il percorso relativo:

JavaScript

// In frontend/js/api.js
const API_BASE = "/api";
🚀 Avvio e Utilizzo
1. Creazione Ruoli Admin (Primo Avvio)
Per accedere alle funzioni di moderazione e statistiche, devi creare gli utenti speciali. Modifica il file create_roles.py inserendo la tua password del DB ed eseguilo una volta sola:

Bash

python create_roles.py
Questo creerà gli utenti: admin@test.com e mod@test.com.

2. Avviare il Server
Esegui il server principale:

Bash

python app.py
Il server partirà sulla porta 5001.

3. Accesso al Sito
In Locale: Apri il browser su http://127.0.0.1:5001

Su GitHub Codespaces:

Vai nel tab PORTS.

Assicurati che la porta 5001 sia impostata su Visibility: Public.

Clicca sull'icona del mappamondo ("Open in Browser").

📖 Guida all'Uso
Per Utenti Normali
Registrati tramite l'apposito link in alto.

Carica un torrent inserendo Titolo, Descrizione, Categoria e Dimensione.

Cerca i file usando la barra di ricerca o i filtri per categoria.

Scarica i file e lascia Commenti/Voti.

Per Moderatori
Effettua il login con l'utente moderatore (es. mod@test.com).

Nei commenti dei torrent, vedrai il pulsante BANNA (nero) accanto agli utenti.

Se un utente è già bannato, vedrai il pulsante SBANNA (verde).

Per Amministratori
Effettua il login con l'utente admin (es. admin@test.com).

Clicca sul link Stats nella barra di navigazione.

Visualizza i grafici:

Classifica Top 5 Download.

Distribuzione Categorie.

Nuovi file caricati nell'ultima settimana.