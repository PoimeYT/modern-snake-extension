class SnakeGame {
  constructor(canvas, mode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = mode; // 'classic' | 'classic+' | 'extreme'
    this.GRID = 20;
    this._rafId = null;
    this._lastTick = 0;
    this._prevSnake = null;

    this.onScoreUpdate = null; // fn(score)
    this.onDeath = null;       // fn(score)
    this.onLevelUp = null;     // fn(level)

    this.reset();
  }

  // Backward-compat accessors so tests and external code can still use game.food
  get food() { return this.foods[0] || null; }
  set food(v) { this.foods[0] = v; }

  reset() {
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this._prevSnake = this.snake.map(s => ({ ...s }));
    this.direction = { x: 1, y: 0 };
    this._inputQueue = []; // FIFO of {x,y} — each tick consumes one entry
    this.obstacles = [];
    this.powerUps = [];
    this.activeEffects = {}; // { slowmo: expiryMs, shield: true, doublescore: expiryMs }
    // Extreme gets 3 simultaneous pellets; other modes get 1
    const foodCount = this.mode === 'extreme' ? 3 : 1;
    this.foods = [];
    for (let i = 0; i < foodCount; i++) {
      const f = this._randomFreeCell();
      if (f) this.foods.push(f);
    }
    this.score = 0;
    this.level = 1;
    this.foodEaten = 0;
    this.tickInterval = 150;
    this.state = 'idle'; // 'idle' | 'running' | 'paused' | 'dead'
  }

  start() {
    this.state = 'running';
    this._lastTick = performance.now();
    this._rafId = requestAnimationFrame(ts => this._loop(ts));
  }

  stop() {
    cancelAnimationFrame(this._rafId);
    this.state = 'idle';
  }

  pause() {
    if (this.state !== 'running') return;
    this.state = 'paused';
    cancelAnimationFrame(this._rafId);
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'running';
    this._lastTick = performance.now();
    this._rafId = requestAnimationFrame(ts => this._loop(ts));
  }

  queueDirection(dx, dy) {
    // Check reversal against the last queued direction (not the committed one),
    // so cornering (e.g. right → up → left in rapid succession) works correctly.
    const last = this._inputQueue[this._inputQueue.length - 1] || this.direction;
    if (dx === -last.x && dy === -last.y) return; // block 180° reversal
    if (dx === last.x && dy === last.y) return;    // skip duplicate
    if (this._inputQueue.length < 3) this._inputQueue.push({ x: dx, y: dy });
  }

  _effectiveInterval() {
    return (this.activeEffects.slowmo && Date.now() < this.activeEffects.slowmo)
      ? this.tickInterval * 2
      : this.tickInterval;
  }

  _loop(ts) {
    const interval = this._effectiveInterval();
    if (ts - this._lastTick >= interval) {
      this._prevSnake = this.snake.map(s => ({ ...s }));
      this._tick();
      this._lastTick = ts;
    }
    if (this.state === 'running') {
      const progress = Math.min(1, (ts - this._lastTick) / this._effectiveInterval());
      this.render(progress);
      this._rafId = requestAnimationFrame(t => this._loop(t));
    }
  }

  _tick() {
    if (this._inputQueue.length > 0) this.direction = this._inputQueue.shift();
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y,
    };

    // Wall collision
    if (head.x < 0 || head.x >= this.GRID || head.y < 0 || head.y >= this.GRID) {
      if (this.activeEffects.shield) {
        delete this.activeEffects.shield;
        head.x = (head.x + this.GRID) % this.GRID;
        head.y = (head.y + this.GRID) % this.GRID;
      } else {
        return this._die();
      }
    }

    // Self collision
    if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
      if (this.activeEffects.shield) { delete this.activeEffects.shield; return; }
      return this._die();
    }

    // Obstacle collision
    if (this.obstacles.some(o => o.x === head.x && o.y === head.y)) {
      if (this.activeEffects.shield) { delete this.activeEffects.shield; return; }
      return this._die();
    }

    this.snake.unshift(head);

    // Multi-food collision — find which pellet was eaten (if any)
    const eatenIdx = this.foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (eatenIdx !== -1) {
      const pts = (this.activeEffects.doublescore && Date.now() < this.activeEffects.doublescore) ? 20 : 10;
      this.score += pts;
      this.foodEaten++;
      this.foods[eatenIdx] = this._randomFreeCell() || this.foods[eatenIdx];
      if (this.onScoreUpdate) this.onScoreUpdate(this.score);
      this._onFoodEaten();
    } else {
      this.snake.pop();
    }

    // Power-up collection + expiry
    const now = Date.now();
    this.powerUps = this.powerUps.filter(p => {
      if (p.x === head.x && p.y === head.y) { this._applyPowerUp(p.type); return false; }
      return p.expiresAt > now;
    });
    if (this.activeEffects.slowmo && now > this.activeEffects.slowmo) delete this.activeEffects.slowmo;
    if (this.activeEffects.doublescore && now > this.activeEffects.doublescore) delete this.activeEffects.doublescore;
  }

  _onFoodEaten() {
    if (this.mode === 'classic') return;
    if (this.foodEaten % 5 !== 0) return;
    this.level++;
    this.tickInterval = Math.max(60, 150 - (this.level - 1) * 10);
    if (this.mode === 'extreme' && this.level >= 3) this._spawnObstacle();
    if (this.mode === 'extreme' && Math.random() < 0.4) this._spawnPowerUp();
    if (this.onLevelUp) this.onLevelUp(this.level);
  }

  _die() {
    this.state = 'dead';
    cancelAnimationFrame(this._rafId);
    if (this.onDeath) this.onDeath(this.score);
  }

  _applyPowerUp(type) {
    const dur = 5000;
    if (type === 'slowmo') this.activeEffects.slowmo = Date.now() + dur;
    else if (type === 'shield') this.activeEffects.shield = true;
    else if (type === 'doublescore') this.activeEffects.doublescore = Date.now() + dur;
  }

  _spawnObstacle() {
    const cell = this._randomFreeCell();
    if (cell) this.obstacles.push(cell);
  }

  _spawnPowerUp() {
    const types = ['slowmo', 'shield', 'doublescore'];
    const type = types[Math.floor(Math.random() * types.length)];
    const cell = this._randomFreeCell();
    if (cell) this.powerUps.push({ ...cell, type, expiresAt: Date.now() + 5000 });
  }

  _randomFreeCell() {
    const occupied = new Set([
      ...this.snake.map(s => `${s.x},${s.y}`),
      ...this.obstacles.map(o => `${o.x},${o.y}`),
      ...(this.powerUps || []).map(p => `${p.x},${p.y}`),
      ...(this.foods || []).map(f => `${f.x},${f.y}`),
    ]);
    const free = [];
    for (let x = 0; x < this.GRID; x++)
      for (let y = 0; y < this.GRID; y++)
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    return free.length ? free[Math.floor(Math.random() * free.length)] : null;
  }

  static bestScoreKey(mode) {
    return 'snake_best_' + mode.replace('+', '_plus');
  }

  static getBestScore(mode) {
    return parseInt(localStorage.getItem(SnakeGame.bestScoreKey(mode)) || '0', 10);
  }

  static saveBestScore(mode, score) {
    if (score > SnakeGame.getBestScore(mode))
      localStorage.setItem(SnakeGame.bestScoreKey(mode), String(score));
  }

  // progress (0-1): how far between the last tick and the next — used for smooth interpolation
  render(progress = 1) {
    const { ctx, canvas, GRID } = this;
    const cell = Math.floor(Math.min(canvas.width, canvas.height) / GRID);
    const ox = Math.floor((canvas.width - cell * GRID) / 2);
    const oy = Math.floor((canvas.height - cell * GRID) / 2);

    // Background
    const bg = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    bg.addColorStop(0, '#0f2040');
    bg.addColorStop(1, '#0a1628');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= GRID; i++) {
      ctx.beginPath(); ctx.moveTo(ox + i * cell, oy); ctx.lineTo(ox + i * cell, oy + cell * GRID); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(ox, oy + i * cell); ctx.lineTo(ox + cell * GRID, oy + i * cell); ctx.stroke();
    }

    // Obstacles
    ctx.fillStyle = 'rgba(239,68,68,0.35)';
    ctx.strokeStyle = 'rgba(239,68,68,0.6)';
    ctx.lineWidth = 1;
    this.obstacles.forEach(o => {
      this._roundRect(ctx, ox + o.x * cell + 2, oy + o.y * cell + 2, cell - 4, cell - 4, 3);
      ctx.fill();
      ctx.stroke();
    });

    // Power-ups
    const puColors = { slowmo: '#3b82f6', shield: '#eab308', doublescore: '#ef4444' };
    this.powerUps.forEach(p => {
      ctx.beginPath();
      ctx.arc(ox + p.x * cell + cell / 2, oy + p.y * cell + cell / 2, cell / 2 - 3, 0, Math.PI * 2);
      ctx.fillStyle = puColors[p.type] || '#fff';
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
    });

    // All food pellets (pulsing)
    const now_ms = Date.now();
    const pulse = 0.85 + 0.15 * Math.sin(now_ms / 300);
    this.foods.forEach(f => {
      const fx = ox + f.x * cell + cell / 2;
      const fy = oy + f.y * cell + cell / 2;
      ctx.beginPath();
      ctx.arc(fx, fy, (cell / 2 - 2) * pulse, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(99,179,237,0.9)';
      ctx.shadowColor = '#63b3ed';
      ctx.shadowBlur = 10;
      ctx.fill();
      ctx.shadowBlur = 0;
    });

    // Snake segments — interpolated between previous and current grid positions
    const prev = this._prevSnake || this.snake;
    this.snake.forEach((seg, i) => {
      const pseg = prev[i] || seg;
      const dx = seg.x - pseg.x;
      const dy = seg.y - pseg.y;
      // Skip interpolation across a wall-wrap discontinuity (jump > half the grid)
      const lx = Math.abs(dx) <= this.GRID / 2 ? pseg.x + dx * progress : seg.x;
      const ly = Math.abs(dy) <= this.GRID / 2 ? pseg.y + dy * progress : seg.y;
      const alpha = i === 0 ? 0.9 : Math.max(0.2, 0.7 - i * 0.02);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.strokeStyle = `rgba(99,179,237,${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(99,179,237,0.4)';
      ctx.shadowBlur = i === 0 ? 10 : 4;
      this._roundRect(ctx, ox + lx * cell + 1, oy + ly * cell + 1, cell - 2, cell - 2, Math.ceil(cell * 0.25));
      ctx.fill();
      ctx.stroke();
    });
    ctx.shadowBlur = 0;

    // Idle hint
    if (this.state === 'idle') {
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.font = `${Math.max(9, Math.floor(cell * 0.55))}px system-ui`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('press any arrow key to start', canvas.width / 2, canvas.height / 2);
    }
  }

  _roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }
}
