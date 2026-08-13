import test from "node:test";
import assert from "node:assert/strict";
import { createMusicController } from "../js/music.js";
import { createSceneState } from "../js/scenes.js";

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
