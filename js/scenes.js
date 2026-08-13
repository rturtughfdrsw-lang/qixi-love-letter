function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

import { calculateElapsed, relationshipStart } from "./content.js";
import { rotateStack } from "./galleries.js";
import { createTypewriter } from "./typewriter.js";

export function createSceneState() {
  return { sceneIndex: 0, beatIndex: 0, phase: "opening", locked: false };
}

export function resetSceneState() {
  return createSceneState();
}

export function advanceState(state, { beatCount, sceneCount }) {
  if (state.locked || state.phase !== "waiting") return { ...state };

  if (state.beatIndex < beatCount - 1) {
    return { ...state, beatIndex: state.beatIndex + 1, phase: "entering", locked: true };
  }

  if (state.sceneIndex < sceneCount - 1) {
    return { ...state, sceneIndex: state.sceneIndex + 1, beatIndex: 0, phase: "entering", locked: true };
  }

  return { ...state };
}

export function retreatState(state, { previousBeatCount = 0 }) {
  if (state.locked || state.phase !== "waiting") return { ...state };

  if (state.beatIndex > 0) {
    return { ...state, beatIndex: state.beatIndex - 1, phase: "entering", locked: true };
  }

  if (state.sceneIndex > 0 && previousBeatCount > 0) {
    return {
      ...state,
      sceneIndex: state.sceneIndex - 1,
      beatIndex: previousBeatCount - 1,
      phase: "entering",
      locked: true,
    };
  }

  return { ...state };
}

export function formatElapsed(value) {
  const pad = (number) => String(number).padStart(2, "0");
  return {
    days: String(value.days),
    clock: `${pad(value.hours)} 小时 · ${pad(value.minutes)} 分钟 · ${pad(value.seconds)} 秒`,
  };
}

export function selectMemoryBatch(paths, start, count) {
  return paths.slice(Math.max(0, start), Math.max(0, start) + Math.max(0, count));
}

export function selectLoveWindow(paths, beatIndex, batchSize = 3) {
  const end = Math.min(paths.length, Math.max(0, beatIndex + 1) * batchSize);
  return paths.slice(0, end);
}

export function reorderHandmadePhotos(items) {
  if (items.length < 6) return [...items];
  return [items[5], ...items.slice(0, 5), ...items.slice(6)];
}

export function typewriterDelay(character, totalCharacters) {
  const base = Math.max(38, 82 - Math.max(0, totalCharacters - 80) * 0.3);
  return /[。！？!?]/u.test(character) ? base + 210
    : /[，、；：,;:]/u.test(character) ? base + 105
      : base;
}

export function reconcileMediaPaths(previous, next, limit) {
  const desired = next.slice(-Math.max(0, limit));
  return {
    kept: desired.filter((path) => previous.includes(path)),
    added: desired.filter((path) => !previous.includes(path)),
    removed: previous.filter((path) => !desired.includes(path)),
  };
}

export function shouldHandleSceneShortcut({ key, interactive, galleryOpen }) {
  return (key === "Enter" || key === " ") && !interactive && !galleryOpen;
}

