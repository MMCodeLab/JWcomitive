// components.js — i pezzi di interfaccia riusati ovunque: avvisi che
// compaiono in basso, pannelli che salgono dal basso, richieste di conferma.

(function () {

const modalRoot = () => document.getElementById('modal-root');
const toastRoot = () => document.getElementById('toast-root');

// Ogni testo che arriva dall'utente passa da qui prima di finire in innerHTML.
function escape(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- Avvisi ---------------------------------------------------------------

function toast(message, ms) {
  const node = document.createElement('div');
  node.className = 'toast';
  node.textContent = message;
  toastRoot().appendChild(node);
  setTimeout(() => {
    node.classList.add('is-out');
    setTimeout(() => node.remove(), 240);
  }, ms || 2600);
}

// --- Pannello che sale dal basso ------------------------------------------

let closeCurrent = null;

function openSheet(options) {
  closeSheet();

  const backdrop = document.createElement('div');
  backdrop.className = 'backdrop';
  backdrop.innerHTML = `
    <div class="sheet" role="dialog" aria-modal="true">
      <div class="sheet-grip"></div>
      ${options.title ? `<h2>${escape(options.title)}</h2>` : ''}
      ${options.subtitle ? `<p class="sheet-sub">${escape(options.subtitle)}</p>` : ''}
      <div class="sheet-body"></div>
    </div>`;

  backdrop.querySelector('.sheet-body').innerHTML = options.html || '';
  modalRoot().appendChild(backdrop);
  document.body.style.overflow = 'hidden';

  // Un tocco fuori dal pannello lo chiude; dentro no, altrimenti ogni tocco
  // su un campo lo farebbe sparire.
  backdrop.addEventListener('click', (event) => {
    if (event.target === backdrop) closeSheet();
  });

  const onKey = (event) => { if (event.key === 'Escape') closeSheet(); };
  document.addEventListener('keydown', onKey);

  closeCurrent = () => {
    document.removeEventListener('keydown', onKey);
    document.body.style.overflow = '';
    backdrop.remove();
    closeCurrent = null;
    if (options.onClose) options.onClose();
  };

  if (options.onMount) options.onMount(backdrop.querySelector('.sheet'), closeSheet);
  return closeSheet;
}

function closeSheet() {
  if (closeCurrent) closeCurrent();
}

// --- Conferma --------------------------------------------------------------

// Nessun pulsante che cancella qualcosa agisce senza passare di qui.
function confirmAction(options) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet({
      title: options.title,
      subtitle: options.message,
      html: `
        <div class="actions">
          <button class="btn ${options.danger === false ? 'btn-primary' : 'btn-danger'} btn-block" data-yes>
            ${escape(options.confirmLabel || 'Elimina')}
          </button>
          <button class="btn btn-ghost btn-block" data-no>Annulla</button>
        </div>`,
      onMount: (sheet, close) => {
        sheet.querySelector('[data-yes]').addEventListener('click', () => {
          answered = true;
          close();
          resolve(true);
        });
        sheet.querySelector('[data-no]').addEventListener('click', close);
      },
      onClose: () => { if (!answered) resolve(false); },
    });
  });
}

window.Components = { escape, toast, openSheet, closeSheet, confirm: confirmAction };

})();
