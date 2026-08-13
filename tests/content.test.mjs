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

test("preserves every visible source character while removing only explicit developer notes", () => {
  const blocks = source.replace(/\r\n?/g, "\n").split(/^\s*---\s*$/m);
  let expected = blocks.slice(0, 9).join("\n");
  const explicitNotes = [
    "（开场素材：可由 Codex 自由设计，不需要照片。鲜花、气球、信封等动画元素由 Codex 自行完成。）",
    "（配图：assets/素材/01）",
    "（配图：assets/素材/03）",
    "（配图：assets/素材/04）",
    "（E:\\七夕\\assets\\images\\daily-gifts\\01）",
    "（E:\\七夕\\assets\\images\\daily-gifts\\02下面统一简写为数字）",
    "（03",
    "（04 05 06",
    "（上面这个daily gift你觉得文字逐渐打出来 每张图片单独给动画怎么样）",
    "(配上”手工书“文件夹直接用堆叠的那种感觉然后侧面要体现参差感你懂吗）",
    "（assets/素材/05",
    "（这里放“我们在一起多久”的实时计时器）",
    "（从六月十号零点开始计时",
    "（together文件夹不断弹出照片",
  ];
  for (const note of explicitNotes) expected = expected.replaceAll(note, "");
  expected = expected
    .replace("刷牙杯07", "刷牙杯")
    .replace("护身符08", "护身符")
    .replace("（好多好多）09", "（好多好多）")
    .replace("背包10", "背包")
    .replace(/^#{1,6}\s+/gm, "")
    .replaceAll("**", "")
    .replace(/\s/g, "")
    .trim();

  const actual = visibleParagraphs(parseLetterSource(source)).join("").replace(/\s/g, "").trim();
  assert.equal(actual, expected);
});
