export const relationshipStart = "2026-06-10T00:00:00+08:00";

const together = Object.freeze([
  "assets/images/together/0FDD8F17C0FAF83E57CC86A6F6BB13E1.png",
  "assets/images/together/IMG_5547.jpeg",
  "assets/images/together/IMG_5550.jpeg",
  "assets/images/together/IMG_5554.jpeg",
  "assets/images/together/IMG_5555.jpeg",
  "assets/images/together/IMG_5656.jpeg",
  "assets/images/together/IMG_5670.jpeg",
  "assets/images/together/IMG_6342.jpeg",
  "assets/images/together/IMG_6347.jpeg",
  "assets/images/together/IMG_6348.jpeg",
  "assets/images/together/IMG_6371.jpg",
  "assets/images/together/IMG_6489.jpeg",
  "assets/images/together/IMG_9572.jpeg",
  "assets/images/together/IMG_9576.jpeg",
  "assets/images/together/IMG_9631.jpeg",
  "assets/images/together/IMG_9672.jpeg",
  "assets/images/together/IMG_9680.jpeg",
  "assets/images/together/IMG_9690.jpeg",
  "assets/images/together/IMG_9691.jpeg",
  "assets/images/together/IMG_9705.jpeg",
]);

const togetherLovePreviews = Object.freeze(together.map((path) => path
  .replace("assets/images/together/", "assets/generated/together-love/")
  .replace(/\.[^.]+$/, ".webp")));

export const assets = Object.freeze({
  letter: Object.freeze([
    "assets/images/素材/01.jpeg",
    "assets/images/素材/02.jpeg",
    "assets/images/素材/03.webp",
    "assets/images/素材/04.jpeg.JPEG.jpeg",
    "assets/images/素材/05.gif",
  ]),
  gifts: Object.freeze([
    "assets/images/daily-gifts/01.png",
    "assets/images/daily-gifts/02、.png",
    "assets/images/daily-gifts/03.jpg",
    "assets/images/daily-gifts/04.JPG.jpeg",
    "assets/images/daily-gifts/05.JPG.jpeg",
    "assets/images/daily-gifts/06.JPG.jpeg",
    "assets/images/daily-gifts/07.jpg",
    "assets/images/daily-gifts/08.JPG.jpeg",
    "assets/images/daily-gifts/09.jpg",
    "assets/images/daily-gifts/10.jpg",
  ]),
  handmadeBook: Object.freeze([
    "assets/images/handmade-book/IMG_9941.jpeg",
    "assets/images/handmade-book/IMG_9642.JPG",
    "assets/images/handmade-book/IMG_9643.JPG",
    "assets/images/handmade-book/IMG_9644.JPG",
    "assets/images/handmade-book/IMG_9645.JPG",
    "assets/images/handmade-book/IMG_9649.JPG",
    "assets/images/handmade-book/IMG_9978.jpeg",
  ]),
  guoDaily: Object.freeze([
    "assets/images/guo-jingtian-daily/08768963320faef4aa8d2421b36421_livephoto.jpeg",
    "assets/images/guo-jingtian-daily/fc694b764d8ded77c0516a04a94db4.jpg",
    "assets/images/guo-jingtian-daily/live_photo_paired_photo_A3353D2C-E0D3-405F-B308-ADFBD054496E.JPEG",
  ]),
  together,
  togetherLovePreviews,
  music: "assets/music/bgm.mp3",
});

const sceneIds = Object.freeze([
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
]);

