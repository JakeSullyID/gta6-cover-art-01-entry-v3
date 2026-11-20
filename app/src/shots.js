// Deterministic scenes for screenshots, driven by ?shot= in the URL.
// ?shot=cover paints the cover alone, full-viewport, from the layout /
// grade / title / photo query params. ?shot=editor shows the normal page
// with one sample photo loaded and the caption typed in. ?shot=export
// runs the REAL export path (exportCover at print size) and shows the
// resulting PNG full-viewport, so the screenshot proves the export
// itself. Every scene raises window.__shotReady only after the paint has
// landed AND a 300 ms settle wait has passed, which is what the
// screenshot runner waits for — two different scenes can never come out
// byte-identical.

// The sample order the cover scenes fill their panels from.
const FILL = ['driver', 'boss', 'rider', 'courier', 'lookout', 'wheelman', 'boulevard'];

function doubleFrame() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function signalReady() {
  // Two animation frames for the paint, then a 300 ms settle so fonts
  // and the canvas have fully landed before any screenshot is taken.
  await doubleFrame();
  await wait(300);
  window.__shotApplied = true;
  window.__shotReady = true;
}

async function fillSlots(query, api) {
  const keys = ['photo', 'photo2', 'photo3', 'photo4', 'photo5', 'photo6', 'photo7'];
  const loads = [];
  for (let i = 0; i < keys.length; i++) {
    const name = query.get(keys[i]) || FILL[i];
    loads.push(
      api.loadImage('samples/' + name + '.jpg')
        .then((img) => api.setPanelPhoto(i, img))
        // A missing sample leaves that panel empty rather than failing the shot.
        .catch(() => {}),
    );
  }
  await Promise.all(loads);
}

async function awaitFonts() {
  try {
    await Promise.all([document.fonts.load('64px "Anton"'), document.fonts.load('32px "Pacifico"')]);
    await document.fonts.ready;
  } catch (err) {
    // The title still draws with the fallback face if a font is late.
  }
}

function applyCoverParams(query, api) {
  api.setLayout(query.get('layout') || 'harbor');
  api.setGrade(query.get('grade') || 'sunset');
  api.setTitle(query.get('title') || 'GOLDEN HARBOR');
  if (query.get('subtitle')) api.setSubtitle(query.get('subtitle'));
  if (query.get('popout')) api.setPopout(query.get('popout') !== '0');
}

async function coverScene(query, api) {
  document.body.classList.add('shot-cover');
  await awaitFonts();
  applyCoverParams(query, api);
  await fillSlots(query, api);
  const canvas = document.getElementById('cover');
  if (canvas) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  api.redraw();
}

async function exportScene(query, api) {
  document.body.classList.add('shot-cover');
  await awaitFonts();
  applyCoverParams(query, api);
  await fillSlots(query, api);
  // Render the true export, then display the PNG itself.
  const w = Number(query.get('w') || 1080);
  const h = Number(query.get('h') || 1080);
  const blob = await window.__keyart.exportCover(window.__keyart.state, w, h);
  const url = URL.createObjectURL(blob);
  const img = document.createElement('img');
  img.id = 'export-shot';
  img.src = url;
  img.alt = 'Exported cover PNG';
  document.body.innerHTML = '';
  document.body.appendChild(img);
  await new Promise((resolve) => { img.onload = resolve; img.onerror = resolve; });
}

async function editorScene(query, api) {
  await awaitFonts();
  const titleText = query.get('title') || 'GOLDEN HARBOR';
  api.setTitle(titleText);
  const input = document.getElementById('title');
  if (input) input.value = titleText;
  const photo = query.get('photo') || 'driver';
  try {
    const img = await api.loadImage('samples/' + photo + '.jpg');
    api.setPanelPhoto(0, img);
  } catch (err) {
    // Leave panel 0 empty if the sample cannot load.
  }
  api.redraw();
}

export async function runShot(shot, query, api) {
  if (shot === 'cover') {
    await coverScene(query, api);
  } else if (shot === 'export') {
    await exportScene(query, api);
  } else if (shot === 'editor') {
    await editorScene(query, api);
  }
  await signalReady();
}
