# Modern Snake Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a polished, Minimal Glass-themed Snake browser extension for Chrome and Firefox with three selectable game modes (Classic, Classic+, Extreme) and a popup/fullscreen entry point.

**Architecture:** Vanilla JS, no build step, Manifest V3. A shared `SnakeGame` class handles all game logic and canvas rendering. Thin `popup.js` and `fullscreen.js` controllers wire up UI events. Scores persist to `localStorage` only — no background service worker needed.

**Tech Stack:** HTML5 Canvas, CSS custom properties, Vanilla JS (class syntax), Chrome/Firefox MV3 APIs, localStorage

---

## File Map

| File | Responsibility |
|---|---|
| `manifest.json` | MV3 extension manifest (Chrome + Firefox) |
| `style.css` | Minimal Glass design tokens and shared component styles |
| `game.js` | `SnakeGame` class — all game logic and canvas rendering |
| `popup.html` | Popup shell: header, tab bar, canvas wrap, footer |
| `popup.js` | Popup controller: tab switching, keyboard, score HUD, expand button |
| `fullscreen.html` | Full-window game page |
| `fullscreen.js` | Fullscreen controller: resize handling, pause overlay, close button |
| `icons/generate.html` | Browser-runnable icon generator (canvas → PNG download) |
| `tests/test-game.html` | Browser-runnable unit tests for `game.js` logic |

---

### Task 1: Project scaffold

**Files:**
- Create: `manifest.json`
- Create: `.gitignore`

- [ ] **Step 1: Initialize git repo**

```bash
git init
git branch -M main
```

- [ ] **Step 2: Create directory structure**

```bash
mkdir -p icons tests docs/superpowers/specs docs/superpowers/plans
```

- [ ] **Step 3: Write manifest.json**

```json
{
  "manifest_version": 3,
  "name": "Snake",
  "version": "1.0.0",
  "description": "A modern Snake game. Three modes. Zero distractions.",
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "48": "icons/icon-48.png",
      "128": "icons/icon-128.png"
    }
  },
  "icons": {
    "16": "icons/icon-16.png",
    "48": "icons/icon-48.png",
    "128": "icons/icon-128.png"
  },
  "permissions": []
}
```

Note: no `permissions` entry needed — `chrome.tabs.create` with an extension-owned URL does not require the `tabs` permission.

- [ ] **Step 4: Write .gitignore**

```
.DS_Store
*.zip
.superpowers/
```

- [ ] **Step 5: Commit**

```bash
git add manifest.json .gitignore docs/
git commit -m "feat: project scaffold and manifest"
```

---

### Task 2: Minimal Glass styles (style.css)

**Files:**
- Create: `style.css`

- [ ] **Step 1: Write style.css**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-start: #0f2040;
  --bg-end: #0a1628;
  --glass: rgba(255, 255, 255, 0.05);
  --glass-border: rgba(255, 255, 255, 0.1);
  --accent: rgba(99, 179, 237, 0.9);
  --accent-dim: rgba(99, 179, 237, 0.25);
  --text: rgba(255, 255, 255, 0.9);
  --text-dim: rgba(255, 255, 255, 0.35);
}

html, body {
  height: 100%;
  background: linear-gradient(160deg, var(--bg-start), var(--bg-end));
  color: var(--text);
  font-family: system-ui, -apple-system, sans-serif;
  user-select: none;
  -webkit-user-select: none;
}

/* ── Popup shell ─────────────────────────────────── */
.popup-shell {
  display: flex;
  flex-direction: column;
  width: 380px;
  height: 480px;
  overflow: hidden;
}

.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 8px;
  border-bottom: 1px solid var(--glass-border);
}

.wordmark {
  font-size: 11px;
  letter-spacing: 5px;
  font-weight: 600;
  color: var(--text);
}

.best-score {
  font-size: 10px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

/* ── Tab bar ─────────────────────────────────────── */
.tab-bar {
  display: flex;
  gap: 4px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.2);
  border-bottom: 1px solid var(--glass-border);
}