function cleanMarkdown(text) {
  return text
    .replace(/^#{1,6}\s+/, "")
    .replace(/^\*\*(.*)\*\*$/, "$1")
    .trim();
}

function nonEmptyLines(block) {
  return block
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function makeBeat(paragraphs, media = [], kind = "copy") {
  return { paragraphs: paragraphs.filter(Boolean), media, kind };
}

function media(src, alt, type = "image") {
  return { type, src, alt };
}

function chunk(items, size) {
  const groups = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}

function sentenceChunks(text, size = 3) {
  const sentences = text.match(/[^。！？]+[。！？]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
  return chunk(sentences, size).map((group) => group.join(""));
}

function parseOpening(block) {
  const lines = nonEmptyLines(block);
  const title = cleanMarkdown(lines[0]);
  const greeting = lines.find((line) => line.startsWith("亲爱的")) ?? "";
  return {
    title,
    greeting,
    scene: { id: "opening", beats: [makeBeat([title]), makeBeat([greeting], [], "greeting")] },
  };
}

function parseLetter(block) {
  const markers = [
    media(assets.letter[0], "紫色背景上的可爱抱抱插画"),
    media(assets.letter[1], "三只可爱小熊举杯插画"),
    media(assets.letter[2], "端着杯子的白色小熊插画"),
    media(assets.letter[3], "郭静恬微笑比耶的照片"),
  ];
  const beats = [];
  let buffer = [];
  let markerIndex = 0;

  for (const rawLine of nonEmptyLines(block)) {
    if (/^（配图：assets\/素材\/0[134]）$/.test(rawLine)) {
      beats.push(makeBeat(buffer, [markers[markerIndex]], `letter-${markerIndex + 1}`));
      buffer = [];
      markerIndex += 1;
      continue;
    }
    buffer.push(cleanMarkdown(rawLine));
  }
  if (buffer.length) beats.push(makeBeat(buffer, [], "letter-close"));
  return { id: "letter", beats };
}

function cleanGiftLine(line) {
  return line
    .replace(/（E:\\七夕\\assets\\images\\daily-gifts\\01）$/, "")
    .replace(/（E:\\七夕\\assets\\images\\daily-gifts\\02下面统一简写为数字）$/, "")
    .replace(/（03$/, "")
    .replace(/（04 05 06$/, "")
    .replace(/07$/, "")
    .replace(/08$/, "")
    .replace(/09$/, "")
    .replace(/10$/, "")
    .trim();
}

function parseGifts(block) {
  const lines = nonEmptyLines(block).map(cleanGiftLine);
  const giftMedia = assets.gifts.map((src, index) => media(src, `郭静恬送的礼物 ${index + 1}`));
  return {
    id: "gifts",
    beats: [
      makeBeat(lines.slice(0, 2), [], "gifts-intro"),
      makeBeat([lines[2]], [giftMedia[0]], "gift-1"),
      makeBeat([lines[3]], [giftMedia[1]], "gift-2"),
      makeBeat([lines[4]], [giftMedia[2]], "gift-3"),
      makeBeat([lines[5]], giftMedia.slice(3, 6), "gift-clothes"),
      makeBeat([lines[6]], [giftMedia[6]], "gift-7"),
      makeBeat([lines[7]], [giftMedia[7]], "gift-8"),
      makeBeat([lines[8]], [giftMedia[8]], "gift-9"),
      makeBeat([lines[9]], [giftMedia[9]], "gift-10"),
    ],
  };
}

function parseHandmade(block) {
  const lines = nonEmptyLines(block).filter((line) => !line.startsWith("（上面这个daily gift"));
  const intro = lines[0];
  const body = lines.slice(1).join("")
    .replace(/\(配上”手工书“文件夹直接用堆叠的那种感觉然后侧面要体现参差感你懂吗）$/, "");
  const bodyChunks = sentenceChunks(body, 3);
  const bookMedia = assets.handmadeBook.map((src, index) => media(src, `手工书照片 ${index + 1}`));

  return {
    id: "handmade",
    beats: [
      makeBeat([intro], bookMedia, "handmade-intro"),
      ...bodyChunks.map((paragraph, index) => makeBeat([paragraph], [], `handmade-copy-${index + 1}`)),
    ],
  };
}

function parseFuture(block) {
  const lines = nonEmptyLines(block).map((line) => line.replace(/（assets\/素材\/05$/, ""));
  const groups = chunk(lines, 3);
  return {
    id: "future",
    beats: groups.map((paragraphs, index) => makeBeat(
      paragraphs,
      index === groups.length - 1 ? [media(assets.letter[4], "两个可爱小熊互动的动图", "gif")] : [],
      `future-${index + 1}`,
    )),
  };
}

function parsePlainScene(id, block, groupSize) {
  return {
    id,
    beats: chunk(nonEmptyLines(block).map(cleanMarkdown), groupSize)
      .map((paragraphs, index) => makeBeat(paragraphs, [], `${id}-${index + 1}`)),
  };
}

function parseCounter(block) {
  const lines = nonEmptyLines(block)
    .filter((line) => !line.startsWith("（这里放") && !line.startsWith("（从六月十号"));
  const groups = chunk(lines, 3);
  return {
    id: "counter",
    beats: groups.map((paragraphs, index) => makeBeat(paragraphs, [], index === 1 ? "counter-display" : `counter-${index + 1}`)),
  };
}

function parseLove(block) {
  const lines = nonEmptyLines(block).map((line) => line.replace(/（together文件夹不断弹出照片$/, ""));
  const beats = [];
  let buffer = [];

  for (const line of lines) {
    if (line === "我爱你。" || line === "特别特别需要你") {
      if (buffer.length) beats.push(makeBeat(buffer.splice(0), [], "love-copy"));
      beats.push(makeBeat([line], [], line === "我爱你。" ? "love-declaration" : "love-need"));
    } else {
      buffer.push(line);
      if (buffer.length === 4) beats.push(makeBeat(buffer.splice(0), [], "love-copy"));
    }
  }
  if (buffer.length) beats.push(makeBeat(buffer, [], "love-copy"));

  return { id: "love", beats };
}

function parseLast(block) {
  const lines = nonEmptyLines(block).map(cleanMarkdown);
  const beats = [];
  let buffer = [];

  for (const line of lines) {
    if (line === "To be continued... ♡" || line === "—— 爱你的" || line === "秦灿宇" || line === "2026 8.13") {
      if (buffer.length) beats.push(makeBeat(buffer.splice(0), [], "last-copy"));
      beats.push(makeBeat([line], [], line.startsWith("To be") ? "continued" : "signature"));
    } else {
      buffer.push(line);
      if (buffer.length === 4) beats.push(makeBeat(buffer.splice(0), [], "last-copy"));
    }
  }
  if (buffer.length) beats.push(makeBeat(buffer, [], "last-copy"));
  return { id: "last", beats };
}

function parseMenu() {
  return {
    id: "menu",
    beats: [makeBeat([], [], "menu")],
    actions: Object.freeze([
      { id: "replay", label: "↻ 再放一遍" },
      { id: "guo-gallery", label: "♡ 郭静恬美照" },
      { id: "together-gallery", label: "📷 我们的照片" },
    ]),
  };
}

export function parseLetterSource(source) {
  if (typeof source !== "string" || !source.trim()) {
    throw new TypeError("正文内容为空");
  }

  const blocks = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n")
    .split(/^\s*---\s*$/m)
    .map((block) => block.trim());

  if (blocks.length < 10) {
    throw new Error(`正文场景数量不足：预期 10，实际 ${blocks.length}`);
  }

  const opening = parseOpening(blocks[0]);
  const scenes = [
    opening.scene,
    parseLetter(blocks[1]),
    parseGifts(blocks[2]),
    parseHandmade(blocks[3]),
    parseFuture(blocks[4]),
    parsePlainScene("change", blocks[5], 3),
    parseCounter(blocks[6]),
    parseLove(blocks[7]),
    parseLast(blocks[8]),
    parseMenu(),
  ];

  if (scenes.some((scene, index) => scene.id !== sceneIds[index])) {
    throw new Error("正文场景映射失败");
  }

  return { title: opening.title, greeting: opening.greeting, scenes };
}

export async function loadLetter(url = "assets/七夕.txt") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`正文加载失败（HTTP ${response.status}）`);
  return parseLetterSource(await response.text());
}

export function calculateElapsed(start, now = new Date()) {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - new Date(start).getTime()) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}
