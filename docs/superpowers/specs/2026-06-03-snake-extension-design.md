# Modern Snake Extension — Design Spec
_2026-06-03_

## Overview

A modern Snake game shipped as a browser extension for Chrome (Chrome Web Store) and Firefox (Firefox Add-ons). Built with vanilla JS and no build step. Manifest V3 throughout.

## Entry Point

- **Default:** Clicking the toolbar icon opens a **popup** (380×480px fixed).
- **Expand:** A `⛶` button in the popup footer opens `fullscreen.html` as a new tab via `chrome.tabs.create({ url: 'fullscreen.html?mode=<current>' })`. The popup closes naturally.

## Visual Theme: Minimal Glass

- Background: deep ocean gradient (`#0f2040` → `#0a1628`)
- Snake segments: translucent white fill (`rgba(255,255,255,0.25)`) with a subtle blue glow, rounded corners
- Food: pulsing blue dot (`rgba(99,179,237,0.8)`) with glow
- UI chrome: frosted glass panels (`rgba(255,255,255,0.05)`, `backdrop-filter: blur(10px)`), fine white borders (`rgba(255,255,255,0.1)`)
- Typography: system-ui, wide letter-spacing, low-opacity labels
- No sound.

## Game Modes

Three modes selectable via a tab bar in the popup header. Mode persists for the fullscreen session (passed as a URL param).

| Mode | Speed | Levels | Obstacles | Power-ups | Hi-score saved |
|---|---|---|---|---|---|
| **Classic** | Fixed | No | No | No | No |
| **Classic+** | Increases every 5 food | Yes | No | No | Yes |
| **Extreme** | Increases every 5 food | Yes | Yes (from level 3) | Yes | Yes |

### Power-ups (Extreme only)
Spawn randomly, disappear after ~5 seconds if not collected:
- 🔵 **Slow-mo** — halves tick speed for 5 seconds
- 🟡 **Shield** — next wall or self collision is ignored once
- 🔴 **Double-score** — food worth 2× for 5 seconds

## File Structure

```
modern-snake-extension/
├── manifest.json
├── popup.html
├── popup.js
├── fullscreen.html
├── fullscreen.js
├── game.js             ← shared SnakeGame class
├── style.css           ← shared Minimal Glass styles
└── icons/
    ├── icon-16.png
    ├── icon-48.png
    └── icon-128.png
```

No background service worker. No `web_accessible_resources` needed — `fullscreen.html` is opened via `chrome.tabs.create({ url: chrome.runtime.getURL('fullscreen.html') })`, which works for any bundled extension page without it.

## Popup UI (`popup.html`)

Top to bottom:
1. **Header** — "SNAKE" wordmark (small, wide letter-spacing) + best score for the active mode (top-right)
2. **Tab bar** — `CLASSIC` · `CLASSIC+` · `EXTREME`. Active tab: frosted blue pill highlight. Switching tabs resets canvas to ready state.
3. **Canvas** — fills remaining space. Shows faint "press any arrow key to start" hint until first input.
4. **Footer** — live score (updates per food eaten) + `⛶` expand button

## Fullscreen Page (`fullscreen.html`)

- Canvas scales to fill window, max ~600×600px, centered on ocean gradient
- Mode name top-left, live score top-right, `✕` button that closes the tab
- No tab bar — mode fixed from URL param
- `P` or `Escape` pauses with frosted overlay ("PAUSED — press any key to resume")
- Same `SnakeGame` class and rendering as popup

## Game Engine (`game.js`)

**Class:** `SnakeGame(canvas, mode)`

**Grid:** 20×20 cells

**State:**
- `snake` — array of `{x, y}` (head first)
- `direction` / `nextDirection` — queued to prevent 180° reversal mid-tick
- `food` — `{x, y}`
- `obstacles` — array of `{x, y}` (Extreme, level 3+)
- `powerUps` — array of `{x, y, type, expiresAt}`
- `activeEffects` — map of effect → expiry timestamp
- `score`, `level`, `tickInterval`

**Loop:** `requestAnimationFrame` drives a fixed-interval tick. Each tick:
1. Flush queued direction
2. Advance head
3. Check wall collision → death
4. Check self collision → death
5. Check obstacle collision → death (unless shield active)
6. Check food → grow, increment score, maybe level up, spawn new food
7. Check power-up collection
8. Expire timed effects
9. Render

**Speed:** base 150ms tick. Classic+ and Extreme reduce by 10ms per level, floor 60ms.

**Rendering:** all on canvas — gradient fill background, rounded rect segments for snake, arc for food and power-ups, frosted rect overlay for score HUD.

## Death Screen

Triggered on any fatal collision. Sequence:
1. Snake segments flash red (400ms animation on canvas)
2. Frosted overlay fades in over canvas
3. Shows: "GAME OVER", final score, best score for this mode
4. Two buttons: `↩ PLAY AGAIN` (same mode, same tab) · `⌂ MENU` (popup: back to ready state; fullscreen: close tab)
5. Best score written to `localStorage` if beaten

## Persistence

`localStorage` only. Keys:
- `snake_best_classic`
- `snake_best_classic_plus`
- `snake_best_extreme`

No sync, no `chrome.storage`. Scores are per-device.

## Cross-Browser Compatibility

- Manifest V3 for both Chrome and Firefox
- `chrome.*` APIs used throughout (Firefox MV3 aliases them)
- No browser-specific forks required
- Separate store listings (Chrome Web Store + Firefox Add-ons), same codebase

## Controls

| Key | Action |
|---|---|
| Arrow keys / WASD | Change direction |
| P / Escape | Pause / resume (fullscreen only) |

## Out of Scope

- Mobile / touch support
- Sound effects
- Cloud sync of scores
- Multiplayer
- Custom themes or settings panel
