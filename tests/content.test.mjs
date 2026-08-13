import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import {
  assets,
  calculateElapsed,
  parseLetterSource,
  relationshipStart,
} from "../js/content.js";

const source = await readFile(new URL("../assets/七夕.txt", import.meta.url), "utf8");

function visibleParagraphs(model) {
  return model.scenes
    .flatMap((scene) => scene.beats)
    .flatMap((beat) => beat.paragraphs);
}

test("parses ten playback stages without developer markers", () => {
  const model = parseLetterSource(source);
  assert.deepEqual(
    model.scenes.map(({ id }) => id),
    [
      "opening",
      "letter",
      "gifts",
      "handmade",
      "future",
      "change",
      "counter",
      "love",
      "last",
      "menu",
    ],
  );

  const visible = visibleParagraphs(model).join("\n");
  assert.match(visible, /臭贝贝/);
  assert.match(visible, /（好多好多）/);
  assert.match(visible, /特别特别需要你/);
  assert.doesNotMatch(visible, /配图：|E:\\七夕|together文件夹|页面结束按钮|^---$/m);
});

test("maps the first two repeated source markers to 01 then 02", () => {
  const letter = parseLetterSource(source).scenes.find(({ id }) => id === "letter");
  const media = letter.beats.flatMap((beat) => beat.media.map(({ src }) => src));
  assert.deepEqual(media.slice(0, 2), [
    "assets/images/素材/01.jpeg",
    "assets/images/素材/02.jpeg",
  ]);
  assert.equal(media.at(-1), "assets/images/素材/04.jpeg.JPEG.jpeg");
});

test("keeps all required original phrases exactly", () => {
  const visible = visibleParagraphs(parseLetterSource(source));
  for (const phrase of [
    "很感动很感动",
    "很萌很萌",
    "绷不住了",
    "没事。",
    "我想变成一个更会表达爱的人。",
    "To be continued... ♡",
    "秦灿宇",
    "2026 8.13",
  ]) {
    assert.ok(visible.some((paragraph) => paragraph.includes(phrase)), phrase);
  }
});

test("calculates elapsed relationship time from the single configured start", () => {
  assert.equal(relationshipStart, "2026-06-10T00:00:00+08:00");
  assert.deepEqual(
    calculateElapsed(relationshipStart, new Date("2026-06-12T01:02:03+08:00")),
    { days: 2, hours: 1, minutes: 2, seconds: 3 },
  );
});

test("declares every numbered gift in order", () => {
  assert.equal(assets.gifts.length, 10);
  assert.equal(assets.gifts[0], "assets/images/daily-gifts/01.png");
  assert.equal(assets.gifts[1], "assets/images/daily-gifts/02、.png");
  assert.equal(assets.gifts[9], "assets/images/daily-gifts/10.jpg");
});
