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
  assert.match(updateBody, /changes\.added/);
});

test("photo entrance animation is opt-in instead of attached to every photo", () => {
  const baseRule = styles.match(/\.memory-photo\s*\{([\s\S]*?)\n\}/)?.[1] ?? "";
  assert.doesNotMatch(baseRule, /animation:/);
  assert.match(styles, /\.memory-photo\.is-entering-photo/);
});
