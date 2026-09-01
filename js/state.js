// state.js — i dati dell'app e il loro salvataggio.
//
// Tutto sta in localStorage, sul telefono: nessun account, nessun server.
// Per questo le Impostazioni offrono l'esportazione in un file, che e' l'unico
// modo di portare l'elenco su un altro telefono o di non perderlo se si
// disinstalla l'app.

(function () {

const STORAGE_KEY = 'jwcomitive.data.v1';

// Nell'assegnazione salviamo il *nome* della casa, non il suo identificativo:
// se un giorno una casa viene rinominata o tolta dall'elenco, i mesi gia'
// compilati restano leggibili esattamente come sono stati condivisi.
const EMPTY = {
  version: 1,
  houses: [],                 // { id, name, note }
  assignments: {},            // 'AAAA-MM-GG' -> { house, note, skip }
  settings: {
    subtitle: '',             // riga sotto al titolo della locandina
    time: '',                 // orario predefinito, es. '19:30'
    cardTheme: 'scuro',       // 'scuro' | 'chiaro'
  },
};

let data = clone(EMPTY);
const listeners = [];

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function newId() {
  return 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      data = Object.assign(clone(EMPTY), parsed);
      data.settings = Object.assign(clone(EMPTY.settings), parsed.settings || {});
      if (!Array.isArray(data.houses)) data.houses = [];
      if (!data.assignments || typeof data.assignments !== 'object') data.assignments = {};
    }
  } catch (err) {
    // Dati illeggibili: meglio ripartire vuoti che bloccare l'app all'avvio.
    console.warn('Dati non leggibili, riparto da zero', err);
    data = clone(EMPTY);
  }
  return data;
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Non riesco a salvare', err);
  }
  listeners.forEach((fn) => fn());
}

function subscribe(fn) {
  listeners.push(fn);
}

// --- Case ------------------------------------------------------------------

function houses() {
  return data.houses;
}

function addHouse(name, note) {
  const house = { id: newId(), name: String(name).trim(), note: (note || '').trim() };
  if (!house.name) return null;
  data.houses.push(house);
  save();
  return house;
}

function updateHouse(id, patch) {
  const house = data.houses.find((h) => h.id === id);
  if (!house) return;
  const oldName = house.name;
  Object.assign(house, patch);
  house.name = String(house.name).trim();

  // Rinominare una casa aggiorna anche i sabati gia' assegnati: e' quasi
  // sempre una correzione di battitura, non una casa diversa.
  if (patch.name && house.name && house.name !== oldName) {
    Object.values(data.assignments).forEach((a) => {
      if (a.house === oldName) a.house = house.name;
    });
  }
  save();
}

function removeHouse(id) {
  data.houses = data.houses.filter((h) => h.id !== id);
  save();
}

// --- Sabati ----------------------------------------------------------------

function assignmentFor(key) {
  return data.assignments[key] || null;
}

function setAssignment(key, patch) {
  const current = data.assignments[key] || { house: '', note: '', skip: false };
  const next = Object.assign(current, patch);
  const isEmpty = !next.house && !next.note && !next.skip;
  if (isEmpty) delete data.assignments[key];
  else data.assignments[key] = next;
  save();
}

function clearAssignment(key) {
  delete data.assignments[key];
  save();
}

// Le righe di un mese: un oggetto per ogni sabato, gia' pronto da disegnare
// sia nell'elenco sia sulla locandina.
function monthRows(year, month) {
  return Dates.saturdaysOf(year, month).map((date) => {
    const key = Dates.dayKey(date);
    const a = data.assignments[key] || {};
    return {
      date,
      key,
      day: date.getDate(),
      house: a.house || '',
      note: a.note || '',
      skip: !!a.skip,
    };
  });
}

// Quante volte una casa ha ospitato, e quando l'ultima volta.
function houseStats(name) {
  const keys = Object.keys(data.assignments)
    .filter((k) => data.assignments[k].house === name && !data.assignments[k].skip)
    .sort();
  const past = keys.filter((k) => k <= Dates.dayKey(Dates.today()));
  return {
    total: keys.length,
    last: past.length ? Dates.parseDayKey(past[past.length - 1]) : null,
  };
}

// Riempie i sabati ancora vuoti facendo girare le case in ordine, ripartendo
// da quella che ha ospitato per ultima prima di questo mese.
function fillRotation(year, month) {
  const list = data.houses.map((h) => h.name).filter(Boolean);
  if (!list.length) return 0;

  const firstKey = Dates.dayKey(Dates.saturdaysOf(year, month)[0]);
  const before = Object.keys(data.assignments)
    .filter((k) => k < firstKey && data.assignments[k].house)
    .sort();
  const lastName = before.length ? data.assignments[before[before.length - 1]].house : null;
  let index = lastName ? list.indexOf(lastName) : -1;

  let filled = 0;
  monthRows(year, month).forEach((row) => {
    if (row.house || row.skip) {
      // Un sabato gia' compilato a mano non si tocca, ma fa avanzare il giro
      // se la casa e' in elenco, cosi' il turno successivo e' quello giusto.
      const known = list.indexOf(row.house);
      if (known >= 0) index = known;
      return;
    }
    index = (index + 1) % list.length;
    setAssignmentSilently(row.key, { house: list[index], note: '', skip: false });
    filled += 1;
  });

  if (filled) save();
  return filled;
}

function setAssignmentSilently(key, value) {
  data.assignments[key] = value;
}

// --- Impostazioni e backup -------------------------------------------------

function settings() {
  return data.settings;
}

function updateSettings(patch) {
  Object.assign(data.settings, patch);
  save();
}

function hasData() {
  return data.houses.length > 0 || Object.keys(data.assignments).length > 0;
}

function exportData() {
  return JSON.stringify({ app: 'jwcomitive', exported: new Date().toISOString(), data }, null, 2);
}

// Torna un messaggio d'errore, oppure null se e' andata bene.
function importData(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (err) {
    return 'Il file non è leggibile.';
  }
  const incoming = parsed && parsed.data ? parsed.data : parsed;
  if (!incoming || !Array.isArray(incoming.houses) || typeof incoming.assignments !== 'object') {
    return 'Questo file non contiene un backup di JW comitive.';
  }
  data = Object.assign(clone(EMPTY), incoming);
  data.settings = Object.assign(clone(EMPTY.settings), incoming.settings || {});
  save();
  return null;
}

window.State = {
  load, save, subscribe,
  houses, addHouse, updateHouse, removeHouse,
  assignmentFor, setAssignment, clearAssignment,
  monthRows, houseStats, fillRotation,
  settings, updateSettings,
  hasData, exportData, importData,
};

})();
