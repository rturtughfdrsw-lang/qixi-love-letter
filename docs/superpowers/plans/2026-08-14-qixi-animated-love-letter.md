# 七夕动态情书 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `E:\七夕` 中实现一个从现有正文和真实素材驱动、按幕播放、手机优先的七夕动态情书网站。

**Architecture:** 浏览器通过本地 HTTP 服务加载 `assets/七夕.txt`，`content.js` 将原文解析为 10 个阶段和内部阅读拍点；`scenes.js` 用单一状态机负责动画、推进和复位。音乐和相册分别由独立控制器管理，主入口只协调模块，不复制正文或创建第二个音频实例。

**Tech Stack:** HTML5、CSS3、原生 ES Modules、Web Animations API、Node.js 内置 `node:test`、无第三方运行时依赖。

## Global Constraints

- `assets/七夕.txt` 是正文唯一来源；正常正文不得改写、润色、纠错、删减或增加。
- 第一次普通配图使用 `assets/images/素材/01.jpeg`，第二次使用 `assets/images/素材/02.jpeg`，随后使用 03 和用户选择的 04B。
- 恋爱开始时间唯一配置为 `2026-06-10T00:00:00+08:00`。
- 最终只显示“↻ 再放一遍”“♡ 郭静恬美照”“📷 我们的照片”三个按钮。
- 不使用 React、Vue、大型框架、在线字体或在线动画依赖。
- 不修改、覆盖、压缩或重命名原始照片。
- 网页代码只使用项目相对路径。
- 手机端优先，无横向滚动，照片不遮挡正文，并支持安全区域。

---

## File Structure

```text
E:\七夕\
├── index.html                 # 应用语义外壳、加载状态、音乐按钮、主舞台、相册层
├── package.json               # ESM 模式和测试/预览命令
├── assets\                    # 用户原始正文、图片和 BGM；不修改
├── css\
│   └── style.css              # 视觉系统、场景布局、动效、响应式和减少动态效果
├── js\
│   ├── content.js             # 配置、素材清单、正文读取/解析、计时计算
│   ├── music.js               # 唯一 Audio 实例和播放状态
│   ├── galleries.js           # 两个相册、灯箱、键盘/触摸导航
│   ├── scenes.js              # 场景渲染、状态机、动画时间线和软复位
│   └── main.js                # 启动、依赖装配、错误边界
├── scripts\
│   └── serve.mjs              # 无依赖本地静态服务器
└── tests\
    ├── content.test.mjs       # 正文保护、素材映射、计时器
    ├── controllers.test.mjs   # 音乐单实例、卡堆顺序、播放器状态
    └── paths.test.mjs         # 全部真实资源路径存在
```

## Shared Interfaces

```ts
// js/content.js
declare const relationshipStart: "2026-06-10T00:00:00+08:00";
declare const assets: Readonly<{
  letter: string[]; gifts: string[]; handmadeBook: string[];
  together: string[]; guoDaily: string[]; music: string;
}>;
declare function parseLetterSource(source: string): LetterModel;
declare function loadLetter(url?: string): Promise<LetterModel>;
declare function calculateElapsed(start: string, now?: Date): {
  days: number; hours: number; minutes: number; seconds: number;
};

// js/music.js
declare function createMusicController(options: MusicOptions): {
  play(): Promise<boolean>; pause(): void; reset(): void; toggle(): Promise<boolean>;
  destroy(): void; isPlaying(): boolean;
};

// js/galleries.js
declare function rotateStack<T>(order: T[]): T[];
declare function createGalleryController(options: GalleryOptions): {
  open(kind: "guo" | "together", trigger?: HTMLElement): void;
  close(): void; reset(): void; destroy(): void; isOpen(): boolean;
};

// js/scenes.js
declare function createScenePlayer(options: ScenePlayerOptions): {
  start(): void; next(): void; reset(): void; destroy(): void; getState(): SceneState;
};
```

`LetterModel` 的稳定结构：

```js
{
  title: "给郭静恬宝宝的一封信",
  greeting: "亲爱的郭静恬宝宝你好呀~",
  scenes: [
    {
      id: "opening" | "letter" | "gifts" | "handmade" | "future" |
          "change" | "counter" | "love" | "last" | "menu",
      beats: [{ paragraphs: ["原文段落"], media: [{ type, src, alt }] }]
    }
  ]
}
```

