# JW comitive

App per preparare, ogni mese, l'elenco delle comitive con la casa che ospita
ciascuna, e mandarlo al gruppo WhatsApp come **immagine** — non come link.

## Cos'è

Una Progressive Web App: si apre nel browser del telefono, si installa sulla
schermata Home e da quel momento si comporta come un'app normale, anche senza
connessione. Non ci sono account e non c'è nessun server: i dati restano sul
telefono.

Il giro di ogni mese è questo:

1. si sceglie una volta sola il giorno della settimana delle comitive (di base
   il sabato) e l'app calcola da sola tutte le date del mese che ci cadono,
   quattro o cinque;
2. per ognuna si sceglie la casa con un tocco, dall'elenco di quelle salvate;
3. **Condividi il mese** disegna l'immagine e apre la condivisione del telefono:
   scegliendo WhatsApp arriva la tabella già impaginata, che si vede subito
   nella chat, con l'elenco scritto come didascalia.

## Funzionalità principali

- **Comitive** — un mese alla volta, con le frecce per spostarsi avanti e
  indietro. Ogni data può avere una casa, una nota libera (per esempio
  «ore 20:00, portare le sedie») oppure l'indicazione «Nessuna comitiva».
- **Giorno della settimana** — si cambia dalla pillola sotto al nome del mese o
  dalle Impostazioni, e le date si ricalcolano da sole. Cambiarlo non cancella
  niente: le assegnazioni sono legate alla data esatta, quindi tornando al
  giorno di prima si ritrova tutto com'era.
- **Riempi a rotazione** — assegna in un colpo solo le date ancora vuote,
  facendo girare le case nell'ordine dell'elenco e riprendendo da quella che ha
  ospitato per ultima il mese prima. Le date già compilate non si toccano.
- **Case** — l'elenco delle famiglie che ospitano, con quante volte hanno già
  ospitato e la data dell'ultima volta, per capire a chi tocca.
- **Immagine da condividere** — versione scura o chiara, con il logo, il mese,
  la riga del gruppo e una riga per ogni data. In alternativa si può salvare
  l'immagine o copiare solo il testo.
- **Copia di sicurezza** — esportazione e importazione di un file con tutti i
  dati, dalle Impostazioni.

## Privacy e dati

Tutto è salvato in `localStorage`, cioè dentro il browser del telefono. Niente
viene inviato a nessun server: l'unica cosa che esce dall'app è l'immagine, e
solo quando sei tu a condividerla. Disinstallando l'app o cancellando i dati del
browser i dati spariscono, e per questo conviene esportare ogni tanto il file di
backup dalle Impostazioni.

## Tecnologie

HTML, CSS e JavaScript senza librerie né passaggi di compilazione. Gli script
sono classici (non moduli ES) apposta: così l'app funziona anche aperta con un
doppio click su `index.html`.

L'immagine da condividere è disegnata su un `<canvas>` e trasformata in un file
JPEG vero, che viene passato al sistema con la Web Share API
(`navigator.share({ files: [...] })`). È questo che fa arrivare su WhatsApp una
foto e non un collegamento.

## Come avviarla in locale

```bash
python serve.py
```

Poi apri `http://localhost:5530/`. Il server di sviluppo manda
`Cache-Control: no-store` e in locale il service worker viene disattivato
apposta: così le modifiche si vedono subito, senza svuotare nessuna cache.

## Struttura del progetto

```
index.html               la pagina unica, con la barra in alto e quella in basso
manifest.webmanifest     nome, icone e colori per l'installazione sul telefono
sw.js                    service worker: fa funzionare l'app anche offline
css/styles.css           tutto lo stile
js/dates.js              calcolo delle date, nomi dei mesi e dei giorni
js/state.js              dati, giorno scelto, rotazione delle case, backup
js/components.js         avvisi, pannelli dal basso, richieste di conferma
js/share-card.js         disegno della locandina e consegna a WhatsApp
js/router.js             le tre schermate
js/views/mese.js         schermata delle comitive e condivisione
js/views/case.js         elenco delle case
js/views/impostazioni.js impostazioni e copia di sicurezza
js/pwa-shell.js          guscio comune alle app "My" (aggiornamenti, offline)
icons/                   icone dell'app e logo grande usato sulla locandina
serve.py                 server di sviluppo locale, senza cache
tools/make_icons.py      rigenera tutte le icone
```

## Cambiare il logo

Le icone attuali sono disegnate dallo script. Per usare il file originale:

1. salva l'immagine in `tools/logo-source.png`;
2. lancia:

```bash
python tools/make_icons.py
```

Lo script ritaglia l'immagine in quadrato e rigenera tutte le misure, compreso
`icons/logo-1024.png`, che è quello che compare in cima all'immagine condivisa.

## Pubblicare gli aggiornamenti

L'app è pensata per stare su GitHub Pages. **A ogni pubblicazione va alzato il
numero di versione in cima a `sw.js`** (`CACHE_VERSION`): è quel cambiamento che
fa accorgere il browser che c'è una versione nuova e fa comparire l'avviso
«Nuova versione disponibile». Se aggiungi o rinomini un file, va aggiornato
anche l'elenco `SHELL_ASSETS`: se un file dell'elenco non esiste, il service
worker non si installa affatto.
