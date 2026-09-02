// router.js — tre schermate, scelte dall'indirizzo dopo il cancelletto.
// Niente libreria: l'app e' piccola e cosi' resta un file solo da capire.

(function () {

const routes = {
  mese: { hash: '#/', render: () => Views.mese() },
  case: { hash: '#/case', render: () => Views.case() },
  impostazioni: { hash: '#/impostazioni', render: () => Views.impostazioni() },
};

function currentName() {
  const hash = window.location.hash || '#/';
  const name = Object.keys(routes).find((k) => routes[k].hash === hash);
  return name || 'mese';
}

function render() {
  const name = currentName();
  const view = document.getElementById('view');

  // Il pannello aperto appartiene alla schermata che si sta lasciando.
  Components.closeSheet();

  view.innerHTML = '';
  view.appendChild(routes[name].render());
  window.scrollTo(0, 0);

  document.querySelectorAll('.nav-item').forEach((item) => {
    item.classList.toggle('is-active', item.dataset.route === name);
  });
  positionNavPill();
}

// La pillola della barra in basso viene messa misurando la voce attiva in
// pixel, non in percentuale: cosi' resta al suo posto con qualsiasi larghezza
// di schermo e anche se un giorno le voci diventassero quattro.
let pillPlaced = false;

function positionNavPill() {
  const pill = document.getElementById('nav-pill');
  const active = document.querySelector('.nav-item.is-active');
  if (!pill || !active) return;

  // Alla prima passata la pillola e' gia' sotto la voce giusta, quindi non
  // deve scivolare da sinistra: l'animazione serve solo ai cambi successivi.
  if (!pillPlaced) {
    pill.style.transition = 'none';
    requestAnimationFrame(() => { pill.style.transition = ''; });
    pillPlaced = true;
  }

  pill.style.width = `${active.offsetWidth}px`;
  pill.style.height = `${active.offsetHeight}px`;
  pill.style.transform = `translateX(${active.offsetLeft}px)`;
}

function go(hash) {
  if (window.location.hash === hash) render();
  else window.location.hash = hash;
}

function start() {
  window.addEventListener('hashchange', render);
  window.addEventListener('resize', positionNavPill);
  window.addEventListener('orientationchange', positionNavPill);

  // I caratteri arrivano dopo il primo disegno e cambiano di poco l'altezza
  // delle voci: a quel punto la pillola va rimisurata.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(positionNavPill);

  render();
}

window.Router = { start, render, go, currentName };

})();