.tab {
  flex: 1;
  padding: 5px 0;
  text-align: center;
  font-size: 9px;
  letter-spacing: 1.5px;
  font-weight: 600;
  color: var(--text-dim);
  border-radius: 20px;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.tab:hover { color: var(--text); }

.tab.active {
  background: var(--accent-dim);
  color: var(--accent);
}

/* ── Canvas area ─────────────────────────────────── */
.canvas-wrap {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas-wrap canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* ── Game over overlay ───────────────────────────── */
.overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  background: rgba(10, 22, 40, 0.85);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.3s ease;
}

.overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.overlay-title {
  font-size: 18px;
  letter-spacing: 6px;
  font-weight: 700;
  color: var(--text);
}

.overlay-score {
  font-size: 13px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

.overlay-best {
  font-size: 11px;
  color: var(--accent);
  letter-spacing: 1px;
}

.overlay-buttons {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

/* ── Buttons ─────────────────────────────────────── */
.btn {
  padding: 8px 18px;
  border-radius: 20px;
  border: 1px solid var(--glass-border);
  background: var(--glass);
  color: var(--text);
  font-size: 10px;
  letter-spacing: 1.5px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: var(--accent-dim);
}

.btn.primary {
  background: var(--accent-dim);
  border-color: var(--accent);
  color: var(--accent);
}

.btn.primary:hover {
  background: rgba(99, 179, 237, 0.35);
}

/* ── Popup footer ────────────────────────────────── */
.popup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-top: 1px solid var(--glass-border);
}

.live-score {
  font-size: 12px;
  color: var(--text-dim);
  letter-spacing: 1px;
}

.expand-btn {
  background: none;
  border: 1px solid var(--glass-border);
  border-radius: 6px;
  color: var(--text-dim);
  font-size: 14px;
  width: 28px;
  height: 24px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.15s, border-color 0.15s;
}

.expand-btn:hover {
  color: var(--accent);
  border-color: var(--accent-dim);
}

/* ── Pause overlay (fullscreen) ──────────────────── */
.pause-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(10, 22, 40, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.pause-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.pause-title {
  font-size: 20px;
  letter-spacing: 6px;
  font-weight: 700;
}

.pause-hint {
  font-size: 11px;
  color: var(--text-dim);
  letter-spacing: 2px;
}

/* ── Fullscreen close button ─────────────────────── */
.close-btn {
  position: fixed;
  top: 16px;
  right: 16px;
  background: var(--glass);
  border: 1px solid var(--glass-border);
  border-radius: 8px;
  color: var(--text-dim);
  font-size: 16px;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
  z-index: 10;
}

.close-btn:hover {
  color: var(--text);
  border-color: var(--accent-dim);
}

/* ── Fullscreen HUD ──────────────────────────────── */
.fullscreen-hud {
  position: fixed;
  top: 16px;
  left: 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 10;
}

.hud-mode {
  font-size: 9px;
  letter-spacing: 3px;
  color: var(--text-dim);
}

.hud-score {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text);
}

/* ── Fullscreen game-over overlay ────────────────── */
.fullscreen-overlay-wrap {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 20;
}

.fullscreen-overlay-wrap .overlay {
  position: absolute;
  pointer-events: auto;
}
```

- [ ] **Step 2: Commit**

```bash
git add style.css
git commit -m "feat: Minimal Glass shared styles"
```

---

### Task 3: Game engine — Classic mode (game.js)

**Files:**
- Create: `game.js`

Implements the full `SnakeGame` class. Classic+ and Extreme mode hooks (`_onFoodEaten`) are stubs here — filled in Task 5.

- [ ] **Step 1: Write game.js**

```javascript
class SnakeGame {
  constructor(canvas, mode) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.mode = mode; // 'classic' | 'classic+' | 'extreme'
    this.GRID = 20;
    this._rafId = null;
    this._lastTick = 0;

    this.onScoreUpdate = null; // fn(score)
    this.onDeath = null;       // fn(score)
    this.onLevelUp = null;     // fn(level)

    this.reset();
  }

  reset() {
    this.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    this.direction = { x: 1, y: 0 };
    this.nextDirection = { x: 1, y: 0 };
    this.obstacles = [];
    this.powerUps = [];
    this.activeEffects = {}; // { slowmo: expiryMs, shield: true, doublescore: expiryMs }
    this.food = this._randomFreeCell(); // must come after obstacles/powerUps are initialized
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
    if (dx === -this.direction.x && dy === -this.direction.y) return;
    this.nextDirection = { x: dx, y: dy };
  }

  _loop(ts) {
    const effective = (this.activeEffects.slowmo && Date.now() < this.activeEffects.slowmo)
      ? this.tickInterval * 2
      : this.tickInterval;
    if (ts - this._lastTick >= effective) {
      this._tick();
      this._lastTick = ts;
    }
    if (this.state === 'running') {
      this.render();
      this._rafId = requestAnimationFrame(t => this._loop(t));
    }
  }

  _tick() {
    this.direction = { ...this.nextDirection };
    const head = {
      x: this.snake[0].x + this.direction.x,
      y: this.snake[0].y + this.direction.y,
    };

    // Wall collision
    if (head.x < 0 || head.x >= this.GRID || head.y < 0 || head.y >= this.GRID) {
      if (this.activeEffects.shield) { delete this.activeEffects.shield; return; }
      return this._die();
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

    if (head.x === this.food.x && head.y === this.food.y) {
      const pts = (this.activeEffects.doublescore && Date.now() < this.activeEffects.doublescore) ? 20 : 10;
      this.score += pts;
      this.foodEaten++;
      this.food = this._randomFreeCell();
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
    // Classic: no progression. Overridden in Task 5.
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
      this.food ? `${this.food.x},${this.food.y}` : '',
    ]);
    const free = [];
    for (let x = 0; x < this.GRID; x++)
      for (let y = 0; y < this.GRID; y++)
        if (!occupied.has(`${x},${y}`)) free.push({ x, y });
    return free[Math.floor(Math.random() * free.length)] || { x: 0, y: 0 };
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

  render() {
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

    // Food (pulsing)
    const fx = ox + this.food.x * cell + cell / 2;
    const fy = oy + this.food.y * cell + cell / 2;
    const pulse = 0.85 + 0.15 * Math.sin(Date.now() / 300);
    ctx.beginPath();
    ctx.arc(fx, fy, (cell / 2 - 2) * pulse, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99,179,237,0.9)';
    ctx.shadowColor = '#63b3ed';
    ctx.shadowBlur = 10;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Snake segments
    this.snake.forEach((seg, i) => {
      const alpha = i === 0 ? 0.9 : Math.max(0.2, 0.7 - i * 0.02);
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.strokeStyle = `rgba(99,179,237,${alpha * 0.5})`;
      ctx.lineWidth = 1;
      ctx.shadowColor = 'rgba(99,179,237,0.4)';
      ctx.shadowBlur = i === 0 ? 10 : 4;
      this._roundRect(ctx, ox + seg.x * cell + 1, oy + seg.y * cell + 1, cell - 2, cell - 2, Math.ceil(cell * 0.25));
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
```

- [ ] **Step 2: Commit**

```bash
git add game.js
git commit -m "feat: SnakeGame engine — Classic mode with full rendering"
```

---

### Task 4: Browser test harness (tests/test-game.html)

**Files:**
- Create: `tests/test-game.html`

- [ ] **Step 1: Write tests/test-game.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>SnakeGame Tests</title>
  <style>
    body { font-family: monospace; background: #0a1628; color: #ccc; padding: 24px; }
    h1 { color: #63b3ed; margin-bottom: 16px; letter-spacing: 2px; }
    .pass { color: #4ade80; }
    .fail { color: #f87171; font-weight: bold; }
    .suite { margin: 16px 0 4px; color: #93c5fd; font-weight: bold; }
    #summary { margin-top: 20px; font-size: 14px; border-top: 1px solid #1e3a5f; padding-top: 12px; }
  </style>
</head>
<body>
<h1>SNAKE — UNIT TESTS</h1>
<div id="output"></div>
<div id="summary"></div>

<script src="../game.js"></script>
<script>
  const out = document.getElementById('output');
  let passed = 0, failed = 0;

  function assert(condition, msg) {
    const el = document.createElement('div');
    el.className = condition ? 'pass' : 'fail';
    el.textContent = (condition ? '  ✓ ' : '  ✗ ') + msg;
    out.appendChild(el);
    condition ? passed++ : failed++;
  }

  function suite(name) {
    const el = document.createElement('div');
    el.className = 'suite';
    el.textContent = name;
    out.appendChild(el);
  }

  function mockCanvas() {
    const noop = () => mockCtx;
    const mockCtx = new Proxy({}, {
      get(_, p) {
        if (p === 'createLinearGradient' || p === 'createRadialGradient')
          return () => ({ addColorStop: () => {} });
        return noop;
      },
      set() { return true; }
    });
    return { width: 400, height: 400, getContext: () => mockCtx };
  }

  function makeGame(mode) {
    return new SnakeGame(mockCanvas(), mode || 'classic');
  }

  // ── Initial state ─────────────────────────────────────────────────────
  suite('Initial state');
  (() => {
    const g = makeGame();
    assert(g.snake.length === 3, 'snake starts with 3 segments');
    assert(g.snake[0].x === 10 && g.snake[0].y === 10, 'head starts at (10,10)');
    assert(g.direction.x === 1 && g.direction.y === 0, 'initial direction is right');
    assert(g.score === 0, 'score starts at 0');
    assert(g.state === 'idle', 'state starts as idle');
    assert(g.food !== null, 'food is spawned on reset');
  })();

  // ── Direction queuing ─────────────────────────────────────────────────
  suite('Direction queuing');
  (() => {
    const g = makeGame();
    g.queueDirection(0, 1);
    assert(g.nextDirection.x === 0 && g.nextDirection.y === 1, 'queues valid direction');

    g.direction = { x: 1, y: 0 };
    g.queueDirection(-1, 0); // 180° reversal — should be ignored
    assert(g.nextDirection.x !== -1, 'ignores 180° reversal');
  })();

  // ── Wall collision ────────────────────────────────────────────────────
  suite('Wall collision');
  (() => {
    const g = makeGame();
    g.state = 'running';
    g.snake = [{ x: 0, y: 5 }];
    g.direction = { x: -1, y: 0 };
    g.nextDirection = { x: -1, y: 0 };
    g.food = { x: 15, y: 15 };
    g._tick();
    assert(g.state === 'dead', 'left wall causes death');

    const g2 = makeGame();
    g2.state = 'running';
    g2.snake = [{ x: 19, y: 5 }];
    g2.direction = { x: 1, y: 0 };
    g2.nextDirection = { x: 1, y: 0 };
    g2.food = { x: 15, y: 15 };
    g2._tick();
    assert(g2.state === 'dead', 'right wall causes death');

    const g3 = makeGame();
    g3.state = 'running';
    g3.snake = [{ x: 5, y: 0 }];
    g3.direction = { x: 0, y: -1 };
    g3.nextDirection = { x: 0, y: -1 };
    g3.food = { x: 15, y: 15 };
    g3._tick();
    assert(g3.state === 'dead', 'top wall causes death');
  })();

  // ── Self collision ────────────────────────────────────────────────────
  suite('Self collision');
  (() => {
    const g = makeGame();
    g.state = 'running';
    // Head at (5,5), body at (5,6). Moving down walks into body.
    g.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }];
    g.direction = { x: 0, y: 1 };
    g.nextDirection = { x: 0, y: 1 };
    g.food = { x: 15, y: 15 };
    g._tick();
    assert(g.state === 'dead', 'self collision causes death');
  })();

  // ── Food eating ───────────────────────────────────────────────────────
  suite('Food eating');
  (() => {
    const g = makeGame();
    g.state = 'running';
    g.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }];
    g.direction = { x: 1, y: 0 };
    g.nextDirection = { x: 1, y: 0 };
    g.food = { x: 6, y: 5 };
    const prevLen = g.snake.length;
    g._tick();
    assert(g.score === 10, 'score increases by 10 on food');
    assert(g.snake.length === prevLen + 1, 'snake grows on food');
    assert(g.foodEaten === 1, 'foodEaten counter increments');
    assert(!(g.food.x === 6 && g.food.y === 5), 'food respawns after eaten');
  })();

  // ── Shield absorbs collision ──────────────────────────────────────────
  suite('Shield power-up');
  (() => {
    const g = makeGame('extreme');
    g.state = 'running';
    g.snake = [{ x: 0, y: 5 }];
    g.direction = { x: -1, y: 0 };
    g.nextDirection = { x: -1, y: 0 };
    g.food = { x: 15, y: 15 };
    g.activeEffects.shield = true;
    g._tick();
    assert(g.state !== 'dead', 'shield absorbs wall collision');
    assert(!g.activeEffects.shield, 'shield is consumed after use');

    const g2 = makeGame('extreme');
    g2.state = 'running';
    g2.snake = [{ x: 5, y: 5 }, { x: 5, y: 6 }];
    g2.direction = { x: 0, y: 1 };
    g2.nextDirection = { x: 0, y: 1 };
    g2.food = { x: 15, y: 15 };
    g2.activeEffects.shield = true;
    g2._tick();
    assert(g2.state !== 'dead', 'shield absorbs self collision');
  })();

  // ── Power-up collection ───────────────────────────────────────────────
  suite('Power-up collection');
  (() => {
    const g = makeGame('extreme');
    g.state = 'running';
    g.snake = [{ x: 5, y: 5 }];
    g.direction = { x: 1, y: 0 };
    g.nextDirection = { x: 1, y: 0 };
    g.food = { x: 15, y: 15 };
    g.powerUps = [{ x: 6, y: 5, type: 'shield', expiresAt: Date.now() + 5000 }];
    g._tick();
    assert(g.activeEffects.shield === true, 'shield power-up collected and applied');
    assert(g.powerUps.length === 0, 'power-up removed after collection');

    const g2 = makeGame('extreme');
    g2.state = 'running';
    g2.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }];
    g2.direction = { x: 1, y: 0 };
    g2.nextDirection = { x: 1, y: 0 };
    g2.food = { x: 6, y: 5 };
    g2.activeEffects.doublescore = Date.now() + 5000;
    g2._tick();
    assert(g2.score === 20, 'double-score effect doubles food points');
  })();

  const summary = document.getElementById('summary');
  summary.textContent = `${passed + failed} tests — ${passed} passed, ${failed} failed`;
  summary.style.color = failed === 0 ? '#4ade80' : '#f87171';
</script>
</body>
</html>
```

- [ ] **Step 2: Open in browser and verify all tests pass**

```bash
open tests/test-game.html
```

Expected: all entries show green ✓, summary line reads "0 failed".

- [ ] **Step 3: Commit**

```bash
git add tests/test-game.html
git commit -m "test: browser test harness for SnakeGame core"
```

---

### Task 5: Classic+ mode — level progression and hi-score

**Files:**
- Modify: `game.js` — replace `_onFoodEaten()` stub

- [ ] **Step 1: Replace the `_onFoodEaten` stub in game.js**

Find this method in `game.js`:

```javascript
  _onFoodEaten() {
    // Classic: no progression. Overridden in Task 5.
  }
```

Replace it with:

```javascript
  _onFoodEaten() {
    if (this.mode === 'classic') return;
    if (this.foodEaten % 5 !== 0) return;
    this.level++;
    this.tickInterval = Math.max(60, 150 - (this.level - 1) * 10);
    if (this.mode === 'extreme' && this.level >= 3) this._spawnObstacle();
    if (this.mode === 'extreme' && Math.random() < 0.4) this._spawnPowerUp();
    if (this.onLevelUp) this.onLevelUp(this.level);
  }
```

- [ ] **Step 2: Add level progression tests to tests/test-game.html**

Inside the `<script>` tag, just before the `const summary = ...` line, add:

```javascript
  // ── Level progression (Classic+) ─────────────────────────────────────
  suite('Level progression (Classic+)');
  (() => {
    const g = makeGame('classic+');
    g.state = 'running';
    for (let i = 0; i < 5; i++) {
      g.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }];
      g.direction = { x: 1, y: 0 };
      g.nextDirection = { x: 1, y: 0 };
      g.food = { x: 6, y: 5 };
      g._tick();
    }
    assert(g.level === 2, 'level increases to 2 after 5 food');
    assert(g.tickInterval === 140, 'tick interval decreases to 140ms at level 2');

    // Eat 45 more (total 50 food → level 11)
    for (let i = 0; i < 45; i++) {
      g.snake = [{ x: 5, y: 5 }, { x: 4, y: 5 }];
      g.direction = { x: 1, y: 0 };
      g.nextDirection = { x: 1, y: 0 };
      g.food = { x: 6, y: 5 };
      g._tick();
    }
    assert(g.tickInterval >= 60, 'tick interval never goes below 60ms floor');
  })();

  // ── Obstacle collision (Extreme) ──────────────────────────────────────
  suite('Obstacle collision (Extreme)');
  (() => {
    const g = makeGame('extreme');
    g.state = 'running';
    g.snake = [{ x: 5, y: 5 }];
    g.direction = { x: 1, y: 0 };
    g.nextDirection = { x: 1, y: 0 };
    g.food = { x: 15, y: 15 };
    g.obstacles = [{ x: 6, y: 5 }];
    g._tick();
    assert(g.state === 'dead', 'obstacle collision causes death');

    const g2 = makeGame('extreme');
    g2.state = 'running';
    g2.snake = [{ x: 5, y: 5 }];
    g2.direction = { x: 1, y: 0 };
    g2.nextDirection = { x: 1, y: 0 };
    g2.food = { x: 15, y: 15 };
    g2.obstacles = [{ x: 6, y: 5 }];
    g2.activeEffects.shield = true;
    g2._tick();
    assert(g2.state !== 'dead', 'shield absorbs obstacle collision');
  })();
```

- [ ] **Step 3: Reload tests/test-game.html and verify all tests pass**

- [ ] **Step 4: Commit**

```bash
git add game.js tests/test-game.html
git commit -m "feat: Classic+ level progression, speed scaling, and hi-score"
```

---

### Task 6: Popup UI (popup.html + popup.js)

**Files:**
- Create: `popup.html`
- Create: `popup.js`

- [ ] **Step 1: Write popup.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snake</title>
  <link rel="stylesheet" href="style.css">
  <style>
    body { width: 380px; height: 480px; overflow: hidden; }
  </style>
</head>
<body>
<div class="popup-shell">

  <div class="popup-header">
    <span class="wordmark">SNAKE</span>
    <span class="best-score" id="best-score">BEST: 0</span>
  </div>

  <div class="tab-bar">
    <div class="tab active" data-mode="classic">CLASSIC</div>
    <div class="tab" data-mode="classic+">CLASSIC+</div>
    <div class="tab" data-mode="extreme">EXTREME</div>
  </div>

  <div class="canvas-wrap">
    <canvas id="game-canvas"></canvas>
    <div class="overlay" id="overlay">
      <div class="overlay-title">GAME OVER</div>
      <div class="overlay-score" id="overlay-score">SCORE: 0</div>
      <div class="overlay-best" id="overlay-best">BEST: 0</div>
      <div class="overlay-buttons">
        <button class="btn primary" id="btn-again">↩ PLAY AGAIN</button>
        <button class="btn" id="btn-menu">⌂ MENU</button>
      </div>
    </div>
  </div>

  <div class="popup-footer">
    <span class="live-score" id="live-score">SCORE: 0</span>
    <button class="expand-btn" id="expand-btn" title="Open fullscreen">⛶</button>
  </div>

</div>
<script src="game.js"></script>
<script src="popup.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write popup.js**

```javascript
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
      const flash = setInterval(function () {
        game.render();
        ctx.fillStyle = 'rgba(239,68,68,' + alpha + ')';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        alpha -= 0.05;
        if (alpha <= 0) { clearInterval(flash); showOverlay(score); }
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
```

- [ ] **Step 3: Load extension in Chrome**

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked** → select the project directory
4. Click the Snake icon in the Chrome toolbar

Expected: 380×480px popup with "SNAKE" wordmark, three tabs, canvas showing idle hint, "SCORE: 0" footer.

- [ ] **Step 4: Smoke-test Classic mode**

- Press an arrow key — snake starts moving
- Eat food — footer score increments
- Die — red flash then game-over overlay
- Click **↩ PLAY AGAIN** — canvas resets to idle
- Click **⌂ MENU** — canvas resets to idle, score clears

- [ ] **Step 5: Smoke-test tab switching**

Click CLASSIC+ then EXTREME — each should reset canvas and update best score display.

- [ ] **Step 6: Commit**

```bash
git add popup.html popup.js
git commit -m "feat: popup UI with tab bar, keyboard input, and game-over overlay"
```

---

### Task 7: Fullscreen page (fullscreen.html + fullscreen.js)

**Files:**
- Create: `fullscreen.html`
- Create: `fullscreen.js`

- [ ] **Step 1: Write fullscreen.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snake</title>
  <link rel="stylesheet" href="style.css">
  <style>
    body { margin: 0; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
  </style>
</head>
<body>

  <div class="fullscreen-hud">
    <div class="hud-mode" id="hud-mode">CLASSIC</div>
    <div class="hud-score" id="hud-score">0</div>
  </div>

  <button class="close-btn" id="close-btn" title="Close">✕</button>

  <canvas id="game-canvas"></canvas>

  <div class="fullscreen-overlay-wrap">
    <div class="overlay" id="overlay">
      <div class="overlay-title">GAME OVER</div>
      <div class="overlay-score" id="overlay-score">SCORE: 0</div>
      <div class="overlay-best" id="overlay-best">BEST: 0</div>
      <div class="overlay-buttons">
        <button class="btn primary" id="btn-again">↩ PLAY AGAIN</button>
        <button class="btn" id="btn-close-tab">✕ CLOSE</button>
      </div>
    </div>
  </div>

  <div class="pause-overlay" id="pause-overlay">
    <div class="pause-title">PAUSED</div>
    <div class="pause-hint">PRESS ANY KEY TO RESUME</div>
  </div>

<script src="game.js"></script>
<script src="fullscreen.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write fullscreen.js**

```javascript
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
```

- [ ] **Step 3: Test expand button**

In Chrome with the extension loaded, click `⛶` in the popup footer. A new tab should open showing the fullscreen game. HUD shows mode name top-left, score top-right.

- [ ] **Step 4: Test pause**

Start the fullscreen game, press `P` — pause overlay appears. Press any key — game resumes.

- [ ] **Step 5: Test close**

Click `✕` top-right — tab closes. Alternatively, die and click `✕ CLOSE` from the game-over overlay.

- [ ] **Step 6: Test resize**

While the fullscreen tab is open, resize the browser window — canvas should resize and re-render.

- [ ] **Step 7: Commit**

```bash
git add fullscreen.html fullscreen.js
git commit -m "feat: fullscreen game page with pause, resize, and close-tab"
```

---

### Task 8: Extension icons

**Files:**
- Create: `icons/generate.html`
- Create: `icons/icon-16.png`, `icons/icon-48.png`, `icons/icon-128.png`

- [ ] **Step 1: Write icons/generate.html**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Snake Icon Generator</title>
  <style>
    body { background: #0a1628; color: #ccc; font-family: system-ui; padding: 24px; }
    h2 { color: #63b3ed; margin-bottom: 8px; }
    p { margin-bottom: 20px; color: #888; }
    .icon-row { display: flex; align-items: flex-end; gap: 24px; flex-wrap: wrap; }
    .icon-item { display: flex; flex-direction: column; align-items: center; gap: 8px; }
    canvas { border-radius: 8px; image-rendering: pixelated; }
    button { padding: 6px 14px; background: rgba(99,179,237,0.2); border: 1px solid rgba(99,179,237,0.5); color: #63b3ed; border-radius: 6px; cursor: pointer; font-size: 12px; }
    button:hover { background: rgba(99,179,237,0.35); }
  </style>
</head>
<body>
<h2>Snake — Icon Generator</h2>
<p>Click each download button, then save the file to the <code>icons/</code> folder with the exact filename shown.</p>
<div class="icon-row" id="icons"></div>

<script>
  function drawIcon(size) {
    const c = document.createElement('canvas');
    c.width = size; c.height = size;
    const ctx = c.getContext('2d');
    const r = size * 0.18;

    // Rounded background
    const bg = ctx.createLinearGradient(0, 0, size, size);
    bg.addColorStop(0, '#0f2040');
    bg.addColorStop(1, '#0a1628');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.roundRect(0, 0, size, size, r);
    ctx.fill();

    const cell = size / 5;
    const pad = cell * 0.12;
    const segR = Math.max(1, cell * 0.3);

    function seg(gx, gy, alpha) {
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.strokeStyle = `rgba(99,179,237,${alpha * 0.55})`;
      ctx.lineWidth = Math.max(0.5, size * 0.012);
      ctx.shadowColor = 'rgba(99,179,237,0.5)';
      ctx.shadowBlur = size * 0.06;
      ctx.beginPath();
      ctx.roundRect(gx * cell + pad, gy * cell + pad, cell - pad * 2, cell - pad * 2, segR);
      ctx.fill(); ctx.stroke();
    }

    // Snake: L-shape (head at top-right going left-then-down)
    seg(3, 1, 0.92);
    seg(2, 1, 0.70);
    seg(1, 1, 0.50);
    seg(1, 2, 0.35);
    ctx.shadowBlur = 0;

    // Food dot
    const fx = 3.5 * cell, fy = 3.5 * cell, fr = cell * 0.32;
    ctx.beginPath();
    ctx.arc(fx, fy, fr, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(99,179,237,0.92)';
    ctx.shadowColor = '#63b3ed';
    ctx.shadowBlur = size * 0.07;
    ctx.fill();
    ctx.shadowBlur = 0;

    return c;
  }

  const container = document.getElementById('icons');
  [16, 48, 128].forEach(size => {
    const canvas = drawIcon(size);
    canvas.style.width = Math.max(size, 80) + 'px';
    canvas.style.height = Math.max(size, 80) + 'px';

    const btn = document.createElement('button');
    btn.textContent = 'Download icon-' + size + '.png';
    btn.onclick = () => {
      const a = document.createElement('a');
      a.download = 'icon-' + size + '.png';
      a.href = canvas.toDataURL('image/png');
      a.click();
    };

    const item = document.createElement('div');
    item.className = 'icon-item';
    item.appendChild(canvas);
    item.appendChild(btn);
    container.appendChild(item);
  });
</script>
</body>
</html>
```

- [ ] **Step 2: Generate and save the three icons**

```bash
open icons/generate.html
```

In the browser that opens:
1. Click **Download icon-16.png** → your browser downloads it → move/rename to `icons/icon-16.png`
2. Click **Download icon-48.png** → move/rename to `icons/icon-48.png`
3. Click **Download icon-128.png** → move/rename to `icons/icon-128.png`

- [ ] **Step 3: Reload extension in Chrome and verify icon appears in toolbar**

Go to `chrome://extensions` → click the reload button (↺) on the Snake extension. The Snake icon should now appear in the Chrome toolbar with correct artwork.

- [ ] **Step 4: Commit**

```bash
git add icons/
git commit -m "feat: extension icons generated from canvas"
```

---

### Task 9: Final testing and packaging

**Files:** none — testing and zip packaging

- [ ] **Step 1: Full Chrome smoke-test**

Reload the extension at `chrome://extensions`. Verify each item:

- [ ] Popup opens at correct size (380×480px)
- [ ] SNAKE wordmark visible, BEST score shows (0 initially)
- [ ] Three tabs — CLASSIC · CLASSIC+ · EXTREME — tab highlight switches correctly
- [ ] Canvas shows "press any arrow key to start" idle hint
- [ ] Arrow keys start the game; WASD also works
- [ ] Score increments in footer on food eaten
- [ ] Snake speeds up in Classic+ after every 5 food
- [ ] Obstacles appear in Extreme at level 3+
- [ ] Power-ups (blue/yellow/red circles) spawn and can be collected
- [ ] Red flash plays on death, then game-over overlay fades in
- [ ] PLAY AGAIN resets to idle correctly
- [ ] MENU resets to idle correctly
- [ ] Best score persists after closing and reopening popup
- [ ] `⛶` button opens fullscreen.html in a new tab

- [ ] **Step 2: Fullscreen smoke-test**

- [ ] Fullscreen canvas is square, centered, max 600×600px
- [ ] Mode name and score shown in HUD
- [ ] `P` key pauses — overlay appears; any key resumes
- [ ] `✕` top-right closes the tab
- [ ] Resizing the browser window resizes the canvas
- [ ] Death in fullscreen shows overlay with PLAY AGAIN and ✕ CLOSE
- [ ] Best score saves and reflects in popup after fullscreen session

- [ ] **Step 3: Test in Firefox**

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on** → select `manifest.json`
3. Verify popup opens and game plays
4. Verify fullscreen tab opens from `⛶` button
5. Verify hi-score persists within the session

- [ ] **Step 4: Package for Chrome Web Store**

```bash
zip -r snake-extension-chrome.zip . \
  --exclude "*.git*" \
  --exclude ".superpowers/*" \
  --exclude "tests/*" \
  --exclude "icons/generate.html" \
  --exclude "docs/*" \
  --exclude "*.zip"
```

Upload `snake-extension-chrome.zip` at https://chrome.google.com/webstore/devconsole

- [ ] **Step 5: Package for Firefox Add-ons (AMO)**

The same source works for Firefox. AMO requires source code submission for review:

```bash
zip -r snake-extension-firefox.zip . \
  --exclude "*.git*" \
  --exclude ".superpowers/*" \
  --exclude "*.zip"
```

Upload `snake-extension-firefox.zip` at https://addons.mozilla.org/developers/

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: packaging complete, ready for store submission"
```
