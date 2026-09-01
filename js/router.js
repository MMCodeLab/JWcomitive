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
}

function go(hash) {
  if (window.location.hash === hash) render();
  else window.location.hash = hash;
}

function start() {
  window.addEventListener('hashchange', render);
  render();
}

window.Router = { start, render, go, currentName };

})();
