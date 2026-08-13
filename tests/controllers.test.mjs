import test from "node:test";
import assert from "node:assert/strict";
import { createMusicController } from "../js/music.js";
import { rotateStack, wrapIndex } from "../js/galleries.js";
import {
  advanceState,
  createSceneState,
  formatElapsed,
  reconcileMediaPaths,
  reorderHandmadePhotos,
  resetSceneState,
  selectLoveWindow,
  selectMemoryBatch,
  shouldHandleSceneShortcut,
  typewriterDelay,
} from "../js/scenes.js";

function createButtonDouble() {
  const attributes = new Map();
  const listeners = new Map();
  return {
    dataset: {},
    hidden: true,
    setAttribute(name, value) { attributes.set(name, value); },
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name, handler) {
      if (listeners.get(name) === handler) listeners.delete(name);
    },
    getAttribute(name) { return attributes.get(name); },
    dispatch(name) { listeners.get(name)?.({ stopPropagation() {} }); },
  };
}

test("music controller never starts a second playback while already playing", async () => {
  let plays = 0;
  const audio = {
    src: "",
    volume: 0,
    loop: false,
    currentTime: 9,
    paused: true,
    async play() {
      plays += 1;
      this.paused = false;
    },
    pause() { this.paused = true; },
  };
  const button = createButtonDouble();
  const music = createMusicController({
    audio,
    button,
    src: "assets/music/bgm.mp3",
    volume: 0.48,
    fadeMs: 0,
  });

  assert.equal(await music.play(), true);
  assert.equal(await music.play(), true);
  assert.equal(plays, 1);
  assert.equal(audio.loop, true);
  assert.equal(audio.volume, 0.48);
  assert.equal(button.getAttribute("aria-pressed"), "true");
});

test("music reset pauses and rewinds the supplied audio object", async () => {
  const audio = {
    src: "",
    volume: 0,
    loop: false,
    currentTime: 19,
    paused: true,
    async play() { this.paused = false; },
    pause() { this.paused = true; },
  };
  const music = createMusicController({
    audio,
    button: createButtonDouble(),
    src: "assets/music/bgm.mp3",
    fadeMs: 0,
  });

  await music.play();
  music.reset();
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.paused, true);
});

test("scene state starts on the closed envelope", () => {
  assert.deepEqual(createSceneState(), {
    sceneIndex: 0,
    beatIndex: 0,
    phase: "opening",
    locked: false,
  });
});

test("advance stays in a scene until its final beat", () => {
  const state = { sceneIndex: 1, beatIndex: 0, phase: "waiting", locked: false };
  const next = advanceState(state, { beatCount: 3, sceneCount: 10 });

  assert.deepEqual(next, {
    sceneIndex: 1,
    beatIndex: 1,
    phase: "entering",
    locked: true,
  });
});

test("advance moves to the next scene after the final beat", () => {
  const state = { sceneIndex: 2, beatIndex: 4, phase: "waiting", locked: false };
  const next = advanceState(state, { beatCount: 5, sceneCount: 10 });

  assert.deepEqual(next, {
    sceneIndex: 3,
    beatIndex: 0,
    phase: "entering",
    locked: true,
  });
});

test("advance ignores input while a transition is locked", () => {
  const state = { sceneIndex: 2, beatIndex: 1, phase: "entering", locked: true };
  assert.deepEqual(advanceState(state, { beatCount: 5, sceneCount: 10 }), state);
});

test("photo stack moves only its top item to the bottom", () => {
  assert.deepEqual(rotateStack(["a", "b", "c"]), ["b", "c", "a"]);
  assert.deepEqual(rotateStack(["only"]), ["only"]);
});

test("handmade photos begin with the original sixth item without mutating input", () => {
  const photos = ["1", "2", "3", "4", "5", "6", "7"];
  assert.deepEqual(reorderHandmadePhotos(photos), ["6", "1", "2", "3", "4", "5", "7"]);
  assert.deepEqual(photos, ["1", "2", "3", "4", "5", "6", "7"]);
});

test("typewriter timing pauses on punctuation and remains readable for long copy", () => {
  assert.equal(typewriterDelay("你", 20), 82);
  assert.ok(typewriterDelay("。", 20) > typewriterDelay("你", 20));
  assert.ok(typewriterDelay("你", 240) >= 38);
  assert.ok(typewriterDelay("你", 240) < 82);
});

test("media reconciliation keeps existing paths and adds only the new top photo", () => {
  assert.deepEqual(
    reconcileMediaPaths(["01", "02", "03"], ["02", "03", "04"], 3),
    { kept: ["02", "03"], added: ["04"], removed: ["01"] },
  );
  assert.deepEqual(
    reconcileMediaPaths(["01"], ["01", "02"], 3),
    { kept: ["01"], added: ["02"], removed: [] },
  );
});

test("formats relationship time with stable two-digit clock fields", () => {
  assert.deepEqual(
    formatElapsed({ days: 65, hours: 1, minutes: 2, seconds: 3 }),
    { days: "65", clock: "01 小时 · 02 分钟 · 03 秒" },
  );
});

test("memory climax selects bounded deterministic photo batches", () => {
  const paths = Array.from({ length: 20 }, (_, index) => `photo-${index}`);

  assert.deepEqual(selectMemoryBatch(paths, 0, 4), [
    "photo-0", "photo-1", "photo-2", "photo-3",
  ]);
  assert.deepEqual(selectMemoryBatch(paths, 4, 4), [
    "photo-4", "photo-5", "photo-6", "photo-7",
  ]);
  assert.deepEqual(selectMemoryBatch(paths, 18, 4), ["photo-18", "photo-19"]);
});

test("gallery navigation wraps in both directions", () => {
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(1, 3), 1);
});

test("replay state always returns to the unopened envelope", () => {
  const current = { sceneIndex: 9, beatIndex: 2, phase: "waiting", locked: false };
  assert.deepEqual(resetSceneState(current), createSceneState());
});

test("scene keyboard shortcuts ignore interactive controls and open galleries", () => {
  assert.equal(shouldHandleSceneShortcut({ key: " ", interactive: false, galleryOpen: false }), true);
  assert.equal(shouldHandleSceneShortcut({ key: "Enter", interactive: false, galleryOpen: false }), true);
  assert.equal(shouldHandleSceneShortcut({ key: " ", interactive: true, galleryOpen: false }), false);
  assert.equal(shouldHandleSceneShortcut({ key: "Enter", interactive: false, galleryOpen: true }), false);
  assert.equal(shouldHandleSceneShortcut({ key: "ArrowRight", interactive: false, galleryOpen: false }), false);
});

test("love climax advances through all photos while keeping at most ten mounted", () => {
  const photos = Array.from({ length: 20 }, (_, index) => `photo-${index + 1}`);

  assert.deepEqual(selectLoveWindow(photos, 0), ["photo-1", "photo-2", "photo-3"]);
  assert.deepEqual(selectLoveWindow(photos, 3), photos.slice(2, 12));
  assert.deepEqual(selectLoveWindow(photos, 6), photos.slice(10, 20));
});
