# JW comitive

App per preparare, ogni mese, l'elenco dei sabati con la casa che ospita la
comitiva, e mandarlo al gruppo WhatsApp come **immagine** — non come link.

## Cos'è

Una Progressive Web App: si apre nel browser del telefono, si installa sulla
schermata Home e da quel momento si comporta come un'app normale, anche senza
connessione. Non ci sono account e non c'è nessun server: i dati restano sul
telefono.

Il giro di ogni mese è questo:

1. l'app calcola da sola tutti i sabati del mese (sono quattro o cinque);
2. per ognuno si sceglie la casa con un tocco, dall'elenco di quelle salvate;
3. **Condividi il mese** disegna l'immagine e apre la condivisione del telefono:
   scegliendo WhatsApp arriva la tabella già impaginata, che si vede subito
   nella chat, con l'elenco scritto come didascalia.

## Funzionalità principali

- **Sabati** — un mese alla volta, con le frecce per spostarsi avanti e
  indietro. Ogni sabato può avere una casa, una nota libera (per esempio
  «ore 20:00, portare le sedie») oppure l'indicazione «Nessuna comitiva».
- **Riempi a rotazione** — assegna in un colpo solo i sabati ancora vuoti,
  facendo girare le case nell'ordine dell'elenco e riprendendo da quella che ha
  ospitato per ultima il mese prima. I sabati già compilati non si toccano.
- **Case** — l'elenco delle famiglie che ospitano, con quante volte hanno già
  ospitato e la data dell'ultima volta, per capire a chi tocca.
- **Immagine da condividere** — versione scura o chiara, con il logo, il mese,
  la riga del gruppo e una riga per ogni sabato. In alternativa si può salvare
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
python -m http.server 5530
```

Poi apri `http://localhost:5530/`. In locale il service worker viene disattivato
apposta, così le modifiche si vedono subito senza svuotare le cache.

## Struttura del progetto

```
index.html               la pagina unica, con la barra in alto e quella in basso
manifest.webmanifest     nome, icone e colori per l'installazione sul telefono
sw.js                    service worker: fa funzionare l'app anche offline
css/styles.css           tutto lo stile
js/dates.js              calcolo dei sabati e nomi dei mesi
js/state.js              dati, salvataggio, rotazione delle case, backup
js/components.js         avvisi, pannelli dal basso, richieste di conferma
js/share-card.js         disegno della locandina e consegna a WhatsApp
js/router.js             le tre schermate
js/views/mese.js         schermata dei sabati e condivisione
js/views/case.js         elenco delle case
js/views/impostazioni.js impostazioni e copia di sicurezza
js/pwa-shell.js          guscio comune alle app "My" (aggiornamenti, offline)
icons/                   icone dell'app e logo grande usato sulla locandina
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
