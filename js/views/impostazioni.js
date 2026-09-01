// views/impostazioni.js — le poche cose da regolare una volta sola, piu' il
// salvataggio su file, che e' l'unico modo di non perdere i dati.

(function () {

const esc = Components.escape;

function render() {
  const root = document.createElement('div');
  const s = State.settings();

  root.innerHTML = `
    <h1 class="page-title">Impostazioni</h1>

    <div class="card">
      <div class="field">
        <label for="jw-sub">Riga sotto al titolo</label>
        <input class="input" id="jw-sub" type="text" placeholder="es. Gruppo 2 — Congregazione Sud"
               value="${esc(s.subtitle)}" autocomplete="off" />
      </div>
      <div class="field">
        <label for="jw-time">Orario abituale</label>
        <input class="input" id="jw-time" type="text" placeholder="es. 19:30" value="${esc(s.time)}" autocomplete="off" />
      </div>
      <p class="hint">L’orario compare sotto ogni casa, tranne dove hai scritto una nota tua.</p>
      <div class="field">
        <label>Aspetto dell’immagine</label>
        <div class="seg">
          <button data-theme="scuro" class="${s.cardTheme !== 'chiaro' ? 'is-on' : ''}">Scuro</button>
          <button data-theme="chiaro" class="${s.cardTheme === 'chiaro' ? 'is-on' : ''}">Chiaro</button>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="info-row">
        <span class="info-label">Copia di sicurezza</span>
        <span class="info-value" data-backup-label></span>
      </div>
      <p class="hint" style="margin:10px 0 14px">
        I dati stanno solo su questo telefono. Esporta ogni tanto un file: è quello che ti serve
        per ritrovare tutto se cambi telefono o reinstalli l’app.
      </p>
      <div class="actions-row">
        <button class="btn" data-export>Esporta</button>
        <button class="btn" data-import>Importa</button>
      </div>
      <input type="file" accept="application/json,.json" hidden data-file />
    </div>

    <div class="card">
      <div class="info-row">
        <span class="info-label">JW comitive</span>
        <span class="info-value">versione ${esc(window.APP_VERSION || '1.0')}</span>
      </div>
      <div class="info-row">
        <span class="info-label">Sabati calcolati</span>
        <span class="info-value">in automatico, mese per mese</span>
      </div>
    </div>`;

  const sub = root.querySelector('#jw-sub');
  const time = root.querySelector('#jw-time');
  sub.addEventListener('change', () => State.updateSettings({ subtitle: sub.value.trim() }));
  time.addEventListener('change', () => State.updateSettings({ time: time.value.trim() }));

  root.querySelectorAll('[data-theme]').forEach((btn) => {
    btn.addEventListener('click', () => {
      State.updateSettings({ cardTheme: btn.dataset.theme });
      root.querySelectorAll('[data-theme]').forEach((b) => b.classList.toggle('is-on', b === btn));
    });
  });

  const label = root.querySelector('[data-backup-label]');
  label.textContent = window.PwaShell ? PwaShell.backupLabel() : '';

  root.querySelector('[data-export]').addEventListener('click', () => {
    exportFile();
    label.textContent = window.PwaShell ? PwaShell.backupLabel() : '';
  });

  const file = root.querySelector('[data-file]');
  root.querySelector('[data-import]').addEventListener('click', () => file.click());
  file.addEventListener('change', () => {
    const chosen = file.files && file.files[0];
    if (chosen) importFile(chosen);
    file.value = '';
  });

  return root;
}

function exportFile() {
  const blob = new Blob([State.exportData()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jw-comitive-${Dates.dayKey(Dates.today())}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  if (window.PwaShell) PwaShell.markBackupDone();
  Components.toast('Backup esportato');
}

async function importFile(chosen) {
  const text = await chosen.text();

  // Sostituire i dati e' irreversibile: si chiede prima, sempre.
  const ok = await Components.confirm({
    title: 'Sostituire i dati?',
    message: 'Case e sabati di questo telefono verranno sostituiti con quelli del file.',
    confirmLabel: 'Sostituisci',
  });
  if (!ok) return;

  const error = State.importData(text);
  if (error) { Components.toast(error); return; }
  Router.render();
  Components.toast('Backup ripristinato');
}

window.Views = window.Views || {};
window.Views.impostazioni = render;

})();
