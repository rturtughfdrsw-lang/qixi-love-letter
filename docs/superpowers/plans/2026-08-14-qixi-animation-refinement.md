# Qixi Animation Refinement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add slow typewriter text, persistent photo layering, a persistent reordered handmade-book stack, and full-screen typography for pages without photos.

**Architecture:** Keep the existing scene state machine, but add pure helpers and a cancellable typewriter controller. Scene renderers for `letter`, `gifts`, and `handmade` will support same-scene incremental updates so persistent photo DOM is retained; generic no-media pages receive a dedicated wide single-column class.

**Tech Stack:** HTML, CSS, browser-native JavaScript modules, Node.js built-in test runner.

## Global Constraints

- Do not change any visible正文 character sourced from `assets/七夕.txt`.
- Do not modify original photos or add dependencies/frameworks.
- Default base character interval is 82ms with punctuation pauses and bounded acceleration for long pages.
- A click during typing completes the current page; only a later click advances.
- The handmade initial order is original item 6, items 1–5, then item 7.
- Preserve replay, BGM, galleries, counter, final three buttons, mobile safety areas, and reduced-motion behavior.

---

### Task 1: Pure animation and ordering helpers

**Files:**
- Modify: `tests/controllers.test.mjs`
- Modify: `js/scenes.js`

**Interfaces:**
- Produces: `reorderHandmadePhotos(items: T[]): T[]`
- Produces: `typewriterDelay(character: string, totalCharacters: number): number`
- Produces: `reconcileMediaPaths(previous: string[], next: string[], limit: number): { kept: string[], added: string[], removed: string[] }`

- [ ] **Step 1: Write failing tests** for item 6 moving first without mutation, punctuation delay, long-copy bounded delay, and media reconciliation preserving existing paths.
- [ ] **Step 2: Run** `node --test tests/controllers.test.mjs` and verify failures are missing exports.
- [ ] **Step 3: Implement minimal pure helpers** in `js/scenes.js`.
- [ ] **Step 4: Run** `node --test tests/controllers.test.mjs` and verify all controller tests pass.
- [ ] **Step 5: Commit** with `test: define refined scene animation behavior`.

### Task 2: Cancellable typewriter controller

**Files:**
- Create: `js/typewriter.js`
- Create: `tests/typewriter.test.mjs`
- Modify: `js/scenes.js`

**Interfaces:**
- Produces: `createTypewriter({ reducedMotion, delayFor, schedule }): { play(elements, texts), complete(), cancel(), isRunning() }`
- Consumes: `typewriterDelay(character, totalCharacters)` from Task 1.

- [ ] **Step 1: Write failing tests** proving sequential character output, `complete()` immediately fills all paragraphs, and `cancel()` prevents stale scheduled writes.
- [ ] **Step 2: Run** `node --test tests/typewriter.test.mjs` and verify it fails because the module is absent.
- [ ] **Step 3: Implement the controller** with `Array.from()` character splitting and one active cancellable schedule token.
- [ ] **Step 4: Wire `createParagraphs`** to initially empty visual text while retaining complete accessible labels, then reveal the hint only after `play()` resolves.
- [ ] **Step 5: Make a scene click during typing call `complete()` and stop before `next()`.
- [ ] **Step 6: Run** `node --test tests/*.test.mjs`.
- [ ] **Step 7: Commit** with `feat: add deliberate typewriter text`.

### Task 3: Persistent ordinary photo layers

**Files:**
- Modify: `js/scenes.js`
- Modify: `css/style.css`
- Modify: `tests/controllers.test.mjs`

**Interfaces:**
- Consumes: `reconcileMediaPaths(previous, next, limit)`.
- Produces: same-scene updater retained inside `createScenePlayer`, updating copy, progress, counter, hint, and only added/removed photo nodes.

- [ ] **Step 1: Extend the failing reconciliation tests** to verify a newly added photo is last/top and retained paths keep identity/order.
- [ ] **Step 2: Run controller tests** and confirm expected failure.
- [ ] **Step 3: Add a retained renderer state** for `letter` and `gifts`; use it when the next beat has the same scene ID.
- [ ] **Step 4: Update photos by `data-src`** so retained nodes remain untouched and only new nodes receive `.is-new-photo`.
- [ ] **Step 5: Adjust CSS** so established photos are visible without replaying `memory-photo-in`, while new photos enter above them.
- [ ] **Step 6: Run all tests** and commit with `feat: keep memory photos between paragraphs`.

### Task 4: Persistent handmade-book layout and reordered stack

**Files:**
- Modify: `js/scenes.js`
- Modify: `tests/content.test.mjs`

**Interfaces:**
- Consumes: `reorderHandmadePhotos(initialBookOrder)`.
- Produces: a same-scene handmade updater that changes only `.letter-copy`, `.scene-heading__progress`, and the continue hint.

- [ ] **Step 1: Write a failing content/controller assertion** that the initial handmade top source equals the original sixth source.
- [ ] **Step 2: Run the focused test** and verify failure against the current first source.
- [ ] **Step 3: Initialize `bookOrder` through `reorderHandmadePhotos`** and keep stack DOM outside beat updates.
- [ ] **Step 4: Update handmade beat copy in place** and leave all `.book-card` nodes and current order unchanged.
- [ ] **Step 5: Verify replay restores the reordered initial stack** and all tests pass.
- [ ] **Step 6: Commit** with `feat: preserve handmade book while reading`.

### Task 5: Full-screen no-photo typography

**Files:**
- Modify: `js/scenes.js`
- Modify: `css/style.css`
- Modify: `tests/paths.test.mjs`

**Interfaces:**
- Produces: `.scene--text-only` and `.memory-layout--text-only` applied when the current page has no real media layer.

- [ ] **Step 1: Write a failing structural assertion** that the renderer declares the text-only layout class.
- [ ] **Step 2: Run** `node --test tests/paths.test.mjs` and verify failure.
- [ ] **Step 3: Apply text-only classes** to generic scenes and no-photo ordinary pages without overriding special counter/future/last elements.
- [ ] **Step 4: Add responsive CSS** for centered full-height copy, wider reading area, larger fluid text, safe-area padding, and internal overflow fallback.
- [ ] **Step 5: Run all tests** and commit with `feat: expand text-only letter scenes`.

### Task 6: Browser and regression verification

**Files:**
- Modify only if a verified defect is found: `js/scenes.js`, `js/typewriter.js`, `css/style.css`, related tests.

**Interfaces:**
- Consumes the completed website at `http://localhost:4173/`.

- [ ] **Step 1: Run** `node --test tests/*.test.mjs` and `git diff --check`.
- [ ] **Step 2: Restart the local server** and load the opening scene in the in-app browser.
- [ ] **Step 3: Verify typing cadence** on short and long pages, including click-to-complete then click-to-advance.
- [ ] **Step 4: Verify photo persistence** by comparing existing photo elements before/after a beat and ensuring only the new card animates.
- [ ] **Step 5: Verify handmade behavior**: original sixth photo first, flip once, continue, and confirm stack nodes/order remain unchanged.
- [ ] **Step 6: Verify text-only layouts** at 320×568, 390×844, and desktop widths with no horizontal overflow.
- [ ] **Step 7: Verify replay, timer, both galleries, exactly three final buttons, resource responses, and empty console errors.**
- [ ] **Step 8: Commit any test-proven corrections**, then run the full suite again.
