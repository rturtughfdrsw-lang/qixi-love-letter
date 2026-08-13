# Navigation, Performance, and Selection Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable previous-page navigation, stop accidental blue text selection, and make the 20-photo LOVE scene smooth without modifying original photos.

**Architecture:** Extend the existing pure scene-state controller with backward navigation, then expose it through a persistent two-button scene navigation group. Generate separate WebP preview assets for the LOVE scene and keep the gallery wired to originals. Preserve existing Scene DOM identity during same-Scene navigation.

**Tech Stack:** HTML, CSS, JavaScript ES modules, Node test runner, Python Pillow for one-time WebP preview generation.

## Global Constraints

- Do not modify, overwrite, or recompress any original photo.
- Do not change any visible letter copy.
- Keep all 20 LOVE photos mounted once revealed; old photos must not replay entrance animation.
- Same-Scene forward/back navigation changes only text and newly required media; whole-Scene transitions occur only across Scene boundaries.
- Mobile-first layout must not create horizontal overflow.

---

### Task 1: Backward Scene State

**Files:**
- Modify: `tests/controllers.test.mjs`
- Modify: `js/scenes.js`

**Interfaces:**
- Produces: `retreatState(state, { previousBeatCount }): SceneState`
- Consumes: existing `SceneState` shape and locking/phase conventions.

- [ ] **Step 1: Write failing controller tests**

Add tests proving that `retreatState` decrements a beat in place, moves to the previous Scene's final beat, ignores locked state, and returns unchanged state at the first beat of the first Scene.

```js
assert.deepEqual(
  retreatState({ sceneIndex: 3, beatIndex: 2, phase: "waiting", locked: false }, { previousBeatCount: 4 }),
  { sceneIndex: 3, beatIndex: 1, phase: "entering", locked: true },
);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test tests/controllers.test.mjs`
Expected: FAIL because `retreatState` is not exported.

- [ ] **Step 3: Implement the minimal pure transition**

In `js/scenes.js`, return the prior beat when `beatIndex > 0`; otherwise use `sceneIndex - 1` and `previousBeatCount - 1`; preserve state if opening, locked, or already at the first available page.

- [ ] **Step 4: Run the focused tests and confirm GREEN**

Run: `node --test tests/controllers.test.mjs`
Expected: all controller tests pass.

- [ ] **Step 5: Commit**

```text
git add js/scenes.js tests/controllers.test.mjs
git commit -m "feat: add backward scene state"
```

### Task 2: Persistent Previous/Continue Navigation

**Files:**
- Modify: `tests/scene-persistence.test.mjs`
- Modify: `js/scenes.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `retreatState`, `enterCurrentBeat`, existing render/update functions.
- Produces: `.scene-navigation`, `.continue-hint`, `.previous-hint`, and `previous()`.

- [ ] **Step 1: Write failing navigation tests**

Assert that scene rendering creates the buttons in this order and that `previous()` does not replace a same-Scene root or re-append existing photo nodes.

```js
assert.match(source, /scene-navigation[\s\S]*continue-hint[\s\S]*previous-hint/);
assert.match(source, /function previous\(\)/);
```

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test tests/scene-persistence.test.mjs`
Expected: FAIL because the navigation group and `previous()` do not exist.

- [ ] **Step 3: Implement reusable navigation creation**

Create one helper returning `{ navigation, hint, previousHint }`. The helper must place “♡ 轻触继续” first and “← 返回上一页” second, attach `data-no-advance`, and stop click propagation.

- [ ] **Step 4: Implement `previous()` and same-Scene persistence**

Cancel the active typewriter before retreating. When the target remains in the current Scene, call the existing in-place updater; when it crosses a Scene boundary, perform the normal leaving delay and render the previous Scene's last beat. Do not remove already revealed media during same-Scene retreat.

- [ ] **Step 5: Style the button group responsively**

Center `.scene-navigation` at the safe-area bottom, give both controls at least 44px height, and collapse spacing/font sizes below 580px without overflow. Move existing float animation from the individual button to the group or disable it for the previous button.

- [ ] **Step 6: Run focused and full tests**

