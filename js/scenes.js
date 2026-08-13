function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createSceneState() {
  return { sceneIndex: 0, beatIndex: 0, phase: "opening", locked: false };
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

export function createScenePlayer({ stage, model, music, galleries, reducedMotion = false }) {
  let state = createSceneState();
  let destroyed = false;
  const timeouts = new Set();
  const cleanups = new Set();
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

  const renderCurrentBeat = () => {
    const sceneModel = model.scenes[state.sceneIndex];
    const beat = sceneModel.beats[state.beatIndex];
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
    hint.hidden = false;
    requestAnimationFrame(() => hint.classList.add("is-visible"));
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
    await enterCurrentBeat();
  }

  function reset() {
    clearPending();
    galleries?.reset?.();
    state = createSceneState();
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