---

### Task 1: 建立测试基线、素材清单和正文解析器

**Files:**
- Create: `package.json`
- Create: `js/content.js`
- Create: `tests/content.test.mjs`
- Create: `tests/paths.test.mjs`
- Create: `scripts/serve.mjs`
- Read only: `assets/七夕.txt`

**Interfaces:**
- Consumes: UTF-8 `assets/七夕.txt` 与现有真实素材路径。
- Produces: `relationshipStart`、`assets`、`parseLetterSource(source)`、`loadLetter(url)`、`calculateElapsed(start, now)`。

- [ ] **Step 1: 写正文解析和计时器的失败测试**

```js
// tests/content.test.mjs
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

test("parses ten playback stages without developer markers", () => {
  const model = parseLetterSource(source);
  assert.deepEqual(model.scenes.map(({ id }) => id), [
    "opening", "letter", "gifts", "handmade", "future",
    "change", "counter", "love", "last", "menu",
  ]);
  const visible = model.scenes.flatMap((scene) => scene.beats)
    .flatMap((beat) => beat.paragraphs).join("\n");
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
  const visible = parseLetterSource(source).scenes.flatMap((scene) => scene.beats)
    .flatMap((beat) => beat.paragraphs);
  for (const phrase of [
    "很感动很感动", "很萌很萌", "绷不住了", "没事。",
    "我想变成一个更会表达爱的人。", "To be continued... ♡",
    "秦灿宇", "2026 8.13",
  ]) assert.ok(visible.some((paragraph) => paragraph.includes(phrase)), phrase);
});

test("calculates elapsed relationship time from the single configured start", () => {
  assert.equal(relationshipStart, "2026-06-10T00:00:00+08:00");
  assert.deepEqual(calculateElapsed(relationshipStart, new Date("2026-06-12T01:02:03+08:00")), {
    days: 2, hours: 1, minutes: 2, seconds: 3,
  });
});

test("declares every numbered gift in order", () => {
  assert.equal(assets.gifts.length, 10);
  assert.equal(assets.gifts[0], "assets/images/daily-gifts/01.png");
  assert.equal(assets.gifts[1], "assets/images/daily-gifts/02、.png");
  assert.equal(assets.gifts[9], "assets/images/daily-gifts/10.jpg");
});
```

- [ ] **Step 2: 写真实路径存在性的失败测试**

```js
// tests/paths.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { assets } from "../js/content.js";

test("every declared local asset exists", async () => {
  const paths = Object.values(assets).flat().filter(Boolean);
  for (const relativePath of paths) {
    const url = new URL(`../${relativePath}`, import.meta.url);
    await assert.doesNotReject(access(fileURLToPath(url)), relativePath);
  }
});
```

- [ ] **Step 3: 运行测试并确认因模块不存在而失败**

Run: `npm test`

Expected: FAIL，错误包含 `Cannot find module '../js/content.js'`。

- [ ] **Step 4: 实现 package、素材清单、纯解析器和计时器**

```json
{
  "name": "qixi-animated-love-letter",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test tests/*.test.mjs",
    "serve": "node scripts/serve.mjs"
  }
}
```

`content.js` 必须以显式数组记录全部 4 张普通配图、10 张礼物、7 张手工书、3 张个人照片、20 张 together 照片和 BGM。解析逻辑按原文 `---` 块和已知开发标记生成稳定的 10 阶段模型；第二次 `（配图：assets/素材/01）` 使用出现次数覆写为素材 02。过滤规则必须只匹配明确开发标记，不得用“删除所有括号内容”的宽泛正则。

```js
export const relationshipStart = "2026-06-10T00:00:00+08:00";

export function calculateElapsed(start, now = new Date()) {
  const totalSeconds = Math.max(0, Math.floor((now.getTime() - new Date(start).getTime()) / 1000));
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor(totalSeconds / 3600) % 24,
    minutes: Math.floor(totalSeconds / 60) % 60,
    seconds: totalSeconds % 60,
  };
}

export async function loadLetter(url = "assets/七夕.txt") {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`正文加载失败（HTTP ${response.status}）`);
  return parseLetterSource(await response.text());
}
```

