import test from "node:test";
import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { assets } from "../js/content.js";

test("every declared local asset exists", async () => {
  const paths = Object.values(assets).flat().filter(Boolean);

  for (const relativePath of paths) {
    const url = new URL(`../${relativePath}`, import.meta.url);
    await assert.doesNotReject(access(fileURLToPath(url)), relativePath);
  }
});

test("love scene has one lightweight WebP preview for every together original", async () => {
  assert.equal(assets.togetherLovePreviews.length, assets.together.length);
  assert.equal(assets.togetherLovePreviews.length, 20);
  assert.ok(assets.togetherLovePreviews.every((path) => path.endsWith(".webp")));

  for (const relativePath of assets.togetherLovePreviews) {
    const url = new URL(`../${relativePath}`, import.meta.url);
    await assert.doesNotReject(access(fileURLToPath(url)), relativePath);
  }
});

test("love scene uses previews while the gallery keeps together originals", async () => {
  const scenes = await readFile(new URL("../js/scenes.js", import.meta.url), "utf8");
  const galleries = await readFile(new URL("../js/galleries.js", import.meta.url), "utf8");

  assert.match(scenes, /model\.assets\?\.togetherLovePreviews/);
  assert.match(galleries, /assets\.together/);
  assert.doesNotMatch(galleries, /togetherLovePreviews/);
});

test("index exposes the required application landmarks", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");

  for (const marker of [
    'id="app-stage"',
    'id="music-toggle"',
    'id="gallery-overlay"',
    'id="error-panel"',
    'type="module"',
    'src="js/main.js"',
  ]) {
    assert.ok(html.includes(marker), marker);
  }
});

test("text-only scenes declare a full-screen single-column layout", async () => {
  const scenes = await readFile(new URL("../js/scenes.js", import.meta.url), "utf8");
  const styles = await readFile(new URL("../css/style.css", import.meta.url), "utf8");

  assert.match(scenes, /scene--text-only/);
  assert.match(scenes, /memory-layout--text-only/);
  assert.match(styles, /\.memory-layout--text-only/);
});
