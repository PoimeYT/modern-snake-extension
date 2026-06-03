(function () {
  const canvas = document.getElementById('game-canvas');
  const wrap = canvas.parentElement;
  const liveScore = document.getElementById('live-score');
  const bestScore = document.getElementById('best-score');
  const overlay = document.getElementById('overlay');
  const overlayScore = document.getElementById('overlay-score');
  const overlayBest = document.getElementById('overlay-best');
  const tabs = document.querySelectorAll('.tab');

  let game = null;
  let activeMode = 'classic';
  let flashInterval = null;

  function syncCanvasSize() {
    canvas.width = wrap.clientWidth;
    canvas.height = wrap.clientHeight;
  }

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

  function startGame(mode) {
    activeMode = mode;
    syncCanvasSize();
    hideOverlay();
    liveScore.textContent = 'SCORE: 0';

    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    if (game) game.stop();
    game = new SnakeGame(canvas, mode);

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

  tabs.forEach(function (tab) {
    tab.addEventListener('click', function () {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      startGame(tab.dataset.mode);
    });
  });

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

  document.getElementById('btn-again').addEventListener('click', function () {
    if (flashInterval) { clearInterval(flashInterval); flashInterval = null; }
    hideOverlay();
    liveScore.textContent = 'SCORE: 0';
    if (game) { game.reset(); game.render(); }
  });

  document.getElementById('btn-menu').addEventListener('click', function () {
    startGame(activeMode);
  });

  document.getElementById('expand-btn').addEventListener('click', function () {
    const url = chrome.runtime.getURL('fullscreen.html') + '?mode=' + encodeURIComponent(activeMode);
    chrome.tabs.create({ url: url });
  });

  startGame('classic');
})();