- [ ] **Step 5: 实现无依赖静态服务器**

```js
// scripts/serve.mjs
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const port = Number(process.env.PORT || 4173);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".gif": "image/gif", ".mp3": "audio/mpeg" };

createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, `http://${request.headers.host}`).pathname);
  const relative = pathname === "/" ? "index.html" : pathname.slice(1);
  const target = normalize(join(root, relative));
  if (!target.startsWith(root)) { response.writeHead(403).end("Forbidden"); return; }
  try {
    if (!statSync(target).isFile()) throw new Error("not a file");
    response.writeHead(200, { "Content-Type": mime[extname(target).toLowerCase()] || "application/octet-stream", "Cache-Control": "no-store" });
    createReadStream(target).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(port, () => console.log(`http://localhost:${port}`));
```

- [ ] **Step 6: 运行测试并提交**

Run: `npm test`

Expected: 所有 `content.test.mjs` 和 `paths.test.mjs` 测试 PASS。

```powershell
git add package.json js/content.js scripts/serve.mjs tests/content.test.mjs tests/paths.test.mjs
git commit -m "feat: parse letter and map qixi assets"
```

---

### Task 2: 搭建语义 HTML 外壳和手机优先视觉系统

**Files:**
- Create: `index.html`
- Create: `css/style.css`
- Create: `js/main.js`
- Modify: `tests/paths.test.mjs`

**Interfaces:**
- Consumes: `loadLetter()`。
- Produces: `#app-stage`、`#music-toggle`、`#gallery-overlay`、`#error-panel` 以及全局设计 token。

- [ ] **Step 1: 添加 HTML 结构失败测试**

```js
// append to tests/paths.test.mjs
import { readFile } from "node:fs/promises";

test("index exposes the required application landmarks", async () => {
  const html = await readFile(new URL("../index.html", import.meta.url), "utf8");
  for (const marker of [
    'id="app-stage"', 'id="music-toggle"', 'id="gallery-overlay"',
    'id="error-panel"', 'type="module"', 'js/main.js',
  ]) assert.match(html, new RegExp(marker.replace(".", "\\.")));
});
```

- [ ] **Step 2: 运行测试并确认 `index.html` 缺失**

Run: `npm test`

Expected: FAIL，错误包含 `ENOENT` 和 `index.html`。

- [ ] **Step 3: 创建可访问应用外壳**

```html
<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta name="theme-color" content="#f8e7e4">
  <title>给郭静恬宝宝的一封信</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <button id="music-toggle" class="music-toggle" type="button" aria-label="播放音乐" aria-pressed="false">♪</button>
  <main id="app-stage" class="app-stage" aria-live="polite"></main>
  <section id="gallery-overlay" class="gallery-overlay" hidden aria-modal="true" role="dialog"></section>
  <section id="error-panel" class="error-panel" hidden role="alert"></section>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 4: 实现视觉 token、舞台、按钮和响应式基础**

```css
:root {
  --cream: #fffaf4;
  --paper: #fffdf9;
  --blush: #f8dedd;
  --rose: #d9a1aa;
  --deep-rose: #a85567;
  --ink: #4b383c;
  --muted: #7d6268;
  --shadow: 0 24px 70px rgb(91 51 62 / 16%);
  --safe-top: max(18px, env(safe-area-inset-top));
  --safe-right: max(18px, env(safe-area-inset-right));
  --safe-bottom: max(22px, env(safe-area-inset-bottom));
  --safe-left: max(18px, env(safe-area-inset-left));
}
* { box-sizing: border-box; }
html, body { margin: 0; width: 100%; min-height: 100%; overflow-x: hidden; }
body { background: var(--cream); color: var(--ink); font-family: "Songti SC", "Noto Serif CJK SC", STSong, serif; }
.app-stage { min-height: 100svh; padding: var(--safe-top) var(--safe-right) var(--safe-bottom) var(--safe-left); isolation: isolate; }
button { min-width: 44px; min-height: 44px; touch-action: manipulation; }
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; scroll-behavior: auto !important; }
}
```

样式文件同时建立 `.scene`、`.letter-copy`、`.photo-card`、`.continue-hint`、`.scene.is-entering/.is-leaving` 的稳定类名。手机正文宽度限制在 `min(100%, 38rem)`；桌面舞台内容宽度限制在 `76rem`。

- [ ] **Step 5: 实现启动加载和错误边界**

```js
// js/main.js initial form
import { loadLetter } from "./content.js";

