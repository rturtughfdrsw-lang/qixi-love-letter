function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

import { calculateElapsed, relationshipStart } from "./content.js";
import { rotateStack } from "./galleries.js";

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

export function createScenePlayer({ stage, model, music, galleries, reducedMotion = false }) {
  let state = createSceneState();
  let destroyed = false;
  const timeouts = new Set();
  const cleanups = new Set();
  const initialBookOrder = model.scenes.find(({ id }) => id === "handmade")?.beats[0]?.media ?? [];
  let bookOrder = [...initialBookOrder];
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

  const createParagraphs = (paragraphs) => {
    const copy = element("div", "letter-copy memory-copy");
    paragraphs.forEach((paragraph, index) => {
      const line = element("p", "animated-line", paragraph);
      line.style.setProperty("--line-index", index);
      copy.append(line);
    });
    return copy;
  };

  const createPhotoCard = (item, index, isCurrent) => {
    const figure = element("figure", `photo-card memory-photo ${isCurrent ? "is-current" : "is-memory"}`);
    figure.style.setProperty("--photo-index", index);
    const image = element("img");
    image.src = item.src;
    image.alt = item.alt;
    image.loading = isCurrent ? "eager" : "lazy";
    image.decoding = "async";
    figure.append(image);
    return figure;
  };

  const mediaThroughBeat = (scene, beatIndex, limit = 4) => scene.beats
    .slice(0, beatIndex + 1)
    .flatMap((beat) => beat.media)
    .slice(-limit);

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
    const visibleMedia = mediaThroughBeat(sceneModel, beatIndex, sceneModel.id === "gifts" ? 4 : 3);
    visibleMedia.forEach((item, index) => {
      mediaStage.append(createPhotoCard(item, index, index === visibleMedia.length - 1 || beat.media.includes(item)));
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

  const renderGenericScene = (sceneModel, beat, beatIndex) => {
    stage.replaceChildren();
    stage.className = `app-stage app-stage--${sceneModel.id}`;
    const scene = element("section", `scene scene--memory scene--${sceneModel.id} is-entering`);
    scene.dataset.scene = sceneModel.id;
    const inner = element("div", "scene__inner memory-layout memory-layout--quiet");
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

  const renderChangeScene = (sceneModel, beat, beatIndex) => {
    const result = renderGenericScene(sceneModel, beat, beatIndex);
    result.scene.classList.add("scene--change-quiet");
    result.scene.querySelectorAll(".animated-line").forEach((line) => {
      if (line.textContent === "“没事。”" || line.textContent.includes("那句“没事”")) line.classList.add("line--never-mind");
      if (line.textContent.includes("我想变成一个更会表达爱的人。")) line.classList.add("line--love-expression");
    });
    return result;
  };

  const renderCounterScene = (sceneModel, beat, beatIndex) => {
    const result = renderGenericScene(sceneModel, beat, beatIndex);
    if (beat.kind !== "counter-display") return result;

    const copy = result.scene.querySelector(".letter-copy");
    const counter = element("div", "relationship-counter");
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

    let previous = "";
    const update = () => {
      const formatted = formatElapsed(calculateElapsed(relationshipStart));
      const next = `${formatted.days}|${formatted.clock}`;
      days.textContent = formatted.days;
      clock.textContent = formatted.clock;
      if (previous && previous !== next) counter.classList.remove("is-ticking");
      requestAnimationFrame(() => counter.classList.add("is-ticking"));
      previous = next;
      const wait = 1000 - (Date.now() % 1000) + 5;
      const timeout = setTimeout(() => {
        timeouts.delete(timeout);
        update();
      }, wait);
      timeouts.add(timeout);
    };
    update();
    return result;
  };

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
    const mountedCount = Math.min(10, Math.max(4, (beatIndex + 1) * 3));
    const selected = selectMemoryBatch(model.assets?.together ?? [], 0, mountedCount);
    selected.forEach((src, index) => {
      const position = memoryPositions[index];
      const frame = element("figure", "love-memory-photo");
      frame.style.setProperty("--memory-x", position.x);
      frame.style.setProperty("--memory-y", position.y);
      frame.style.setProperty("--memory-r", position.r);
      frame.style.setProperty("--memory-s", position.s);
      frame.style.setProperty("--memory-index", index);
      const image = element("img");
      image.src = src;
      image.alt = "";
      image.loading = index < 2 ? "eager" : "lazy";
      image.decoding = "async";
      frame.append(image);
      photoLayer.append(frame);
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

  const renderLastScene = (sceneModel, beat, beatIndex) => {
    const result = renderGenericScene(sceneModel, beat, beatIndex);
    result.scene.classList.add("scene--last-quiet");
    const copy = result.scene.querySelector(".letter-copy");
    if (beat.kind === "continued") copy.classList.add("last-copy--continued");
    if (beat.kind === "signature") copy.classList.add("last-copy--signature");
    return result;
  };

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
    if (sceneModel.id === "menu") return renderMenuScene(sceneModel);
    if (sceneModel.id === "love") return renderLoveScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "last") return renderLastScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "handmade") return renderHandmadeScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "future") return renderFutureScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "change") return renderChangeScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "counter") return renderCounterScene(sceneModel, beat, state.beatIndex);
    if (sceneModel.id === "letter" || sceneModel.id === "gifts") {
      return renderMemoryScene(sceneModel, beat, state.beatIndex);
    }
    return renderGenericScene(sceneModel, beat, state.beatIndex);
  };

  const enterCurrentBeat = async () => {
    const { hint } = renderCurrentBeat();
    const paragraphCount = model.scenes[state.sceneIndex].beats[state.beatIndex].paragraphs.length;
    await delay(Math.min(1900, 620 + paragraphCount * 210));
    if (destroyed) return;
    if (hint) {
      hint.hidden = false;
      requestAnimationFrame(() => hint.classList.add("is-visible"));
    }
    state = { ...state, phase: "waiting", locked: false };
  };

  const onStageClick = (event) => {
    if (event.target.closest("button, a, [data-no-advance]")) return;
    if (state.phase === "waiting" && !state.locked) next();
  };

  const onKeyDown = (event) => {
    if ((event.key === "Enter" || event.key === " ") && state.phase === "waiting" && !state.locked) {
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

    state = nextState;
    stage.querySelector(".scene")?.classList.add("is-leaving");
    await delay(520);
    if (destroyed) return;
    clearPending();
    await enterCurrentBeat();
  }

  function reset() {
    clearPending();
    galleries?.reset?.();
    bookOrder = [...initialBookOrder];
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