export function createScenePlayer({ stage, model, music, galleries, reducedMotion = false }) {
  let state = createSceneState();
  let destroyed = false;
  const timeouts = new Set();
  const cleanups = new Set();
  const initialBookOrder = model.scenes.find(({ id }) => id === "handmade")?.beats[0]?.media ?? [];
  const reorderedInitialBookOrder = reorderHandmadePhotos(initialBookOrder);
  let bookOrder = [...reorderedInitialBookOrder];
  const typewriter = createTypewriter({ reducedMotion, delayFor: typewriterDelay });
  let relationshipCounterTimeout = null;
  let activeRelationshipCounter = null;
  const stopRelationshipCounter = () => {
    if (relationshipCounterTimeout !== null) {
      clearTimeout(relationshipCounterTimeout);
      timeouts.delete(relationshipCounterTimeout);
      relationshipCounterTimeout = null;
    }
    if (activeRelationshipCounter) activeRelationshipCounter.dataset.running = "false";
    activeRelationshipCounter = null;
  };
  const sceneLabels = {
    letter: "LETTER · 02",
    gifts: "MEMORIES · GIFTS",
    handmade: "MEMORY · HANDMADE BOOK",
    future: "OUR FUTURE",
    change: "LETTER · CHANGE",
    counter: "OUR TIME",
    love: "LETTER · LOVE",
    last: "LAST PART",
    menu: "TO BE CONTINUED",
  };

  const delay = (milliseconds) => new Promise((resolve) => {
    const duration = reducedMotion ? Math.min(milliseconds, 30) : milliseconds;
    const timeout = setTimeout(() => {
      timeouts.delete(timeout);
      resolve();
    }, duration);
    timeouts.add(timeout);
  });

  const clearPending = () => {
    typewriter.cancel();
    stopRelationshipCounter();
    for (const timeout of timeouts) clearTimeout(timeout);
    timeouts.clear();
    for (const cleanup of cleanups) cleanup();
    cleanups.clear();
  };

  const registerCleanup = (cleanup) => {
    cleanups.add(cleanup);
    return cleanup;
  };

  const createBalloons = () => {
    const group = element("div", "opening-balloons");
    group.setAttribute("aria-hidden", "true");
    ["rose", "cream", "blush", "pearl"].forEach((tone, index) => {
      const balloon = element("span", `opening-balloon opening-balloon--${tone}`);
      balloon.style.setProperty("--balloon-delay", `${index * 0.42}s`);
      balloon.style.setProperty("--balloon-x", `${index % 2 ? 12 : -8}px`);
      group.append(balloon);
    });
    return group;
  };

  const createFlowers = () => {
    const cluster = element("div", "opening-flowers");
    cluster.setAttribute("aria-hidden", "true");
    for (let flowerIndex = 0; flowerIndex < 5; flowerIndex += 1) {
      const flower = element("span", "opening-flower");
      flower.style.setProperty("--flower-index", flowerIndex);
      for (let petalIndex = 0; petalIndex < 6; petalIndex += 1) {
        const petal = element("i", "opening-flower__petal");
        petal.style.setProperty("--petal-index", petalIndex);
        flower.append(petal);
      }
      flower.append(element("b", "opening-flower__heart"));
      cluster.append(flower);
    }
    return cluster;
  };

  const createSparkles = () => {
    const field = element("div", "opening-sparkles");
    field.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 14; index += 1) {
      const sparkle = element("i", "opening-sparkle");
      sparkle.style.setProperty("--sparkle-x", `${8 + ((index * 37) % 86)}%`);
      sparkle.style.setProperty("--sparkle-y", `${7 + ((index * 53) % 82)}%`);
      sparkle.style.setProperty("--sparkle-delay", `${(index % 6) * 0.32}s`);
      field.append(sparkle);
    }
    return field;
  };

  const renderOpening = () => {
    stage.replaceChildren();
    stage.className = "app-stage app-stage--opening";

    const scene = element("section", "scene scene--opening");
    scene.dataset.scene = "opening";
    const veil = element("div", "opening-veil");
    veil.setAttribute("aria-hidden", "true");
    const inner = element("div", "scene__inner opening-stage");
    const eyebrow = element("p", "opening-eyebrow", "QIXI · 2026");
    const title = element("h1", "opening-title", model.title);
    const instruction = element("p", "opening-instruction", "轻触信封，打开这封信");

    const envelope = element("button", "envelope");
    envelope.type = "button";
    envelope.setAttribute("aria-label", "打开给郭静恬宝宝的信");
    envelope.append(
      element("span", "envelope__letter"),
      element("span", "envelope__back"),
      element("span", "envelope__pocket"),
      element("span", "envelope__flap"),
      element("span", "envelope__seal", "♡"),
    );

    const greeting = element("div", "opening-greeting");
    greeting.setAttribute("aria-hidden", "true");
    greeting.append(
      element("span", "opening-greeting__small", "LETTER · 01"),
      element("p", "opening-greeting__copy", model.greeting),
    );

    const onOpen = async (event) => {
      event.stopPropagation();
      if (state.locked || state.phase !== "opening") return;
      state = { ...state, locked: true, phase: "entering" };
      envelope.disabled = true;
      void music.play();
      stage.classList.add("is-letter-open");
      scene.classList.add("is-open");
      await delay(520);
      greeting.setAttribute("aria-hidden", "false");
      greeting.classList.add("is-visible");
      await delay(1450);
      instruction.textContent = "♡ 轻触继续";
      instruction.classList.add("is-ready");
      state = { ...state, locked: false, phase: "waiting", beatIndex: 1 };
    };

    envelope.addEventListener("click", onOpen);
    cleanups.add(() => envelope.removeEventListener("click", onOpen));
    inner.append(
      createSparkles(),
      createBalloons(),
      createFlowers(),
      eyebrow,
      title,
      envelope,
      greeting,
      instruction,
    );
    scene.append(veil, inner);
    stage.append(scene);
  };

  const updateCopyContents = (copy, paragraphs) => {
    const lines = paragraphs.map((paragraph, index) => {
      const line = element("p", "animated-line");
      line.setAttribute("aria-label", paragraph);
      line.style.setProperty("--line-index", index);
      return line;
    });
    copy.replaceChildren(...lines);
    return lines;
  };

  const createParagraphs = (paragraphs) => {
    const copy = element("div", "letter-copy memory-copy");
    updateCopyContents(copy, paragraphs);
    return copy;
  };

  const animateOnce = (node, className, duration = 1200) => {
    node.classList.add(className);
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      node.classList.remove(className);
      node.removeEventListener("animationend", settle);
      clearTimeout(timeout);
      timeouts.delete(timeout);
    };
    node.addEventListener("animationend", settle, { once: true });
    const timeout = setTimeout(settle, reducedMotion ? 40 : duration);
    timeouts.add(timeout);
  };

  const createPhotoCard = (item, slot, isCurrent) => {
    const figure = element("figure", `photo-card memory-photo ${isCurrent ? "is-current" : "is-memory"}`);
    figure.dataset.src = item.src;
    figure.dataset.slot = String(slot % 4);
    figure.style.setProperty("--photo-index", slot);
    const image = element("img");
    image.src = item.src;
    image.alt = item.alt;
    image.loading = isCurrent ? "eager" : "lazy";
    image.decoding = "async";
    figure.append(image);
    animateOnce(figure, "is-entering-photo");
    return figure;
  };

  const mediaThroughBeat = (scene, beatIndex, limit = Infinity) => {
    const media = scene.beats.slice(0, beatIndex + 1).flatMap((beat) => beat.media);
    return Number.isFinite(limit) ? media.slice(-Math.max(0, limit)) : media;
  };

  const preloadUpcomingMedia = () => {
    const scene = model.scenes[state.sceneIndex];
    const upcoming = scene.beats[state.beatIndex + 1] ?? model.scenes[state.sceneIndex + 1]?.beats[0];
    for (const item of upcoming?.media ?? []) {
      const image = new Image();
      image.decoding = "async";
      image.src = item.src;
    }
  };

  const renderMemoryScene = (sceneModel, beat, beatIndex) => {
    stage.replaceChildren();
    stage.className = `app-stage app-stage--${sceneModel.id}`;

    const scene = element("section", `scene scene--memory scene--${sceneModel.id} is-entering`);
    scene.dataset.scene = sceneModel.id;
    scene.dataset.beat = String(beatIndex);
    const inner = element("div", "scene__inner memory-layout");
    const header = element("header", "scene-heading");
    header.append(
      element("span", "scene-heading__label", sceneLabels[sceneModel.id] ?? "LETTER"),
      element("span", "scene-heading__progress", `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`),
    );

    const copy = createParagraphs(beat.paragraphs);
    const mediaStage = element("div", "memory-media");
    mediaStage.setAttribute("aria-label", "与这段文字对应的照片");
    const allMedia = sceneModel.beats.flatMap((entry) => entry.media);
    const visibleMedia = mediaThroughBeat(sceneModel, beatIndex);
    visibleMedia.forEach((item) => {
      const slot = allMedia.findIndex(({ src }) => src === item.src);
      mediaStage.append(createPhotoCard(item, slot, true));
    });

    if (sceneModel.id === "gifts") {
      const giftNumber = Math.min(10, Math.max(0, beatIndex));
      const counter = element("div", "gift-counter");
      counter.setAttribute("aria-hidden", "true");
      counter.append(
        element("span", "gift-counter__current", giftNumber ? String(giftNumber).padStart(2, "0") : "♡"),
        element("span", "gift-counter__line"),
        element("span", "gift-counter__total", "10"),
      );
      inner.append(counter);
    }

    const hint = element("button", "continue-hint");
    hint.type = "button";
    hint.hidden = true;
    hint.setAttribute("aria-label", "继续阅读");
    hint.append(element("span", "continue-hint__heart", "♡"), document.createTextNode("轻触继续"));
    hint.addEventListener("click", (event) => {
      event.stopPropagation();
      next();
    });

    inner.append(header, copy, mediaStage, hint);
    scene.append(inner);
    stage.append(scene);
    requestAnimationFrame(() => scene.classList.add("is-visible"));
    preloadUpcomingMedia();
    return { scene, hint };
  };

  const updateMemoryScene = (sceneModel, beat, beatIndex) => {
    const scene = stage.querySelector(`.scene--${sceneModel.id}`);
    if (!scene) return renderMemoryScene(sceneModel, beat, beatIndex);
    scene.dataset.beat = String(beatIndex);
    scene.querySelector(".scene-heading__progress").textContent = `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`;

    const copy = scene.querySelector(".letter-copy");
    updateCopyContents(copy, beat.paragraphs);

    const mediaStage = scene.querySelector(".memory-media");
    const desiredMedia = mediaThroughBeat(sceneModel, beatIndex);
    const desiredPaths = desiredMedia.map(({ src }) => src);
    const currentPaths = [...mediaStage.children].map(({ dataset }) => dataset.src);
    const changes = reconcileMediaPaths(currentPaths, desiredPaths, desiredPaths.length);
    const allMedia = sceneModel.beats.flatMap((entry) => entry.media);
    for (const src of changes.added) {
      const item = desiredMedia.find((entry) => entry.src === src);
      const slot = allMedia.findIndex((entry) => entry.src === src);
      mediaStage.append(createPhotoCard(item, slot, true));
    }

    const counter = scene.querySelector(".gift-counter__current");
    if (counter) counter.textContent = beatIndex ? String(Math.min(10, beatIndex)).padStart(2, "0") : "♡";

    const hint = scene.querySelector(".continue-hint");
    hint.classList.remove("is-visible");
    hint.hidden = true;
    return { scene, hint };
  };

  const renderGenericScene = (sceneModel, beat, beatIndex) => {
    stage.replaceChildren();
    stage.className = `app-stage app-stage--${sceneModel.id}`;
    const scene = element("section", `scene scene--memory scene--text-only scene--${sceneModel.id} is-entering`);
    scene.dataset.scene = sceneModel.id;
    const inner = element("div", "scene__inner memory-layout memory-layout--quiet memory-layout--text-only");
    const header = element("header", "scene-heading");
    header.append(
      element("span", "scene-heading__label", sceneLabels[sceneModel.id] ?? "LETTER"),
      element("span", "scene-heading__progress", `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`),
    );
    const hint = element("button", "continue-hint");
    hint.type = "button";
    hint.hidden = true;
    hint.textContent = "♡ 轻触继续";
    hint.addEventListener("click", (event) => {
      event.stopPropagation();
      next();
    });
    inner.append(header, createParagraphs(beat.paragraphs), hint);
    scene.append(inner);
    stage.append(scene);
    requestAnimationFrame(() => scene.classList.add("is-visible"));
    return { scene, hint };
  };

  const bookTransforms = [
    { x: 0, y: -8, rotate: -1, scale: 1 },
    { x: 24, y: 8, rotate: 5.5, scale: 0.975 },
    { x: -25, y: 13, rotate: -6.5, scale: 0.95 },
    { x: 34, y: 18, rotate: 8, scale: 0.925 },
    { x: -36, y: 24, rotate: -9, scale: 0.9 },
    { x: 20, y: 29, rotate: 4, scale: 0.875 },
    { x: -16, y: 34, rotate: -4, scale: 0.85 },
  ];

  const positionBookCards = (stack) => {
    const cards = [...stack.querySelectorAll(".book-card")];
    cards.forEach((card, index) => {
      const transform = bookTransforms[index] ?? bookTransforms.at(-1);
      card.style.zIndex = String(cards.length - index);
      card.style.setProperty("--book-x", `${transform.x}px`);
      card.style.setProperty("--book-y", `${transform.y}px`);
      card.style.setProperty("--book-rotate", `${transform.rotate}deg`);
      card.style.setProperty("--book-scale", transform.scale);
      card.dataset.top = String(index === 0);
    });
  };

  const renderHandmadeScene = (sceneModel, beat, beatIndex) => {
    stage.replaceChildren();
    stage.className = "app-stage app-stage--handmade";
    const scene = element("section", "scene scene--handmade is-entering");
    scene.dataset.scene = "handmade";
    const inner = element("div", "scene__inner handmade-layout");
    const header = element("header", "scene-heading");
    header.append(
      element("span", "scene-heading__label", sceneLabels.handmade),
      element("span", "scene-heading__progress", `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`),
    );
    const copy = createParagraphs(beat.paragraphs);
    const stack = element("button", "book-stack");
    stack.type = "button";
    stack.dataset.noAdvance = "true";
    stack.setAttribute("aria-label", "翻看手工书照片，点击把最上面的照片放到底层");

    const renderCards = () => {
      stack.replaceChildren();
      bookOrder.forEach((item, index) => {
        const card = element("span", "book-card");
        card.dataset.src = item.src;
        const image = element("img");
        image.src = item.src;
        image.alt = item.alt;
        image.loading = index < 2 ? "eager" : "lazy";
        image.decoding = "async";
        card.append(image);
        stack.append(card);
      });
      positionBookCards(stack);
    };

    const onFlip = async (event) => {
      event.stopPropagation();
      if (stack.dataset.animating === "true") return;
      const top = stack.querySelector('.book-card[data-top="true"]');
      if (!top) return;
      stack.dataset.animating = "true";
      top.classList.add("is-flipping");
      await delay(430);
      bookOrder = rotateStack(bookOrder);
      renderCards();
      stack.dataset.animating = "false";
    };
    stack.addEventListener("click", onFlip);
    registerCleanup(() => stack.removeEventListener("click", onFlip));
    renderCards();

    const hint = element("button", "continue-hint");
    hint.type = "button";
    hint.hidden = true;
    hint.textContent = "♡ 继续读下去";
    hint.addEventListener("click", (event) => {
      event.stopPropagation();
      next();
    });
    inner.append(header, copy, stack, element("p", "book-stack__tip", "轻触最上面的照片，慢慢翻看 ♡"), hint);
    scene.append(inner);
    stage.append(scene);
    requestAnimationFrame(() => scene.classList.add("is-visible"));
    return { scene, hint };
  };

  const updateHandmadeScene = (sceneModel, beat, beatIndex) => {
    const scene = stage.querySelector(".scene--handmade");
    if (!scene) return renderHandmadeScene(sceneModel, beat, beatIndex);
    scene.querySelector(".scene-heading__progress").textContent = `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`;
    updateCopyContents(scene.querySelector(".letter-copy"), beat.paragraphs);
    const hint = scene.querySelector(".continue-hint");
    hint.classList.remove("is-visible");
    hint.hidden = true;
    return { scene, hint };
  };

  const updateGenericScene = (sceneModel, beat, beatIndex) => {
    const scene = stage.querySelector(`.scene--${sceneModel.id}`);
    if (!scene) return renderGenericScene(sceneModel, beat, beatIndex);
    scene.dataset.beat = String(beatIndex);
    scene.querySelector(".scene-heading__progress").textContent = `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`;
    updateCopyContents(scene.querySelector(".letter-copy"), beat.paragraphs);
    const hint = scene.querySelector(".continue-hint");
    hint.classList.remove("is-visible");
    hint.hidden = true;
    return { scene, hint };
  };

  const renderFutureScene = (sceneModel, beat, beatIndex) => {
    const result = renderGenericScene(sceneModel, beat, beatIndex);
    const inner = result.scene.querySelector(".scene__inner");
    const checklist = element("div", "future-checks");
    checklist.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const item = element("span", "future-check");
      item.style.setProperty("--check-index", index);
      item.append(element("i", "future-check__circle"), element("b", "future-check__mark", "✓"));
      checklist.append(item);
    }
    inner.append(checklist);
    if (beat.media.length) {
      const gif = element("img", "future-gif");
      gif.src = beat.media[0].src;
      gif.alt = beat.media[0].alt;
      gif.loading = "lazy";
      gif.decoding = "async";
      inner.append(gif);
    }
    return result;
  };

  const updateFutureScene = (sceneModel, beat, beatIndex) => {
    const result = updateGenericScene(sceneModel, beat, beatIndex);
    const inner = result.scene.querySelector(".scene__inner");
    if (beat.media.length && !inner.querySelector(".future-gif")) {
      const gif = element("img", "future-gif");
      gif.src = beat.media[0].src;
      gif.alt = beat.media[0].alt;
      gif.loading = "lazy";
      gif.decoding = "async";
      inner.append(gif);
    }
    return result;
  };

  const styleChangeLines = (scene) => {
    scene.querySelectorAll(".animated-line").forEach((line) => {
      const paragraph = line.getAttribute("aria-label") ?? "";
      if (paragraph === "“没事。”" || paragraph.includes("那句“没事”")) line.classList.add("line--never-mind");
      if (paragraph.includes("我想变成一个更会表达爱的人。")) line.classList.add("line--love-expression");
    });
  };

  const renderChangeScene = (sceneModel, beat, beatIndex) => {
    const result = renderGenericScene(sceneModel, beat, beatIndex);
    result.scene.classList.add("scene--change-quiet");
    styleChangeLines(result.scene);
    return result;
  };

  const updateChangeScene = (sceneModel, beat, beatIndex) => {
    const result = updateGenericScene(sceneModel, beat, beatIndex);
    styleChangeLines(result.scene);
    return result;
  };

  const syncRelationshipCounter = (result, visible) => {
    let counter = result.scene.querySelector(".relationship-counter");
    if (!counter && visible) {
      const copy = result.scene.querySelector(".letter-copy");
      counter = element("div", "relationship-counter");
      counter.setAttribute("role", "timer");
      counter.setAttribute("aria-live", "off");
      const days = element("strong", "relationship-counter__days");
      const daysLabel = element("span", "relationship-counter__days-label", "天");
      const clock = element("p", "relationship-counter__clock");
      counter.append(
        element("span", "relationship-counter__eyebrow", "我们已经在一起"),
        element("div", "relationship-counter__day-row"),
        clock,
      );
      counter.querySelector(".relationship-counter__day-row").append(days, daysLabel);
      copy.after(counter);
    }
    if (counter) counter.hidden = !visible;
    if (!visible) stopRelationshipCounter();
    if (counter && visible && counter.dataset.running !== "true") {
      activeRelationshipCounter = counter;
      counter.dataset.running = "true";
      let previous = "";
      const update = () => {
        if (counter.dataset.running !== "true" || counter.hidden || !counter.isConnected) return;
        const formatted = formatElapsed(calculateElapsed(relationshipStart));
        const next = `${formatted.days}|${formatted.clock}`;
        counter.querySelector(".relationship-counter__days").textContent = formatted.days;
        counter.querySelector(".relationship-counter__clock").textContent = formatted.clock;
        if (previous && previous !== next) counter.classList.remove("is-ticking");
        requestAnimationFrame(() => counter.classList.add("is-ticking"));
        previous = next;
        const wait = 1000 - (Date.now() % 1000) + 5;
        relationshipCounterTimeout = setTimeout(() => {
          timeouts.delete(relationshipCounterTimeout);
          relationshipCounterTimeout = null;
          update();
        }, wait);
        timeouts.add(relationshipCounterTimeout);
      };
      update();
    }
    return result;
  };

  const renderCounterScene = (sceneModel, beat, beatIndex) => syncRelationshipCounter(
    renderGenericScene(sceneModel, beat, beatIndex),
    beat.kind === "counter-display",
  );

  const updateCounterScene = (sceneModel, beat, beatIndex) => syncRelationshipCounter(
    updateGenericScene(sceneModel, beat, beatIndex),
    beat.kind === "counter-display",
  );

  const memoryPositions = [
    { x: "-5%", y: "4%", r: "-7deg", s: 0.92 },
    { x: "72%", y: "1%", r: "6deg", s: 0.82 },
    { x: "-8%", y: "65%", r: "5deg", s: 0.78 },
    { x: "74%", y: "62%", r: "-5deg", s: 0.88 },
    { x: "10%", y: "-5%", r: "3deg", s: 0.7 },
    { x: "79%", y: "35%", r: "8deg", s: 0.68 },
    { x: "2%", y: "38%", r: "-8deg", s: 0.72 },
    { x: "60%", y: "73%", r: "4deg", s: 0.74 },
    { x: "21%", y: "70%", r: "-4deg", s: 0.64 },
    { x: "63%", y: "-7%", r: "-3deg", s: 0.66 },
  ];

  const createLovePhoto = (src, globalIndex) => {
    const position = memoryPositions[globalIndex % memoryPositions.length];
    const frame = element("figure", "love-memory-photo");
    frame.dataset.src = src;
    frame.style.setProperty("--memory-x", position.x);
    frame.style.setProperty("--memory-y", position.y);
    frame.style.setProperty("--memory-r", position.r);
    frame.style.setProperty("--memory-s", position.s);
    frame.style.setProperty("--memory-index", globalIndex % memoryPositions.length);
    const image = element("img");
    image.src = src;
    image.alt = "";
    image.loading = "lazy";
    image.decoding = "async";
    frame.append(image);
    animateOnce(frame, "is-entering-photo");
    return frame;
  };

  const renderLoveScene = (sceneModel, beat, beatIndex) => {
    stage.replaceChildren();
    stage.className = "app-stage app-stage--love";
    const scene = element("section", `scene scene--love is-entering ${beat.kind === "love-declaration" ? "is-declaration" : ""} ${beat.kind === "love-need" ? "is-need" : ""}`);
    scene.dataset.scene = "love";
    const inner = element("div", "scene__inner love-layout");
    const header = element("header", "scene-heading");
    header.append(
      element("span", "scene-heading__label", sceneLabels.love),
      element("span", "scene-heading__progress", `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`),
    );

    const photoLayer = element("div", "love-memory-layer");
    photoLayer.setAttribute("aria-hidden", "true");
    const togetherPhotos = model.assets?.together ?? [];
    const selected = selectLoveWindow(togetherPhotos, beatIndex);
    selected.forEach((src) => {
      photoLayer.append(createLovePhoto(src, togetherPhotos.indexOf(src)));
    });

    const copy = createParagraphs(beat.paragraphs);
    copy.classList.add("love-copy-safe-zone");
    if (beat.kind === "love-declaration") copy.classList.add("love-copy--declaration");
    if (beat.kind === "love-need") copy.classList.add("love-copy--need");
    const hint = element("button", "continue-hint");
    hint.type = "button";
    hint.hidden = true;
    hint.textContent = "♡ 轻触继续";
    hint.addEventListener("click", (event) => {
      event.stopPropagation();
      next();
    });
    inner.append(header, photoLayer, copy, hint);
    scene.append(inner);
    stage.append(scene);
    requestAnimationFrame(() => scene.classList.add("is-visible"));
    return { scene, hint };
  };

  const updateLoveScene = (sceneModel, beat, beatIndex) => {
    const scene = stage.querySelector(".scene--love");
    if (!scene) return renderLoveScene(sceneModel, beat, beatIndex);
    scene.classList.toggle("is-declaration", beat.kind === "love-declaration");
    scene.classList.toggle("is-need", beat.kind === "love-need");
    scene.querySelector(".scene-heading__progress").textContent = `${String(beatIndex + 1).padStart(2, "0")} / ${String(sceneModel.beats.length).padStart(2, "0")}`;

    const copy = scene.querySelector(".letter-copy");
    copy.classList.toggle("love-copy--declaration", beat.kind === "love-declaration");
    copy.classList.toggle("love-copy--need", beat.kind === "love-need");
    updateCopyContents(copy, beat.paragraphs);

    const togetherPhotos = model.assets?.together ?? [];
    const selected = selectLoveWindow(togetherPhotos, beatIndex);
    const photoLayer = scene.querySelector(".love-memory-layer");
    const current = [...photoLayer.children].map(({ dataset }) => dataset.src);
    const changes = reconcileMediaPaths(current, selected, selected.length);
    for (const src of changes.added) {
      photoLayer.append(createLovePhoto(src, togetherPhotos.indexOf(src)));
    }

    const hint = scene.querySelector(".continue-hint");
    hint.classList.remove("is-visible");
    hint.hidden = true;
    return { scene, hint };
  };

  const syncLastScene = (result, beat, beatIndex) => {
    let remainder = result.scene.querySelector(".last-memory-remainder");
    if (beatIndex < 3 && !remainder) {
      remainder = element("div", "last-memory-remainder");
      remainder.setAttribute("aria-hidden", "true");
      for (const src of (model.assets?.together ?? []).slice(-2)) {
        const image = element("img", "last-memory-remainder__photo");
        image.src = src;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        remainder.append(image);
      }
      result.scene.querySelector(".scene__inner").prepend(remainder);
    }
    if (remainder) {
      remainder.style.setProperty("--remainder-opacity", String(Math.max(0, 0.28 - beatIndex * 0.09)));
      remainder.hidden = beatIndex >= 3;
    }
    const copy = result.scene.querySelector(".letter-copy");
    copy.classList.toggle("last-copy--continued", beat.kind === "continued");
    copy.classList.toggle("last-copy--signature", beat.kind === "signature");
    return result;
  };

  const renderLastScene = (sceneModel, beat, beatIndex) => {
    const result = renderGenericScene(sceneModel, beat, beatIndex);
    result.scene.classList.add("scene--last-quiet");
    return syncLastScene(result, beat, beatIndex);
  };

  const updateLastScene = (sceneModel, beat, beatIndex) => syncLastScene(
    updateGenericScene(sceneModel, beat, beatIndex),
    beat,
    beatIndex,
  );

  const renderMenuScene = (sceneModel) => {
    stage.replaceChildren();
    stage.className = "app-stage app-stage--menu";
    const scene = element("section", "scene scene--menu is-entering");
    scene.dataset.scene = "menu";
    const inner = element("div", "scene__inner final-layout");
    inner.append(
      element("span", "final-layout__eyebrow", "THE LETTER IS NEVER REALLY FINISHED"),
      element("div", "final-layout__heart", "♡"),
      element("h2", "final-layout__title", "我们的故事还在继续"),
    );
    const menu = element("nav", "final-menu");
    menu.setAttribute("aria-label", "信件结束菜单");
    for (const action of sceneModel.actions) {
      const button = element("button", "final-menu__button", action.label);
      button.type = "button";
      button.dataset.action = action.id;
      button.dataset.noAdvance = "true";
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        if (action.id === "replay") {
          music.reset();
          reset();
        } else if (action.id === "guo-gallery") galleries?.open?.("guo", button);
        else if (action.id === "together-gallery") galleries?.open?.("together", button);
      });
      menu.append(button);
    }
    inner.append(menu);
    scene.append(inner);
    stage.append(scene);
    requestAnimationFrame(() => scene.classList.add("is-visible"));
    return { scene, hint: null };
  };

  const renderCurrentBeat = () => {
    const sceneModel = model.scenes[state.sceneIndex];
    const beat = sceneModel.beats[state.beatIndex];
    const sameScene = stage.querySelector(".scene")?.dataset.scene === sceneModel.id;
    if (sceneModel.id === "menu") return renderMenuScene(sceneModel);
    if (sceneModel.id === "love") return sameScene
      ? updateLoveScene(sceneModel, beat, state.beatIndex)
      : renderLoveScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "last") return sameScene
      ? updateLastScene(sceneModel, beat, state.beatIndex)
      : renderLastScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "handmade") {
      if (stage.querySelector(".scene--handmade")) {
        return updateHandmadeScene(sceneModel, beat, state.beatIndex);
      }
      return renderHandmadeScene(sceneModel, beat, state.beatIndex);
    }
    if (sceneModel.id === "future") return sameScene
      ? updateFutureScene(sceneModel, beat, state.beatIndex)
      : renderFutureScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "change") return sameScene
      ? updateChangeScene(sceneModel, beat, state.beatIndex)
      : renderChangeScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "counter") return sameScene
      ? updateCounterScene(sceneModel, beat, state.beatIndex)
      : renderCounterScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "letter" || sceneModel.id === "gifts") {
      if (stage.querySelector(`.scene--${sceneModel.id}`)) {
        return updateMemoryScene(sceneModel, beat, state.beatIndex);
      }
      return renderMemoryScene(sceneModel, beat, state.beatIndex);
    }
    return renderGenericScene(sceneModel, beat, state.beatIndex);
  };

  const enterCurrentBeat = async () => {
    const { hint } = renderCurrentBeat();
    const paragraphs = model.scenes[state.sceneIndex].beats[state.beatIndex].paragraphs;
    const copy = stage.querySelector(".letter-copy");
    const lines = copy ? [...copy.querySelectorAll(".animated-line")] : [];
    if (copy && lines.length) {
      copy.classList.add("is-typing");
      await typewriter.play(lines, paragraphs);
      copy.classList.remove("is-typing");
    } else {
      await delay(420);
    }
    if (destroyed) return;
    if (hint) {
      hint.hidden = false;
      requestAnimationFrame(() => hint.classList.add("is-visible"));
    }
    state = { ...state, phase: "waiting", locked: false };
  };

  const onStageClick = (event) => {
    if (event.target.closest("button, a, [data-no-advance]")) return;
    if (typewriter.complete()) return;
    if (state.phase === "waiting" && !state.locked) next();
  };

  const onKeyDown = (event) => {
    const interactive = Boolean(event.target?.closest?.("button, a, input, select, textarea, [contenteditable], [data-no-advance]"));
    const galleryOpen = Boolean(galleries?.isOpen?.());
    if (shouldHandleSceneShortcut({ key: event.key, interactive, galleryOpen }) && typewriter.isRunning()) {
      event.preventDefault();
      typewriter.complete();
      return;
    }
    if (shouldHandleSceneShortcut({ key: event.key, interactive, galleryOpen }) && state.phase === "waiting" && !state.locked) {
      event.preventDefault();
      next();
    }
  };

  function start() {
    if (destroyed) return;
    clearPending();
    state = createSceneState();
    renderOpening();
    stage.addEventListener("click", onStageClick);
    document.addEventListener("keydown", onKeyDown);
  }

  async function next() {
    if (state.locked || state.phase !== "waiting") return;
    const currentScene = model.scenes[state.sceneIndex];
    const nextState = advanceState(state, {
      beatCount: currentScene.beats.length,
      sceneCount: model.scenes.length,
    });
    if (!nextState.locked) return;

    const staysInScene = nextState.sceneIndex === state.sceneIndex;
    state = nextState;
    if (!staysInScene) {
      stage.querySelector(".scene")?.classList.add("is-leaving");
      await delay(520);
      if (destroyed) return;
      clearPending();
    }
    await enterCurrentBeat();
  }

  function reset() {
    clearPending();
    galleries?.reset?.();
    bookOrder = [...reorderedInitialBookOrder];
    state = resetSceneState();
    renderOpening();
  }

  function destroy() {
    destroyed = true;
    clearPending();
    stage.removeEventListener("click", onStageClick);
    document.removeEventListener("keydown", onKeyDown);
    stage.replaceChildren();
  }

  return {
    start,
    next,
    reset,
    destroy,
    getState: () => ({ ...state }),
  };
}
