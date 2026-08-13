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
