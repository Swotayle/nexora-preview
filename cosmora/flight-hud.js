export function mountFlightHud(parent, keys, cancel, withSpeed = false) {
  const panel = document.createElement('section');
  panel.className = 'flight-hud';
  panel.innerHTML = `
    <output aria-label="Kamera durumu"></output>
    <progress max="1" value="0" aria-label="Yolculuk ilerlemesi" hidden></progress>
    ${withSpeed ? '<label>Kamera hızı <input type="range" min="1" max="10" value="5"></label>' : ''}
    <details class="flight-touch"><summary>Hareket</summary><div>
      <button type="button" data-key="w" aria-label="İleri">↑</button><button type="button" data-key="s" aria-label="Geri">↓</button>
      <button type="button" data-key="a" aria-label="Sol">←</button><button type="button" data-key="d" aria-label="Sağ">→</button>
      <button type="button" data-key="q" aria-label="Yüksel">+</button><button type="button" data-key="e" aria-label="Alçal">−</button>
      <button type="button" data-stop>Durdur</button>
    </div></details>
    <details class="flight-help"><summary>Kısayollar</summary><small>WASD hareket · Q/E dikey · Shift hızlı · Ctrl yavaş · Esc iptal · Sürükle: bakış · Tekerlek veya iki parmak: yakınlaştır</small></details>`;
  parent.append(panel);
  panel.querySelectorAll('[data-key]').forEach(button => {
    const key = button.dataset.key;
    button.addEventListener('pointerdown',event => {
      event.preventDefault();
      cancel();
      keys.add(key);
      button.setPointerCapture(event.pointerId);
    });
    for (const event of ['pointerup','pointercancel','lostpointercapture']) {
      button.addEventListener(event,() => keys.delete(key));
    }
  });
  panel.querySelector('[data-stop]').onclick = () => { keys.clear(); cancel(); };
  const output = panel.querySelector('output');
  const progress = panel.querySelector('progress');
  const speed = panel.querySelector('input');
  return {
    panel, speed: () => Number(speed?.value ?? 5),
    update({mode, target, velocity, range, astronomical, bearing, fov, fraction}) {
      output.textContent = [mode,target,`${velocity.toFixed(1)} birim/sn`,
        range == null ? '' : `Kamera ${range.toFixed(1)} birim`,
        astronomical ? `Astronomik: ${astronomical}` : '',
        `Yön ${Math.round(bearing)}° · Görüş ${Math.round(fov)}°`].filter(Boolean).join(' · ');
      progress.hidden = fraction == null;
      if (fraction != null) progress.value = fraction;
    }
  };
}

