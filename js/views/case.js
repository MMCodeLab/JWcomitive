// views/case.js — l'elenco delle case che ospitano, con quante volte hanno
// gia' ospitato e quando: serve per capire a colpo d'occhio a chi tocca.

(function () {

const esc = Components.escape;

// "Casa Morra" -> "M", "Famiglia De Luca" -> "DL". La parola "casa" o
// "famiglia" davanti al cognome non aggiunge niente all'iniziale.
function initials(name) {
  const skip = ['casa', 'famiglia', 'fam', 'da', 'de', 'di'];
  const words = name.split(/\s+/).filter((w) => w && !skip.includes(w.toLowerCase()));
  const use = words.length ? words : name.split(/\s+/);
  return use.slice(0, 2).map((w) => w[0].toUpperCase()).join('');
}

function render() {
  const root = document.createElement('div');
  const houses = State.houses();

  root.innerHTML = `
    <h1 class="page-title">Case</h1>

    ${houses.length ? `<div class="house-list">${houses.map(row).join('')}</div>` : `
      <div class="empty">
        <h3>Nessuna casa salvata</h3>
        <p>Aggiungi le famiglie che ospitano la comitiva: le ritroverai come pulsanti su ogni sabato.</p>
      </div>`}

    <div class="actions">
      <button class="btn btn-primary btn-block" data-add>Aggiungi una casa</button>
    </div>

    ${houses.length > 1 ? '<p class="hint" style="margin-top:16px">L’ordine di questo elenco è anche l’ordine del riempimento a rotazione.</p>' : ''}`;

  root.querySelectorAll('.house-row').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.id));
  });
  root.querySelector('[data-add]').addEventListener('click', () => openEditor(null));

  return root;
}

function row(house) {
  const stats = State.houseStats(house.name);
  const sub = house.note
    ? house.note
    : (stats.last ? `Ultima volta il ${Dates.longDate(stats.last)}` : 'Non ha ancora ospitato');
  return `
    <button class="house-row" data-id="${house.id}">
      <span class="house-avatar">${esc(initials(house.name))}</span>
      <span>
        <span class="house-name">${esc(house.name)}</span>
        <span class="house-sub">${esc(sub)}</span>
      </span>
      <span class="house-count">${stats.total === 1 ? '1 volta' : stats.total + ' volte'}</span>
    </button>`;
}

function openEditor(id) {
  const house = id ? State.houses().find((h) => h.id === id) : null;

  Components.openSheet({
    title: house ? 'Modifica casa' : 'Nuova casa',
    subtitle: house ? '' : 'Come vuoi che compaia nel messaggio del mese.',
    html: `
      <div class="field">
        <label for="jw-name">Nome</label>
        <input class="input" id="jw-name" type="text" placeholder="Casa Morra" autocomplete="off" />
      </div>
      <div class="field">
        <label for="jw-hnote">Nota (facoltativa)</label>
        <input class="input" id="jw-hnote" type="text" placeholder="es. via Roma 12, citofono Morra" autocomplete="off" />
      </div>
      <p class="hint">La nota resta nell’app, non finisce nell’immagine da condividere.</p>
      <div class="actions">
        <button class="btn btn-primary btn-block" data-save>${house ? 'Salva' : 'Aggiungi'}</button>
        ${house ? '<button class="btn btn-danger btn-block" data-del>Elimina questa casa</button>' : ''}
      </div>`,

    onMount: (sheet, close) => {
      const name = sheet.querySelector('#jw-name');
      const note = sheet.querySelector('#jw-hnote');
      if (house) { name.value = house.name; note.value = house.note || ''; }
      setTimeout(() => name.focus(), 120);

      function save() {
        const value = name.value.trim();
        if (!value) { Components.toast('Serve almeno il nome'); name.focus(); return; }
        if (house) State.updateHouse(house.id, { name: value, note: note.value.trim() });
        else State.addHouse(value, note.value.trim());
        close();
        Router.render();
      }

      sheet.querySelector('[data-save]').addEventListener('click', save);
      name.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });
      note.addEventListener('keydown', (e) => { if (e.key === 'Enter') save(); });

      const del = sheet.querySelector('[data-del]');
      if (del) {
        del.addEventListener('click', async () => {
          const stats = State.houseStats(house.name);
          const ok = await Components.confirm({
            title: `Eliminare ${house.name}?`,
            message: stats.total
              ? `Sparisce dall’elenco, ma le ${stats.total} date già assegnate restano com’erano.`
              : 'Sparisce dall’elenco delle case.',
            confirmLabel: 'Elimina',
          });
          if (!ok) return;
          State.removeHouse(house.id);
          Router.render();
          Components.toast('Casa eliminata');
        });
      }
    },
  });
}

window.Views = window.Views || {};
window.Views.case = render;

})();
