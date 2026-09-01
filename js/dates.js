// dates.js — tutto quello che riguarda il calendario.
//
// Le date sono sempre trattate come "date locali senza orario": la chiave di
// un giorno e' la stringa 'AAAA-MM-GG' costruita a mano e non con toISOString(),
// che convertirebbe in UTC e in Italia farebbe scivolare il giorno indietro.

(function () {

const MESI = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

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

// Tutti i sabati del mese, in ordine. Sono 4 o 5 a seconda del mese.
function saturdaysOf(year, month) {
  const out = [];
  const cursor = new Date(year, month, 1);
  // getDay(): 0 = domenica, 6 = sabato.
  cursor.setDate(1 + ((6 - cursor.getDay()) + 7) % 7);
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
  MESI, pad, dayKey, monthKey, parseDayKey,
  saturdaysOf, monthLabel, shiftMonth, today, longDate,
};

})();