const stage = document.querySelector("#app-stage");
const errorPanel = document.querySelector("#error-panel");

try {
  const model = await loadLetter();
  stage.dataset.ready = "true";
  stage.dispatchEvent(new CustomEvent("letter:loaded", { detail: model }));
} catch (error) {
  errorPanel.hidden = false;
  errorPanel.textContent = `${error.message}。请在项目目录运行 npm run serve 后打开页面。`;
}
```

- [ ] **Step 6: 运行测试、检查静态路径并提交**

Run: `npm test`

Expected: 全部 PASS。

```powershell
git add index.html css/style.css js/main.js tests/paths.test.mjs
git commit -m "feat: add mobile-first love letter shell"
```

---

### Task 3: 实现 BGM 单实例和仪式感开场

**Files:**
- Create: `js/music.js`
- Create: `js/scenes.js`
- Create: `tests/controllers.test.mjs`
- Modify: `js/main.js`
- Modify: `css/style.css`

**Interfaces:**
- Consumes: `assets.music`、`#music-toggle`、开场 Scene 模型。
- Produces: 音乐控制器和场景播放器的 `start/next/reset/destroy/getState` 接口。

- [ ] **Step 1: 写 BGM 单实例和播放器初始状态失败测试**

```js
// tests/controllers.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { createMusicController } from "../js/music.js";
import { createSceneState } from "../js/scenes.js";

test("music controller reuses the supplied audio object", async () => {
  let plays = 0;
  const audio = { volume: 0, loop: false, currentTime: 9, paused: true, play: async () => { plays += 1; audio.paused = false; }, pause: () => { audio.paused = true; } };
  const button = { dataset: {}, setAttribute() {}, addEventListener() {}, removeEventListener() {} };
  const music = createMusicController({ audio, button, src: "assets/music/bgm.mp3", volume: 0.48, fadeMs: 0 });
  await music.play();
  await music.play();
  assert.equal(plays, 1);
  music.reset();
  assert.equal(audio.currentTime, 0);
  assert.equal(audio.paused, true);
});

test("scene state starts locked on the closed envelope", () => {
  assert.deepEqual(createSceneState(), { sceneIndex: 0, beatIndex: 0, phase: "opening", locked: false });
});
```

- [ ] **Step 2: 运行测试并确认两个模块缺失**

Run: `npm test`

Expected: FAIL，包含 `Cannot find module '../js/music.js'`。

- [ ] **Step 3: 实现音乐控制器**

控制器设置 `audio.src`、`audio.loop = true`，只在 `audio.paused` 时调用 `play()`。淡入使用 `requestAnimationFrame`，失败时捕获异常并将按钮 `data-state="unavailable"`，不得向外抛出导致场景停止。`reset()` 取消淡入帧、暂停并设 `currentTime = 0`。

- [ ] **Step 4: 实现场景状态机和开场 DOM**

```js
export function createSceneState() {
  return { sceneIndex: 0, beatIndex: 0, phase: "opening", locked: false };
}

function renderOpening(stage, model) {
  stage.innerHTML = `
    <section class="scene scene--opening" data-scene="opening">
      <div class="ambient-glow" aria-hidden="true"></div>
      <div class="balloons" aria-hidden="true"></div>
      <button class="envelope" type="button" aria-label="打开给郭静恬宝宝的信">
        <span class="envelope__flap"></span><span class="envelope__seal">♡</span>
      </button>
      <div class="opening-copy"><p>给郭静恬宝宝的一封信</p></div>
    </section>`;
}
```

点击信封后：锁定输入；调用 `music.play()`；播放信封打开、花朵 CSS/SVG 绽放、3–5 个气球慢升和背景由暗到浅的时间线；显示原文 greeting；动画完成后解锁并显示继续提示。装饰元素使用 `aria-hidden="true"`。

