// share-card.js — disegna la locandina del mese e la consegna a WhatsApp.
//
// L'immagine viene disegnata su un canvas e trasformata in un file vero:
// e' questo che permette di condividerla come foto, e non come link. Su
// WhatsApp arriva quindi la tabella gia' impaginata, che si vede subito nella
// chat senza che nessuno debba aprire niente.
//
// Nota su iOS: navigator.share() deve partire dentro il tocco dell'utente. Per
// questo il file viene preparato prima, quando si apre l'anteprima, e il
// pulsante "Condividi" si limita a passarlo al sistema.

(function () {

const W = 1080;          // larghezza in pixel della locandina
const PAD = 64;          // margine laterale
const LOGO = 172;
const ROW_H = 148;
const ROW_GAP = 16;

// I colori delle due versioni della locandina.
const SCURO = {
  bgTop: '#1c3450',
  bgBottom: '#0a1521',
  glow: 'rgba(120, 170, 220, 0.20)',
  card: 'rgba(255, 255, 255, 0.065)',
  cardLine: 'rgba(255, 255, 255, 0.12)',
  badge: ['rgba(107, 167, 224, 0.30)', 'rgba(47, 110, 168, 0.14)'],
  badgeLine: 'rgba(126, 180, 232, 0.42)',
  accent: '#8dc0ec',
  title: '#ffffff',
  text: '#f0f5fa',
  soft: 'rgba(215, 228, 240, 0.74)',
  faint: 'rgba(198, 214, 230, 0.52)',
  rule: 'rgba(255, 255, 255, 0.20)',
};

const CHIARO = {
  bgTop: '#ffffff',
  bgBottom: '#e7edf4',
  glow: 'rgba(120, 170, 220, 0.16)',
  card: 'rgba(20, 45, 72, 0.045)',
  cardLine: 'rgba(20, 45, 72, 0.12)',
  badge: ['rgba(36, 89, 143, 0.16)', 'rgba(36, 89, 143, 0.06)'],
  badgeLine: 'rgba(36, 89, 143, 0.30)',
  accent: '#2b6ba6',
  title: '#0d2438',
  text: '#12293e',
  soft: 'rgba(18, 41, 62, 0.70)',
  faint: 'rgba(18, 41, 62, 0.50)',
  rule: 'rgba(18, 41, 62, 0.20)',
};

let logoPromise = null;
let noisePattern = null;

function palette(theme) {
  return theme === 'chiaro' ? CHIARO : SCURO;
}

// Il logo dell'app: e' nella stessa cartella del sito, quindi il canvas non
// viene "sporcato" e toBlob() continua a funzionare.
function loadLogo() {
  if (!logoPromise) {
    logoPromise = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = 'icons/logo-1024.png';
    });
  }
  return logoPromise;
}

// I caratteri vanno chiesti prima di disegnare: il canvas non aspetta il
// caricamento e ripiegherebbe silenziosamente su un carattere di sistema.
async function ensureFonts() {
  if (!document.fonts) return;
  const wanted = ['600 72px Sora', '600 46px Sora', '700 30px Inter', '500 30px Inter', '600 40px Inter'];
  try {
    await Promise.all(wanted.map((f) => document.fonts.load(f)));
    await document.fonts.ready;
  } catch (err) {
    /* Senza i caratteri scelti si disegna comunque, con quelli di sistema. */
  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); return; }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Grana leggerissima: senza, il fondo sfumato sembra piatto e "digitale".
