(function () {
  const canvas = document.getElementById('game-canvas');
  const hudMode = document.getElementById('hud-mode');
  const hudScore = document.getElementById('hud-score');
  const overlay = document.getElementById('overlay');
  const overlayScore = document.getElementById('overlay-score');
  const overlayBest = document.getElementById('overlay-best');
  const pauseOverlay = document.getElementById('pause-overlay');

  const params = new URLSearchParams(location.search);
  const mode = params.get('mode') || 'classic';
  hudMode.textContent = mode.toUpperCase();

  let game = null;

  function syncCanvasSize() {
    const size = Math.min(window.innerWidth, window.innerHeight, 600);
    canvas.width = size;
    canvas.height = size;
  }

  function showOverlay(score) {
    overlayScore.textContent = 'SCORE: ' + score;
    overlayBest.textContent = 'BEST: ' + SnakeGame.getBestScore(mode);
    overlay.classList.add('visible');
  }

  function hideOverlay() {
    overlay.classList.remove('visible');
  }

  function startGame() {
    syncCanvasSize();
    hideOverlay();

    if (game) game.stop();
    game = new SnakeGame(canvas, mode);

    game.onScoreUpdate = function (score) {
      hudScore.textContent = score;
    };

    game.onDeath = function (score) {
      SnakeGame.saveBestScore(mode, score);
      const ctx = game.ctx;
      let alpha = 0.4;
      const flash = setInterval(function () {
        game.render();
        ctx.fillStyle = 'rgba(239,68,68,' + alpha + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        alpha -= 0.05;
        if (alpha <= 0) { clearInterval(flash); showOverlay(score); }
      }, 40);
    };

    game.render();
  }

  const DIR_MAP = {
    ArrowUp: [0, -1], ArrowDown: [0, 1],
    ArrowLeft: [-1, 0], ArrowRight: [1, 0],
    w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0],
  };

  document.addEventListener('keydown', function (e) {
    if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') {
      if (!game) return;
      if (game.state === 'running') {
        game.pause();
        pauseOverlay.classList.add('visible');
      } else if (game.state === 'paused') {
        game.resume();
        pauseOverlay.classList.remove('visible');
      }
      return;
    }

    if (game && game.state === 'paused') {
      game.resume();
      pauseOverlay.classList.remove('visible');
      return;
    }

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
    hudScore.textContent = '0';
    hideOverlay();
    if (game) { game.reset(); game.render(); }
  });

  document.getElementById('btn-close-tab').addEventListener('click', function () {
    window.close();
  });

  document.getElementById('close-btn').addEventListener('click', function () {
    window.close();
  });

  window.addEventListener('resize', function () {
    if (!game) return;
    syncCanvasSize();
    game.render();
  });

  startGame();
})();