- [ ] **Step 5: 装配 main.js**

```js
const audio = new Audio();
const music = createMusicController({ audio, button: musicButton, src: assets.music });
const player = createScenePlayer({
  stage,
  model,
  music,
  galleries: null,
  reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
});
player.start();
```

- [ ] **Step 6: 运行测试并提交**

Run: `npm test`

Expected: 全部 PASS。

```powershell
git add js/music.js js/scenes.js js/main.js css/style.css tests/controllers.test.mjs
git commit -m "feat: animate envelope opening with bgm"
```

---

### Task 4: 实现普通正文和 daily-gifts 动态场景

**Files:**
- Modify: `js/scenes.js`
- Modify: `css/style.css`
- Modify: `tests/controllers.test.mjs`

**Interfaces:**
- Consumes: `LetterModel.scenes[1..2]` 和播放器 `next()`。
- Produces: 可取消的 Beat 时间线、继续提示、礼物逐项构图。

- [ ] **Step 1: 写阅读拍点推进和输入锁失败测试**

```js
test("advance stays in a scene until its final beat", () => {
  const state = { sceneIndex: 1, beatIndex: 0, phase: "waiting", locked: false };
  const next = advanceState(state, { beatCount: 3, sceneCount: 10 });
  assert.deepEqual(next, { sceneIndex: 1, beatIndex: 1, phase: "entering", locked: true });
});

test("advance moves to the next scene after the final beat", () => {
  const state = { sceneIndex: 2, beatIndex: 4, phase: "waiting", locked: false };
  const next = advanceState(state, { beatCount: 5, sceneCount: 10 });
  assert.equal(next.sceneIndex, 3);
  assert.equal(next.beatIndex, 0);
});
```

- [ ] **Step 2: 运行测试并确认 `advanceState` 尚未导出**

Run: `npm test`

Expected: FAIL，包含 `does not provide an export named 'advanceState'`。

- [ ] **Step 3: 实现纯状态推进和可取消动画辅助函数**

`advanceState` 不修改输入对象；锁定时原样返回。场景播放器保存所有 `Animation` 和 timeout id，离场或 reset 时统一取消。每个 Beat 完成后把 phase 设为 `waiting` 并显示 `.continue-hint`。

- [ ] **Step 4: 实现 letter 场景的四组素材节奏**

文字按语义分组：开朗/回应 → 素材 01；被接住/值得 → 素材 02；共情力 → 素材 03；很萌/审美 → 04B。每组使用不同但克制的 `translate/opacity/rotate/filter` 组合，照片先预留比例容器再加载。

```js
const letterMediaClass = ["from-left", "from-right", "soft-scale", "polaroid-drop"];
image.loading = beatIndex < 2 ? "eager" : "lazy";
image.decoding = "async";
image.src = media.src;
```

- [ ] **Step 5: 实现 daily-gifts 逐件构图**

每个礼物 Beat 的正文先出现，随后对应图进入；04/05/06 同一个 Beat 内按 160ms 错峰。新礼物进入时旧照片缩小并移动到边缘记忆轨道，舞台同时保留不超过 4 张完整解码图片；更早图片只保留低负担缩略视觉或移除 DOM。

- [ ] **Step 6: 添加手机/桌面布局和无障碍细节**

手机礼物图限制为 `max-height: 42svh`，正文安全区始终在上方或不透明信纸层；桌面使用文字/图片两列。继续点击区不覆盖图片交互区。

- [ ] **Step 7: 运行测试并提交**

Run: `npm test`

Expected: 全部 PASS。

```powershell
git add js/scenes.js css/style.css tests/controllers.test.mjs
git commit -m "feat: animate letter and daily gifts scenes"
```

---

### Task 5: 实现手工书、未来、改变与实时计时器

**Files:**
- Modify: `js/scenes.js`
- Modify: `css/style.css`
- Modify: `tests/controllers.test.mjs`

**Interfaces:**
- Consumes: handmade/future/change/counter 场景与 `calculateElapsed()`。
- Produces: `rotateStack(order)`、手工书交互、特殊文字节点、实时计时渲染。