function grain(ctx, w, h) {
  if (!noisePattern) {
    const tile = document.createElement('canvas');
    tile.width = tile.height = 120;
    const tctx = tile.getContext('2d');
    const img = tctx.createImageData(120, 120);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 120 + Math.random() * 70;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    noisePattern = ctx.createPattern(tile, 'repeat');
  }
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = noisePattern;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

// Scrive il testo rimpicciolendolo se non ci sta, e alla fine troncandolo.
function fitText(ctx, text, maxWidth, weight, size, minSize, family) {
  let s = size;
  ctx.font = `${weight} ${s}px ${family}`;
  while (ctx.measureText(text).width > maxWidth && s > minSize) {
    s -= 2;
    ctx.font = `${weight} ${s}px ${family}`;
  }
  let out = text;
  while (ctx.measureText(out).width > maxWidth && out.length > 4) {
    out = out.slice(0, -2);
  }
  return out === text ? text : out + '…';
}

function spacedText(ctx, text, x, y, spacing) {
  const chars = Array.from(text);
  const total = chars.reduce((sum, c) => sum + ctx.measureText(c).width + spacing, 0) - spacing;
  let cursor = x - total / 2;
  chars.forEach((c) => {
    ctx.fillText(c, cursor + ctx.measureText(c).width / 2, y);
    cursor += ctx.measureText(c).width + spacing;
  });
}

function measureHeight(model) {
  let h = 88 + LOGO + 50 + 30 + 24 + 76;
  if (model.subtitle) h += 46;
  h += 44 + 44;
  h += model.rows.length * ROW_H + Math.max(0, model.rows.length - 1) * ROW_GAP;
  h += 52;
  if (model.footer) h += 44;
  return h + 68;
}

async function draw(model) {
  await ensureFonts();
  const logo = await loadLogo();
  const c = palette(model.theme);

  const H = measureHeight(model);
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d');

  // --- Fondo ---------------------------------------------------------------
  const bg = ctx.createLinearGradient(0, 0, W * 0.35, H);
  bg.addColorStop(0, c.bgTop);
  bg.addColorStop(1, c.bgBottom);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  const glow = ctx.createRadialGradient(W / 2, 90, 40, W / 2, 90, W * 0.85);
  glow.addColorStop(0, c.glow);
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);
  grain(ctx, W, H);

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let y = 88;

  // --- Logo ----------------------------------------------------------------
  if (logo) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 34;
    ctx.shadowOffsetY = 12;
    roundRect(ctx, (W - LOGO) / 2, y, LOGO, LOGO, 42);
    ctx.fillStyle = '#12253a';
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(ctx, (W - LOGO) / 2, y, LOGO, LOGO, 42);
    ctx.clip();
    ctx.drawImage(logo, (W - LOGO) / 2, y, LOGO, LOGO);
    ctx.restore();
  }
  y += LOGO + 50;

  // --- Testata -------------------------------------------------------------
  ctx.fillStyle = c.accent;
  ctx.font = '700 30px Inter, sans-serif';
  spacedText(ctx, 'COMITIVE DEL SABATO', W / 2, y + 15, 6);
  y += 30 + 24;

  ctx.fillStyle = c.title;
  ctx.font = '600 72px Sora, sans-serif';
  ctx.fillText(model.title, W / 2, y + 38);
  y += 76;

  if (model.subtitle) {
    ctx.fillStyle = c.soft;
    ctx.font = '500 32px Inter, sans-serif';
    ctx.fillText(fitText(ctx, model.subtitle, W - PAD * 2, '500', 32, 24, 'Inter, sans-serif'), W / 2, y + 23);
    y += 46;
  }

  // Filetto con rombo al centro.
  y += 44;
  ctx.strokeStyle = c.rule;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2 - 170, y);
  ctx.lineTo(W / 2 - 22, y);
  ctx.moveTo(W / 2 + 22, y);
  ctx.lineTo(W / 2 + 170, y);
  ctx.stroke();
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = c.accent;
  ctx.fillRect(-6, -6, 12, 12);
  ctx.restore();
  y += 44;

  // --- Una riga per sabato -------------------------------------------------
  const x0 = PAD;
  const cardW = W - PAD * 2;

  model.rows.forEach((row, i) => {
    const top = y + i * (ROW_H + ROW_GAP);
    const mid = top + ROW_H / 2;

    ctx.save();
    if (row.skip) ctx.globalAlpha = 0.55;

    roundRect(ctx, x0, top, cardW, ROW_H, 30);
    ctx.fillStyle = c.card;
    ctx.fill();
    ctx.strokeStyle = c.cardLine;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Riquadro con il numero del sabato.
    const bx = x0 + 26;
    const bs = 108;
    roundRect(ctx, bx, mid - bs / 2, bs, bs, 26);
    const bgrad = ctx.createLinearGradient(bx, mid - bs / 2, bx + bs, mid + bs / 2);
    bgrad.addColorStop(0, c.badge[0]);
    bgrad.addColorStop(1, c.badge[1]);
    ctx.fillStyle = bgrad;
    ctx.fill();
    ctx.strokeStyle = c.badgeLine;
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = c.accent;
    ctx.font = '700 20px Inter, sans-serif';
    spacedText(ctx, 'SAB', bx + bs / 2, mid - 26, 3);

    ctx.fillStyle = c.title;
    ctx.font = '600 48px Sora, sans-serif';
    ctx.fillText(String(row.day), bx + bs / 2, mid + 16);

    // Casa e nota.
    const tx = bx + bs + 30;
    const tw = x0 + cardW - tx - 34;
    ctx.textAlign = 'left';

    const house = row.skip ? 'Nessuna comitiva' : (row.house || 'Da definire');
    const sub = row.note || (!row.skip && row.house && model.time ? `ore ${model.time}` : '');

    ctx.fillStyle = row.house || row.skip ? c.text : c.faint;
    const label = fitText(ctx, house, tw, '600', 44, 30, 'Sora, sans-serif');
    ctx.fillText(label, tx, sub ? mid - 18 : mid + 2);

    if (sub) {
      ctx.fillStyle = c.soft;
      ctx.font = '500 30px Inter, sans-serif';
      ctx.fillText(fitText(ctx, sub, tw, '500', 30, 22, 'Inter, sans-serif'), tx, mid + 30);
    }

    ctx.textAlign = 'center';
    ctx.restore();
  });

  y += model.rows.length * ROW_H + Math.max(0, model.rows.length - 1) * ROW_GAP;

  // --- Piede ---------------------------------------------------------------
  if (model.footer) {
    y += 52;
    ctx.fillStyle = c.faint;
    ctx.font = '500 28px Inter, sans-serif';
    ctx.fillText(fitText(ctx, model.footer, W - PAD * 2, '500', 28, 22, 'Inter, sans-serif'), W / 2, y);
  }

  return canvas;
}

