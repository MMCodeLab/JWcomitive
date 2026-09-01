// dates.js — tutto quello che riguarda il calendario.
//
// Le date sono sempre trattate come "date locali senza orario": la chiave di
// un giorno e' la stringa 'AAAA-MM-GG' costruita a mano e non con toISOString(),
// che convertirebbe in UTC e in Italia farebbe scivolare il giorno indietro.
//
// I giorni della settimana seguono la numerazione di JavaScript: 0 e' domenica
// e 6 e' sabato. Le comitive si tengono di sabato salvo diversa scelta, ma
// l'app funziona con qualsiasi giorno.

(function () {

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

const GIORNI = ['Domenica', 'Lunedì', 'Martedì', 'Mercoledì', 'Giovedì', 'Venerdì', 'Sabato'];
const GIORNI_BREVI = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];

// "del sabato" ma "della domenica": la preposizione segue il genere.
const GIORNI_DEL = [
  'della domenica', 'del lunedì', 'del martedì', 'del mercoledì',
  'del giovedì', 'del venerdì', 'del sabato',
];

const SABATO = 6;

function pad(n) {
  return String(n).padStart(2, '0');
}

// 'AAAA-MM-GG' per un oggetto Date.
function dayKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

// 'AAAA-MM' per anno + mese (mese da 0 a 11, come in JavaScript).
function monthKey(year, month) {
  return `${year}-${pad(month + 1)}`;
}

function parseDayKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Tutti i giorni del mese che cadono nel giorno della settimana scelto, in
// ordine: sono quattro o cinque a seconda del mese.
function daysOf(year, month, weekday) {
  const target = Number.isInteger(weekday) ? weekday : SABATO;
  const out = [];
  const cursor = new Date(year, month, 1);
  cursor.setDate(1 + ((target - cursor.getDay()) + 7) % 7);
  while (cursor.getMonth() === month) {
    out.push(new Date(cursor));
    cursor.setDate(cursor.getDate() + 7);
  }
  return out;
}

function monthLabel(year, month) {
  return `${MESI[month]} ${year}`;
}

// Sposta di uno o piu' mesi restando su valori validi (dicembre -> gennaio).
function shiftMonth(year, month, delta) {
  const d = new Date(year, month + delta, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
}

function today() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// "12 luglio 2026", per la riga "ultima volta" nell'elenco delle case.
function longDate(date) {
  return `${date.getDate()} ${MESI[date.getMonth()].toLowerCase()} ${date.getFullYear()}`;
}

window.Dates = {
  MESI, GIORNI, GIORNI_BREVI, GIORNI_DEL, SABATO,
  pad, dayKey, monthKey, parseDayKey,
  daysOf, monthLabel, shiftMonth, today, longDate,
};

})();