- [ ] **Step 1: 写卡堆轮换、特殊节点和计时格式失败测试**

```js
import { rotateStack } from "../js/galleries.js";
import { formatElapsed } from "../js/scenes.js";

test("photo stack moves only its top item to the bottom", () => {
  assert.deepEqual(rotateStack(["a", "b", "c"]), ["b", "c", "a"]);
});

test("formats the timer without overflowing hour fields", () => {
  assert.deepEqual(formatElapsed({ days: 65, hours: 1, minutes: 2, seconds: 3 }), {
    days: "65", clock: "01 小时 · 02 分钟 · 03 秒",
  });
});
```

- [ ] **Step 2: 运行测试并确认缺失导出**

Run: `npm test`

Expected: FAIL，包含 `Cannot find module '../js/galleries.js'` 或缺失 `formatElapsed`。

- [ ] **Step 3: 创建 galleries.js 的纯 `rotateStack` 函数**

```js
export function rotateStack(order) {
  return order.length < 2 ? [...order] : [...order.slice(1), order[0]];
}
```

- [ ] **Step 4: 实现手工书卡堆**

7 张照片使用可复现的偏移、旋转、z-index 和阴影数组。点击顶层时先沿当前旋转方向滑出，更新纯数组顺序，再让所有卡片过渡到新位置。长文按原句拆为 4–6 个阅读拍点，不改变字符；点击照片只翻卡，不推进 Scene。

- [ ] **Step 5: 实现 future 和 change 场景**

future 让圆点在“一个一个打上勾”节奏中依次转为勾，但不添加正文外的愿望标题或按钮。change 场景移除花瓣/气球/照片；“没事。”完整显示后用伪元素划线，再降低 opacity/filter；最终句使用更大字号、深粉细线和延迟进入。

- [ ] **Step 6: 实现实时计时器**

```js
export function formatElapsed(value) {
  const pad = (number) => String(number).padStart(2, "0");
  return { days: String(value.days), clock: `${pad(value.hours)} 小时 · ${pad(value.minutes)} 分钟 · ${pad(value.seconds)} 秒` };
}
```

进入 counter 场景时立即用当前 `Date` 计算；随后用对齐下一秒边界的 timeout 更新。离场/reset/destroy 取消 timeout。天数与时钟分两行，数字变化只动画发生变化的 span。

- [ ] **Step 7: 运行测试并提交**

Run: `npm test`

Expected: 全部 PASS。

```powershell
git add js/galleries.js js/scenes.js css/style.css tests/controllers.test.mjs
git commit -m "feat: add handmade book and relationship counter"
```

---

### Task 6: 实现 together 照片高潮、LAST PART 与最终菜单

**Files:**
- Modify: `js/scenes.js`
- Modify: `css/style.css`
- Modify: `tests/controllers.test.mjs`

**Interfaces:**
- Consumes: love/last/menu Scene 和 `assets.together`。
- Produces: 分批照片层、平静结尾、严格三个按钮。

- [ ] **Step 1: 写高潮照片批次和菜单数量失败测试**

```js
import { selectMemoryBatch } from "../js/scenes.js";

test("memory climax mounts a bounded deterministic batch", () => {
  const paths = Array.from({ length: 20 }, (_, index) => `p${index}`);
  assert.deepEqual(selectMemoryBatch(paths, 0, 4), ["p0", "p1", "p2", "p3"]);
  assert.deepEqual(selectMemoryBatch(paths, 4, 4), ["p4", "p5", "p6", "p7"]);
});
```

- [ ] **Step 2: 运行测试并确认函数缺失**

Run: `npm test`

Expected: FAIL，包含缺失 `selectMemoryBatch`。

- [ ] **Step 3: 实现 bounded together 图片层**

每个关键阅读拍点最多新增 3–4 张图片，主信件同时保留最多 10 个照片节点；位置模板避开 `.love-copy-safe-zone`。手机端照片位于上下边缘和正文纸层之后，桌面端可扩展到左右两侧。图片 `loading="lazy"`、`decoding="async"`，进入动画完成后移除 `will-change`。

