(function () {
  const canvas = document.getElementById('game-canvas');
  const wrap = canvas.parentElement;
  const liveScore = document.getElementById('live-score');
  const bestScore = document.getElementById('best-score');
  const overlay = document.getElementById('overlay');
  const overlayScore = document.getElementById('overlay-score');
  const overlayBest = document.getElementById('overlay-best');
  const customPanel = document.getElementById('custom-panel');
  const tabs = document.querySelectorAll('.tab');

  let game = null;
  let activeMode = 'classic';
  let activeConfig = {};
  let flashInterval = null;

  // ── Canvas helpers ──────────────────────────────────────────────────────

  function syncCanvasSize() {
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  }

  function showCanvas() {
    canvas.style.display = 'block';
    customPanel.classList.remove('visible');
  }

  function showCustomPanel() {
    canvas.style.display = 'none';
    customPanel.classList.add('visible');
  }

  // ── Score display ───────────────────────────────────────────────────────

  function updateBestDisplay() {
    bestScore.textContent = 'BEST: ' + SnakeGame.getBestScore(activeMode);
  }

  function showOverlay(score) {
    overlayScore.textContent = 'SCORE: ' + score;
    overlayBest.textContent = 'BEST: ' + SnakeGame.getBestScore(activeMode);
    overlay.classList.add('visible');
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  // ── Game lifecycle ──────────────────────────────────────────────────────

  function startGame(mode, config) {
    activeMode = mode;
    activeConfig = config || {};
    showCanvas();
    syncCanvasSize();
    hideOverlay();
    liveScore.textContent = 'SCORE: 0';

    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    if (game) game.stop();
    game = new SnakeGame(canvas, mode, activeConfig);

    game.onScoreUpdate = function (score) {
      liveScore.textContent = 'SCORE: ' + score;
    };

    game.onDeath = function (score) {
      SnakeGame.saveBestScore(activeMode, score);
      updateBestDisplay();
      const ctx = game.ctx;
      let alpha = 0.4;
      flashInterval = setInterval(function () {
        game.render();
        ctx.fillStyle = 'rgba(239,68,68,' + alpha + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        alpha -= 0.05;
        if (alpha <= 0) { clearInterval(flashInterval); flashInterval = null; showOverlay(score); }
      }, 40);
    };

    updateBestDisplay();
    game.render();
  }

  // ── Tab switching ───────────────────────────────────────────────────────

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const mode = tab.dataset.mode;
      if (mode === 'custom') {
        activeMode = 'custom';
        if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
        if (game) { game.stop(); game = null; }
        hideOverlay();
        liveScore.textContent = 'SCORE: 0';
        showCustomPanel();
        bestScore.textContent = 'BEST: ' + SnakeGame.getBestScore('custom');
      } else {
        startGame(mode);
      }
    });
  });

  // ── Keyboard ────────────────────────────────────────────────────────────

  const DIR_MAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1],
    ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };

  document.addEventListener('keydown', function (e) {
    const dir = DIR_MAP[e.key];
    if (!dir || !game) return;
    e.preventDefault();
    if (game.state === 'idle') {
      game.queueDirection(dir[0], dir[1]);
      game.start();
    } else if (game.state === 'running') {
      game.queueDirection(dir[0], dir[1]);
    }
  });

  // ── Game over overlay buttons ───────────────────────────────────────────

  document.getElementById('btn-again').addEventListener('click', function () {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    hideOverlay();
    liveScore.textContent = 'SCORE: 0';
    if (game) { game.reset(); game.render(); }
  });

  document.getElementById('btn-menu').addEventListener('click', function () {
    if (activeMode === 'custom') {
      hideOverlay();
      if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
      if (game) { game.stop(); game = null; }
      showCustomPanel();
    } else {
      startGame(activeMode, activeConfig);
    }
  });

  // ── Expand to fullscreen ────────────────────────────────────────────────

  document.getElementById('expand-btn').addEventListener('click', function () {
    const params = new URLSearchParams({ mode: activeMode });
    if (activeMode === 'custom') {
      const cfg = readCustomConfig();
      Object.entries(cfg).forEach(([k, v]) => params.set(k, v));
    }
    chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html') + '?' + params.toString() });
  });

  // ── Custom panel controls ───────────────────────────────────────────────

  // Fruit stepper
  let fruitCount = 1;
  document.getElementById('fruit-minus').addEventListener('click', function () {
    if (fruitCount > 1) { fruitCount--; document.getElementById('fruit-count').textContent = fruitCount; }
  });
  document.getElementById('fruit-plus').addEventListener('click', function () {
    if (fruitCount < 5) { fruitCount++; document.getElementById('fruit-count').textContent = fruitCount; }
  });

  // Speed pills
  document.querySelectorAll('.speed-opt').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.speed-opt').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Feature toggles
  ['toggle-levels', 'toggle-obstacles', 'toggle-powerups'].forEach(function (id) {
    const btn = document.getElementById(id);
    btn.addEventListener('click', function () {
      const isOn = btn.classList.toggle('on');
      btn.textContent = isOn ? 'ON' : 'OFF';
    });
  });

  function readCustomConfig() {
    const speedBtn = document.querySelector('.speed-opt.active');
    return {
      foodCount: fruitCount,
      baseInterval: parseInt(speedBtn ? speedBtn.dataset.val : '150', 10),
      levels: document.getElementById('toggle-levels').classList.contains('on'),
      obstacles: document.getElementById('toggle-obstacles').classList.contains('on'),
      powerUps: document.getElementById('toggle-powerups').classList.contains('on'),
    };
  }

  // Play button
  document.getElementById('custom-play').addEventListener('click', function () {
    startGame('custom', readCustomConfig());
  });

  // ── Init ────────────────────────────────────────────────────────────────

  startGame('classic');
})();
