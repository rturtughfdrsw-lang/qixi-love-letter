import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../js/scenes.js", import.meta.url), "utf8");
const styles = await readFile(new URL("../css/style.css", import.meta.url), "utf8");

test("same-scene copy updates retain the letter card shell", () => {
  assert.match(source, /function updateCopyContents|const updateCopyContents/);
  assert.doesNotMatch(source, /oldCopy\.replaceWith\(copy\)/);
  assert.doesNotMatch(source, /querySelector\("\.letter-copy"\)\.replaceWith/);
});

test("every multi-beat scene has an in-place update path", () => {
  for (const name of [
    "updateMemoryScene",
    "updateHandmadeScene",
    "updateFutureScene",
    "updateChangeScene",
    "updateCounterScene",
    "updateLoveScene",
    "updateLastScene",
  ]) {
    assert.match(source, new RegExp(`const ${name}\\s*=`), name);
  }
});

test("old photos are never re-appended during a beat update", () => {
  const updateStart = source.indexOf("const updateMemoryScene");
  const updateEnd = source.indexOf("const renderGenericScene", updateStart);
  const updateBody = source.slice(updateStart, updateEnd);
  assert.doesNotMatch(updateBody, /desiredMedia\.forEach[\s\S]*mediaStage\.append\(card\)/);
  assert.doesNotMatch(updateBody, /\.remove\(\)/);
  assert.match(updateBody, /changes\.added/);
});

test("love scene only appends photos and never removes an earlier memory", () => {
  const updateStart = source.indexOf("const updateLoveScene");
  const updateEnd = source.indexOf("const syncLastScene", updateStart);
  const updateBody = source.slice(updateStart, updateEnd);
  assert.doesNotMatch(updateBody, /\.remove\(\)/);
  assert.match(updateBody, /changes\.added/);
});

test("relationship counter stops scheduling when its beat becomes hidden", () => {
  assert.match(source, /const stopRelationshipCounter\s*=/);
  assert.match(source, /if \(!visible\) stopRelationshipCounter\(\)/);
});

test("photo entrance animation is opt-in instead of attached to every photo", () => {
  const baseRule = styles.match(/\.memory-photo\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(baseRule, /animation:/);
  assert.match(styles, /\.memory-photo\.is-entering-photo/);
});

test("scene navigation places continue before previous", () => {
  assert.match(source, /const createSceneNavigation\s*=/);
  const helperStart = source.indexOf("const createSceneNavigation");
  const helperEnd = source.indexOf("const createPhotoCard", helperStart);
  const helper = source.slice(helperStart, helperEnd);
  assert.ok(helper.indexOf('"continue-hint"') < helper.indexOf('"previous-hint"'));
  assert.ok(helper.indexOf("navigation.append(hint, previousHint)") > 0);
  assert.match(styles, /\.scene-navigation\s*\{/);
});

test("previous navigation updates the current scene in place", () => {
  assert.match(source, /async function previous\(\)/);
  const previousStart = source.indexOf("async function previous()");
  const previousEnd = source.indexOf("function reset()", previousStart);
  const previousBody = source.slice(previousStart, previousEnd);
  assert.match(previousBody, /previousBeatCount/);
  assert.match(previousBody, /staysInScene/);
  assert.match(previousBody, /enterCurrentBeat\(\)/);
  assert.doesNotMatch(previousBody, /mediaStage\.append/);
  assert.doesNotMatch(previousBody, /photoLayer\.append/);
});

test("playback navigation clears selection and the stage cannot turn text blue", () => {
  assert.match(styles, /\.app-stage\s*\{[\s\S]*?-webkit-user-select:\s*none;[\s\S]*?user-select:\s*none;/);
  assert.match(source, /const clearStageSelection\s*=/);

  const nextStart = source.indexOf("async function next()");
  const previousStart = source.indexOf("async function previous()");
  const resetStart = source.indexOf("function reset()", previousStart);
  assert.match(source.slice(nextStart, previousStart), /clearStageSelection\(\)/);
  assert.match(source.slice(previousStart, resetStart), /clearStageSelection\(\)/);
});

test("returning from the first letter beat restores the opened envelope", () => {
  assert.match(source, /sceneModel\.id === "opening"[\s\S]*renderOpening\(\{ opened: true \}\)/);
  assert.match(source, /const renderOpening = \(\{ opened = false \} = \{\}\)/);
  assert.match(source, /opened \? "scene scene--opening is-open"/);
  assert.match(source, /opened \? "app-stage app-stage--opening is-letter-open"/);
});

test("previous remains usable during typing without stale beat completion", () => {
  assert.match(source, /let beatEntryGeneration = 0/);
  const entryStart = source.indexOf("const enterCurrentBeat");
  const clickStart = source.indexOf("const onStageClick", entryStart);
  const entryBody = source.slice(entryStart, clickStart);
  assert.ok(entryBody.indexOf("previousHint.hidden = false") < entryBody.indexOf("await typewriter.play"));
  assert.match(entryBody, /entryGeneration !== beatEntryGeneration/);

  const previousStart = source.indexOf("async function previous()");
  const resetStart = source.indexOf("function reset()", previousStart);
  const previousBody = source.slice(previousStart, resetStart);
  assert.match(previousBody, /typewriter\.isRunning\(\)/);
  assert.match(previousBody, /beatEntryGeneration \+= 1/);
  assert.ok(previousBody.indexOf("typewriter.cancel()") < previousBody.indexOf("retreatState"));
});