- [ ] **Step 4: 实现“我爱你。”和“特别特别需要你”停顿**

两句各使用独立 Beat。前者先清理部分照片并居中；后者进入时再次增加照片层但保持正文背景为高不透明奶白。不要改变前后原文顺序。

- [ ] **Step 5: 实现 LAST PART 归静和原样落款**

转入 last 时逐步降低装饰层 opacity，清理花瓣/气球，保留至多 2 张低对比照片。`To be continued... ♡`、`—— 爱你的`、`秦灿宇`、`2026 8.13` 分别按原文进入。

- [ ] **Step 6: 实现严格三个菜单按钮**

```html
<nav class="final-menu" aria-label="信件结束菜单">
  <button type="button" data-action="replay">↻ 再放一遍</button>
  <button type="button" data-action="guo-gallery">♡ 郭静恬美照</button>
  <button type="button" data-action="together-gallery">📷 我们的照片</button>
</nav>
```

不渲染按钮解释、素材说明、“我们慢慢来。”或任何第四个功能。

- [ ] **Step 7: 运行测试并提交**

Run: `npm test`

Expected: 全部 PASS。

```powershell
git add js/scenes.js css/style.css tests/controllers.test.mjs
git commit -m "feat: complete photo climax and letter ending"
```

---

### Task 7: 实现两个相册、灯箱、触摸浏览和完整软复位

**Files:**
- Modify: `js/galleries.js`
- Modify: `js/scenes.js`
- Modify: `js/main.js`
- Modify: `css/style.css`
- Modify: `tests/controllers.test.mjs`

**Interfaces:**
- Consumes: `#gallery-overlay`、`assets.guoDaily`、`assets.together`、最终菜单动作。
- Produces: `createGalleryController()` 和播放器完整 `reset()`。

- [ ] **Step 1: 写灯箱索引环绕和复位失败测试**

```js
import { wrapIndex } from "../js/galleries.js";

test("gallery navigation wraps in both directions", () => {
  assert.equal(wrapIndex(-1, 3), 2);
  assert.equal(wrapIndex(3, 3), 0);
  assert.equal(wrapIndex(1, 3), 1);
});

test("reset state returns to the unopened envelope", () => {
  const reset = resetSceneState({ sceneIndex: 9, beatIndex: 2, phase: "waiting", locked: false });
  assert.deepEqual(reset, createSceneState());
});
```

- [ ] **Step 2: 运行测试并确认缺失导出**

Run: `npm test`

Expected: FAIL，包含缺失 `wrapIndex` 或 `resetSceneState`。

- [ ] **Step 3: 实现郭静恬个人相册**

3 张照片采用大幅错层拍立得舞台；每张都有从文件名派生之外的中性 alt（“郭静恬日常照片 1”）。点击任意照片进入灯箱。

- [ ] **Step 4: 实现 together Masonry 相册与灯箱**

20 张照片使用 CSS columns 或 grid 密集排布形成错落回忆墙；不是固定九宫格。缩略图懒加载；灯箱预加载当前、前一张、后一张。支持按钮、ArrowLeft、ArrowRight、Escape，并用 pointerdown/pointerup 水平位移超过 45px 判定触摸翻页。

- [ ] **Step 5: 实现焦点和滚动管理**

打开相册保存触发按钮，锁定 body 滚动，把焦点移到关闭按钮；关闭时恢复滚动并把焦点还给触发按钮。相册内部点击不推进主 Scene。

- [ ] **Step 6: 实现完整软复位**

`replay` 依次调用 galleries.reset/close、music.reset、player.reset；player 取消动画/timeout/计时器、清理照片节点、恢复手工书初始数组并重新渲染关闭信封。验证 Audio 对象引用没有变化。

- [ ] **Step 7: 运行测试并提交**

Run: `npm test`

Expected: 全部 PASS。

```powershell
git add js/galleries.js js/scenes.js js/main.js css/style.css tests/controllers.test.mjs
git commit -m "feat: add galleries and seamless replay"
```

---

