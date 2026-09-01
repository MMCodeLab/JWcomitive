// views/mese.js — la schermata principale: i sabati del mese, uno sotto
// l'altro, e il pulsante che li manda su WhatsApp come immagine.

(function () {

const esc = Components.escape;

// Il mese che si sta guardando. Resta com'e' finche' l'app e' aperta, cosi'
// tornando dalle Case si ritrova il mese su cui si stava lavorando.
const current = { year: Dates.today().getFullYear(), month: Dates.today().getMonth() };

function isThisMonth() {
  const t = Dates.today();
  return current.year === t.getFullYear() && current.month === t.getMonth();
}

function render() {
  const root = document.createElement('div');
  const rows = State.monthRows(current.year, current.month);
  const done = rows.filter((r) => r.house || r.skip).length;
  const houses = State.houses();

  root.innerHTML = `
    <div class="month-bar">
      <button class="month-arrow" data-move="-1" aria-label="Mese precedente">‹</button>
      <div class="month-name">
        <b>${esc(Dates.MESI[current.month])}</b>
        <span>${current.year}</span>
      </div>
      <button class="month-arrow" data-move="1" aria-label="Mese successivo">›</button>
    </div>

    <div class="month-meta">
      <span>${done} di ${rows.length} sabati compilati</span>
      ${isThisMonth() ? '' : '<span class="dot"></span><button class="link-btn" data-today>Torna a oggi</button>'}
    </div>

    <div class="sat-list">
      ${rows.map(card).join('')}
    </div>

    ${houses.length ? '' : `
      <div class="empty" style="margin-top:18px">
        <h3>Aggiungi le case</h3>
        <p>Salva una volta per tutte le case che ospitano: poi ogni sabato si compila con un tocco.</p>
        <a class="btn btn-primary" href="#/case">Vai alle case</a>
      </div>`}

    <div class="actions">
      ${houses.length ? '<button class="btn btn-block" data-rotate>Riempi a rotazione</button>' : ''}
      <button class="btn btn-primary btn-lg btn-block" data-share ${done ? '' : 'disabled'}>
        Condividi il mese
      </button>
    </div>`;

  root.querySelectorAll('[data-move]').forEach((btn) => {
    btn.addEventListener('click', () => {
      Object.assign(current, Dates.shiftMonth(current.year, current.month, Number(btn.dataset.move)));
      Router.render();
    });
  });

  const todayBtn = root.querySelector('[data-today]');
  if (todayBtn) {
    todayBtn.addEventListener('click', () => {
      const t = Dates.today();
      current.year = t.getFullYear();
      current.month = t.getMonth();
      Router.render();
    });
  }

  root.querySelectorAll('.sat-card').forEach((btn) => {
    btn.addEventListener('click', () => openEditor(btn.dataset.key));
  });

  const rotate = root.querySelector('[data-rotate]');
  if (rotate) rotate.addEventListener('click', doRotation);

  root.querySelector('[data-share]').addEventListener('click', openShare);

  return root;
}

function card(row) {
  const cls = row.skip ? 'is-skip' : (row.house ? '' : 'is-empty');
  const time = State.settings().time;
  const house = row.skip ? 'Nessuna comitiva' : (row.house || 'Scegli la casa');
  const note = row.note || (!row.skip && row.house && time ? `ore ${time}` : '');
  return `
    <button class="sat-card ${cls}" data-key="${row.key}">
      <span class="sat-badge"><em>Sab</em><b>${row.day}</b></span>
      <span class="sat-main">
        <span class="sat-house">${esc(house)}</span>
        ${note ? `<span class="sat-note">${esc(note)}</span>` : ''}
      </span>
      <span class="sat-chevron"></span>
    </button>`;
}

// --- Pannello di un singolo sabato ----------------------------------------

function openEditor(key) {
  const date = Dates.parseDayKey(key);
  const saved = State.assignmentFor(key) || { house: '', note: '', skip: false };
  const houses = State.houses();
  const known = houses.some((h) => h.name === saved.house);

  // Scelta corrente dentro il pannello, applicata solo al Salva.
  const draft = {
    house: saved.house,
    note: saved.note,
    skip: saved.skip,
    other: !!saved.house && !known,
  };

  Components.openSheet({
    title: `Sabato ${date.getDate()} ${Dates.MESI[date.getMonth()].toLowerCase()}`,
    subtitle: 'In quale casa si tiene la comitiva?',
    html: `
      <div class="chips" data-chips>
        ${houses.map((h) => `<button class="chip" data-house="${esc(h.name)}">${esc(h.name)}</button>`).join('')}
        <button class="chip" data-other>Altra casa…</button>
      </div>

      <div class="field" data-other-field hidden>
        <label for="jw-other">Nome della casa</label>
        <input class="input" id="jw-other" type="text" placeholder="Casa Morra" autocomplete="off" />
      </div>

      <div class="field">
        <label for="jw-note">Nota (facoltativa)</label>
        <input class="input" id="jw-note" type="text" placeholder="es. ore 20:00, portare le sedie" autocomplete="off" />
      </div>

      <div class="switch-row">
        <div>
          <div class="switch-label">Nessuna comitiva</div>
          <div class="switch-sub">Il sabato resta in elenco, segnato come libero</div>
        </div>
        <button class="switch" data-skip aria-label="Nessuna comitiva"></button>
      </div>

      <div class="actions">
        <button class="btn btn-primary btn-block" data-save>Salva</button>
        ${saved.house || saved.skip || saved.note ? '<button class="btn btn-danger btn-block" data-clear>Svuota questo sabato</button>' : ''}
      </div>`,

    onMount: (sheet, close) => {
      const otherField = sheet.querySelector('[data-other-field]');
      const otherInput = sheet.querySelector('#jw-other');
      const noteInput = sheet.querySelector('#jw-note');
      const skipBtn = sheet.querySelector('[data-skip]');

      otherInput.value = draft.other ? draft.house : '';
      noteInput.value = draft.note;

      function paint() {
        sheet.querySelectorAll('[data-house]').forEach((chip) => {
          chip.classList.toggle('is-on', !draft.skip && !draft.other && chip.dataset.house === draft.house);
        });
        sheet.querySelector('[data-other]').classList.toggle('is-on', !draft.skip && draft.other);
        otherField.hidden = !draft.other || draft.skip;
        sheet.querySelector('[data-chips]').style.opacity = draft.skip ? '.4' : '1';
        skipBtn.classList.toggle('is-on', draft.skip);
      }

      sheet.querySelectorAll('[data-house]').forEach((chip) => {
        chip.addEventListener('click', () => {
          draft.skip = false;
          draft.other = false;
          // Toccare di nuovo la casa gia' scelta la deseleziona.
          draft.house = draft.house === chip.dataset.house ? '' : chip.dataset.house;
          paint();
        });
      });

      sheet.querySelector('[data-other]').addEventListener('click', () => {
        draft.skip = false;
        draft.other = !draft.other;
        paint();
        if (draft.other) otherInput.focus();
      });

      skipBtn.addEventListener('click', () => {
        draft.skip = !draft.skip;
        paint();
      });

      sheet.querySelector('[data-save]').addEventListener('click', () => {
        const house = draft.skip ? '' : (draft.other ? otherInput.value.trim() : draft.house);
        State.setAssignment(key, {
          house,
          note: draft.skip ? '' : noteInput.value.trim(),
          skip: draft.skip,
        });
        close();
        Router.render();
      });

      const clearBtn = sheet.querySelector('[data-clear]');
      if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
          const ok = await Components.confirm({
            title: 'Svuotare questo sabato?',
            message: `Sabato ${date.getDate()} tornerà senza casa assegnata.`,
            confirmLabel: 'Svuota',
          });
          if (!ok) return;
          State.clearAssignment(key);
          Router.render();
        });
      }

      paint();
    },
  });
}

