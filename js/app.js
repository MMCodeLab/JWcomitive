// app.js — l'avvio. Carica i dati salvati, collega il guscio comune delle
// app "My" (avviso di nuova versione, avviso offline, promemoria del backup)
// e disegna la prima schermata.

(function () {

window.APP_VERSION = '1.0';

State.load();

if (window.PwaShell) {
  PwaShell.configure({
    hasData: () => State.hasData(),
    onBackupRequest: () => Router.go('#/impostazioni'),
  });
}

// I link della barra in basso cambiano solo l'indirizzo: il router fa il resto.
Router.start();

})();