### Task 8: 集成验证、性能修正和真实浏览器检查

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`
- Modify: `js/*.js`
- Modify: `tests/*.test.mjs`
- Create: `README.md`

**Interfaces:**
- Consumes: 完整网站。
- Produces: 可运行、可复现验证、无控制台错误的交付版本。

- [ ] **Step 1: 添加源码绝对路径和禁止功能扫描测试**

```js
test("source contains no Windows asset paths or forbidden fourth feature", async () => {
  const files = ["index.html", "css/style.css", "js/main.js", "js/content.js", "js/scenes.js", "js/galleries.js", "js/music.js"];
  for (const file of files) {
    const text = await readFile(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(text, /E:\\七夕\\assets/);
    assert.doesNotMatch(text, /留言板|用户系统|写给未来的我们/);
  }
});
```

- [ ] **Step 2: 运行完整自动测试**

Run: `npm test`

Expected: 全部 PASS，无 skipped、todo 或失败测试。

- [ ] **Step 3: 启动网站并扫描 HTTP 资源**

Run: `npm run serve`

Expected: 输出 `http://localhost:4173`。

在另一 PowerShell 终端运行：

```powershell
$core = @('index.html','css/style.css','js/main.js','js/content.js','js/scenes.js','js/galleries.js','js/music.js','assets/七夕.txt')
$assetLines = node -e "import('./js/content.js').then(({assets}) => console.log(Object.values(assets).flat().filter(Boolean).join('`n')))"
$paths = $core + $assetLines
$failed = foreach ($path in $paths) {
  try { $response = Invoke-WebRequest -UseBasicParsing -Uri ("http://localhost:4173/" + $path); if ($response.StatusCode -ne 200) { $path } }
  catch { $path }
}
if ($failed) { throw "HTTP resource failures: $($failed -join ', ')" }
```

Expected: 无输出并以 0 退出；任何失败都修复路径，不替换素材。

- [ ] **Step 4: 用桌面 Chromium 走完完整交互**

验证顺序：关闭信封 → 点击后 BGM 淡入 → 逐 Beat 推进 10 阶段 → 手工书连续翻 8 次并回到初始顶图 → 计时器秒数变化 → together 高潮无遮挡 → LAST PART/落款 → 三个菜单按钮 → 两个相册/灯箱 → 再放一遍。

检查控制台：0 个未捕获异常；检查网络：0 个 404；BGM 播放失败只允许受浏览器策略影响的可控状态，不得阻止正文。

- [ ] **Step 5: 检查响应式和减少动态效果**

至少检查 320×568、375×812、390×844、768×1024、1440×900。每个视口确认 `document.documentElement.scrollWidth === document.documentElement.clientWidth`；正文不被照片覆盖；计时器不溢出；按钮最小 44×44；手工书顶层可点击；相册可关闭。

启用 `prefers-reduced-motion: reduce`，确认内容仍按顺序可见并可推进，装饰漂浮已取消。

- [ ] **Step 6: 写明确的预览说明**

```markdown
# 七夕动态情书

1. 在项目目录打开 PowerShell。
2. 运行 `npm run serve`。
3. 浏览器打开 `http://localhost:4173`。

正文来自 `assets/七夕.txt`；恋爱开始时间在 `js/content.js` 的 `relationshipStart` 一处修改。
```

- [ ] **Step 7: 最终测试、检查 Git 差异并提交**

Run: `npm test`

Expected: 全部 PASS。

Run: `git diff --check`

Expected: 无输出。

```powershell
git add README.md index.html css js scripts tests package.json
git commit -m "test: verify qixi letter experience"
```

---

## Plan Self-Review

- 规格覆盖：10 个阶段、正文保护、01/02 修正映射、礼物、手工书、未来、改变、计时器、照片高潮、LAST PART、三个按钮、两个相册、BGM、重播、响应式、性能和错误处理均有对应任务。
- 接口一致：`relationshipStart`、`assets`、`parseLetterSource`、`calculateElapsed`、`createMusicController`、`rotateStack`、`createGalleryController`、`createScenePlayer` 在共享接口和任务中命名一致。
- 测试策略：纯逻辑由 Node 内置测试覆盖；布局、音频策略、图片解码与动画由真实浏览器验证覆盖。
- 范围控制：没有独立愿望页、第四个按钮、留言板、登录、后台、数据库或大型框架。