// --- Riempimento a rotazione ----------------------------------------------

async function doRotation() {
  const rows = State.monthRows(current.year, current.month);
  const free = rows.filter((r) => !r.house && !r.skip).length;
  if (!free) {
    Components.toast('Tutti i sabati sono già compilati');
    return;
  }

  const ok = await Components.confirm({
    title: 'Riempire a rotazione?',
    message: free === 1
      ? 'Un sabato verrà assegnato facendo girare le case in ordine. Quelli già compilati non si toccano.'
      : `${free} sabati verranno assegnati facendo girare le case in ordine. Quelli già compilati non si toccano.`,
    confirmLabel: 'Riempi',
    danger: false,
  });
  if (!ok) return;

  const filled = State.fillRotation(current.year, current.month);
  Router.render();
  Components.toast(filled === 1 ? 'Compilato 1 sabato' : `Compilati ${filled} sabati`);
}

// --- Condivisione ----------------------------------------------------------

function buildModel(theme) {
  const settings = State.settings();
  return {
    title: Dates.monthLabel(current.year, current.month),
    subtitle: settings.subtitle || '',
    time: settings.time || '',
    footer: '',
    theme,
    rows: State.monthRows(current.year, current.month),
  };
}

function openShare() {
  let theme = State.settings().cardTheme || 'scuro';
  let built = null;

  Components.openSheet({
    title: 'Condividi il mese',
    subtitle: 'Su WhatsApp arriva l’immagine, non un link.',
    html: `
      <div class="share-wrap">
        <div class="seg" style="width:100%">
          <button data-theme="scuro">Scuro</button>
          <button data-theme="chiaro">Chiaro</button>
        </div>
        <div class="share-preview" data-preview>
          <div class="share-loading">Preparo l’immagine…</div>
        </div>
      </div>
      <div class="actions">
        <button class="btn btn-primary btn-lg btn-block" data-send disabled>Condividi</button>
        <div class="actions-row">
          <button class="btn" data-save-img disabled>Salva immagine</button>
          <button class="btn" data-copy disabled>Copia testo</button>
        </div>
      </div>
      <p class="hint" data-hint style="margin-top:14px"></p>`,

    onMount: (sheet) => {
      const preview = sheet.querySelector('[data-preview]');
      const sendBtn = sheet.querySelector('[data-send]');
      const saveBtn = sheet.querySelector('[data-save-img]');
      const copyBtn = sheet.querySelector('[data-copy]');
      const hint = sheet.querySelector('[data-hint]');

      async function refresh() {
        sheet.querySelectorAll('[data-theme]').forEach((b) => {
          b.classList.toggle('is-on', b.dataset.theme === theme);
        });
        [sendBtn, saveBtn, copyBtn].forEach((b) => { b.disabled = true; });
        preview.innerHTML = '<div class="share-loading">Preparo l’immagine…</div>';

        built = await ShareCard.build(buildModel(theme));

        built.canvas.setAttribute('role', 'img');
        built.canvas.setAttribute('aria-label', 'Anteprima dell’immagine del mese');
        preview.innerHTML = '';
        preview.appendChild(built.canvas);

        const canShare = ShareCard.canShareFile(built.file);
        sendBtn.disabled = !canShare;
        saveBtn.disabled = !built.blob;
        copyBtn.disabled = false;
        hint.textContent = canShare
          ? 'Tocca Condividi e scegli WhatsApp: l’immagine arriva con l’elenco già scritto come didascalia.'
          : 'Questo browser non sa condividere immagini: salvala e allegala a mano su WhatsApp.';
      }

      sheet.querySelectorAll('[data-theme]').forEach((btn) => {
        btn.addEventListener('click', () => {
          theme = btn.dataset.theme;
          State.updateSettings({ cardTheme: theme });
          refresh();
        });
      });

      // Niente await prima di share(): su iPhone la condivisione parte solo
      // se viene chiamata dentro il tocco. Il file e' gia' pronto.
      sendBtn.addEventListener('click', () => {
        if (!built) return;
        ShareCard.shareFile(built, `Comitive — ${Dates.monthLabel(current.year, current.month)}`)
          .catch((err) => {
            if (err && err.name === 'AbortError') return;
            Components.toast('Non sono riuscito a condividere: prova a salvare l’immagine');
          });
      });

      saveBtn.addEventListener('click', () => {
        if (!built) return;
        ShareCard.download(built);
        Components.toast('Immagine salvata');
      });

      copyBtn.addEventListener('click', async () => {
        if (!built) return;
        try {
          await navigator.clipboard.writeText(built.text);
          Components.toast('Elenco copiato');
        } catch (err) {
          Components.toast('Copia non riuscita su questo browser');
        }
      });

      refresh();
    },
  });
}

window.Views = window.Views || {};
window.Views.mese = render;

})();