Run: `node --test tests/scene-persistence.test.mjs tests/controllers.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 7: Commit**

```text
git add js/scenes.js css/style.css tests/controllers.test.mjs tests/scene-persistence.test.mjs
git commit -m "feat: add persistent previous-page navigation"
```

### Task 3: Prevent Accidental Blue Selection

**Files:**
- Modify: `tests/scene-persistence.test.mjs`
- Modify: `js/scenes.js`
- Modify: `css/style.css`

**Interfaces:**
- Produces: `clearStageSelection()` and non-selectable playback-stage styles.

- [ ] **Step 1: Write failing selection tests**

Assert that `.app-stage` declares both `user-select: none` and `-webkit-user-select: none`, and that both navigation directions invoke the selection-clearing helper.

- [ ] **Step 2: Run the focused tests and confirm RED**

Run: `node --test tests/scene-persistence.test.mjs`
Expected: FAIL on missing selection protections.

- [ ] **Step 3: Implement CSS and runtime clearing**

Add selection protection only to the playback stage. Before forward/back navigation, call `window.getSelection()?.removeAllRanges()` inside a small guarded helper. Do not apply this rule to gallery dialogs.

- [ ] **Step 4: Run focused tests and confirm GREEN**

Run: `node --test tests/scene-persistence.test.mjs`
Expected: all focused tests pass.

- [ ] **Step 5: Commit**

```text
git add js/scenes.js css/style.css tests/scene-persistence.test.mjs
git commit -m "fix: prevent accidental letter text selection"
```

### Task 4: LOVE Scene Preview Assets

**Files:**
- Create: `scripts/generate-love-previews.py`
- Create: `assets/generated/together-love/*.webp`
- Modify: `js/content.js`
- Modify: `js/scenes.js`
- Modify: `tests/paths.test.mjs`
- Modify: `tests/controllers.test.mjs`

**Interfaces:**
- Produces: `assets.togetherLovePreviews: readonly string[]` in the exact same order as `assets.together`.
- Consumes: `assets.together` originals and Pillow WebP support.

- [ ] **Step 1: Write failing asset mapping tests**

Assert preview count equals original count, every preview ends in `.webp`, every preview exists, LOVE uses `togetherLovePreviews`, and gallery data remains `together`.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `node --test tests/paths.test.mjs tests/controllers.test.mjs`
Expected: FAIL because preview assets are not declared.

- [ ] **Step 3: Add deterministic preview generator**

Use Pillow `ImageOps.exif_transpose`, convert to RGB, thumbnail to a maximum 960px edge with LANCZOS, and save WebP at quality 78/method 6. Preserve basenames and never write into `assets/images/together/`.

```python
image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
image.thumbnail((960, 960), Image.Resampling.LANCZOS)
image.save(target, "WEBP", quality=78, method=6)
```

- [ ] **Step 4: Generate and declare all previews**

Run: `python scripts/generate-love-previews.py`
Expected: 20 WebP files under `assets/generated/together-love/`, each substantially smaller than its original.

- [ ] **Step 5: Wire only LOVE scene to previews**

Declare the ordered preview list in `js/content.js`. Change `renderLoveScene` and `updateLoveScene` to use `model.assets.togetherLovePreviews`; do not change gallery wiring or `assets.together`.

- [ ] **Step 6: Remove avoidable LOVE compositing costs**

Use contained paint/layout boundaries on `.love-memory-layer`, keep animations transform/opacity-only, and avoid filters/backdrop effects on individual photos. Preserve the existing visual arrangement and center text safe zone.

- [ ] **Step 7: Run focused and full tests**

Run: `node --test tests/*.test.mjs`
Expected: all tests pass and resource checks find every preview.

- [ ] **Step 8: Commit**

```text
git add scripts/generate-love-previews.py js/content.js js/scenes.js css/style.css tests assets/generated/together-love
git commit -m "perf: optimize love scene photo rendering"
```

### Task 5: Browser Verification

**Files:**
- Modify only if verification reveals a regression in the files above.

**Interfaces:**
- Consumes: completed navigation, selection, and preview changes.
- Produces: verification evidence only.

- [ ] **Step 1: Run static verification**

Run: `node --test tests/*.test.mjs`
Run: `git diff --check`
Expected: zero failures and no whitespace errors.

- [ ] **Step 2: Verify desktop LOVE behavior**

At `http://localhost:4173/`, reach the final LOVE beat and confirm: 20 preview images are present, old photo node identity remains stable, only the newly added photo animates, forward/back text works, and no blue selection remains after repeated clicks.

- [ ] **Step 3: Verify mobile behavior**

At 390×844, confirm both buttons are reachable and at least 44px high, the text card remains readable, LOVE photos do not block text, and document horizontal overflow is zero.

- [ ] **Step 4: Verify runtime health and performance evidence**

Confirm no broken images and no console errors. Compare total LOVE preview bytes and decoded pixel count with the 55.4MB/339.6MP original set and report the reduction.

- [ ] **Step 5: Final commit if verification required fixes**

```text
git add <only-files-changed-by-verification>
git commit -m "fix: polish love scene navigation"
```