// JPEG e non PNG: la locandina e' una fotografia di testo su sfondo sfumato,
// e in PNG pesava oltre due megabyte per colpa della grana. In JPEG di qualita'
// alta si vede identica e pesa una decina di volte meno, quindi parte subito
// anche con poca linea.
function canvasToBlob(canvas) {
  return new Promise((resolve) => {
    // Se il canvas fosse "sporcato" da un'immagine di un altro dominio
    // toBlob() non funziona: l'anteprima si vede lo stesso, ma il file no.
    try { canvas.toBlob(resolve, 'image/jpeg', 0.94); } catch (err) { resolve(null); }
  });
}

// Il testo che accompagna l'immagine: serve come didascalia su WhatsApp e
// come alternativa per chi preferisce incollare un elenco scritto.
function buildText(model) {
  const lines = [`*${model.title.toUpperCase()}*`];
  if (model.subtitle) lines.push(model.subtitle);
  lines.push('');
  model.rows.forEach((row) => {
    if (row.skip) {
      lines.push(`• Sabato ${row.day} — nessuna comitiva`);
      return;
    }
    let line = `• Sabato ${row.day} — ${row.house || 'da definire'}`;
    if (row.note) line += ` (${row.note})`;
    else if (row.house && model.time) line += ` (ore ${model.time})`;
    lines.push(line);
  });
  if (model.footer) { lines.push(''); lines.push(model.footer); }
  return lines.join('\n');
}

function slug(text) {
  return text.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

// Prepara tutto in anticipo: immagine, anteprima, file e testo.
async function build(model) {
  const canvas = await draw(model);
  const blob = await canvasToBlob(canvas);
  const name = `comitive-${slug(model.title)}.jpg`;
  const file = blob ? new File([blob], name, { type: 'image/jpeg' }) : null;
  // L'anteprima usa direttamente il canvas: nessuna conversione in piu' e
  // niente da caricare, quindi compare subito appena finito il disegno.
  return { canvas, blob, file, name, text: buildText(model) };
}

function canShareFile(file) {
  return !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
}

// Da chiamare dentro il gestore del tocco, senza await prima.
function shareFile(built, title) {
  if (!canShareFile(built.file)) return Promise.reject(new Error('unsupported'));
  return navigator.share({ files: [built.file], title, text: built.text });
}

function download(built) {
  if (!built.blob) return false;
  const url = URL.createObjectURL(built.blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = built.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return true;
}

window.ShareCard = { build, shareFile, canShareFile, download, buildText };

})();
