function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createSceneState() {
  return { sceneIndex: 0, beatIndex: 0, phase: "opening", locked: false };
}

export function createScenePlayer({ stage, model, music, galleries, reducedMotion = false }) {
  let state = createSceneState();
  let destroyed = false;
  const timeouts = new Set();
  const cleanups = new Set();

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

  function next() {
    if (state.locked || state.phase !== "waiting") return;
    state = { ...state, locked: true, phase: "leaving" };
    stage.dispatchEvent(new CustomEvent("letter:advance-requested", { detail: { ...state } }));
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
