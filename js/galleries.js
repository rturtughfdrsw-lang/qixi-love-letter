export function rotateStack(order) {
  return order.length < 2 ? [...order] : [...order.slice(1), order[0]];
}

export function wrapIndex(index, length) {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createGalleryController({ overlay, assets }) {
  let kind = null;
  let items = [];
  let lightboxIndex = -1;
  let returnFocus = null;
  let lightboxReturnFocus = null;
  let pointerStartX = null;
  let destroyed = false;
  const backgroundNodes = [
    document.querySelector("#app-stage"),
    document.querySelector("#music-toggle"),
  ].filter(Boolean);

  const labels = {
    guo: { title: "郭静恬美照", subtitle: "被收藏下来的，每一个可爱的你" },
    together: { title: "我们的照片", subtitle: "走过的路、牵过的手，还有很多很多以后" },
  };

  const close = () => {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.replaceChildren();
    document.body.classList.remove("gallery-is-open");
    lightboxIndex = -1;
    lightboxReturnFocus = null;
    kind = null;
    items = [];
    for (const node of backgroundNodes) node.inert = false;
    const target = returnFocus;
    returnFocus = null;
    target?.focus?.({ preventScroll: true });
  };

  const renderLightbox = () => {
    const lightbox = overlay.querySelector(".lightbox");
    if (!lightbox || lightboxIndex < 0) return;
    const item = items[lightboxIndex];
    const image = lightbox.querySelector(".lightbox__image");
    image.src = item;
    image.alt = `${labels[kind].title} ${lightboxIndex + 1}`;
    lightbox.querySelector(".lightbox__count").textContent = `${lightboxIndex + 1} / ${items.length}`;

    for (const adjacentIndex of [lightboxIndex - 1, lightboxIndex + 1]) {
      const preload = new Image();
      preload.src = items[wrapIndex(adjacentIndex, items.length)];
      preload.decoding = "async";
    }
  };

  const moveLightbox = (direction) => {
    if (lightboxIndex < 0) return;
    lightboxIndex = wrapIndex(lightboxIndex + direction, items.length);
    const image = overlay.querySelector(".lightbox__image");
    image.classList.remove("is-changing");
    requestAnimationFrame(() => {
      image.classList.add("is-changing");
      renderLightbox();
    });
  };

  const closeLightbox = () => {
    const lightbox = overlay.querySelector(".lightbox");
    if (!lightbox || lightbox.hidden) return;
    lightbox.hidden = true;
    lightboxIndex = -1;
    const target = lightboxReturnFocus;
    lightboxReturnFocus = null;
    target?.focus?.({ preventScroll: true });
  };

  const openLightbox = (index, trigger) => {
    const lightbox = overlay.querySelector(".lightbox");
    if (!lightbox) return;
    lightboxIndex = wrapIndex(index, items.length);
    lightboxReturnFocus = trigger;
    lightbox.hidden = false;
    renderLightbox();
    lightbox.querySelector(".lightbox__close")?.focus({ preventScroll: true });
  };

  const createLightbox = () => {
    const lightbox = element("section", "lightbox");
    lightbox.hidden = true;
    lightbox.dataset.noAdvance = "true";
    lightbox.setAttribute("aria-label", "照片大图浏览");
    lightbox.setAttribute("aria-modal", "true");
    lightbox.setAttribute("role", "dialog");
    const closeButton = element("button", "lightbox__close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "关闭大图");
    const previous = element("button", "lightbox__nav lightbox__nav--previous", "‹");
    previous.type = "button";
    previous.setAttribute("aria-label", "上一张照片");
    const next = element("button", "lightbox__nav lightbox__nav--next", "›");
    next.type = "button";
    next.setAttribute("aria-label", "下一张照片");
    const image = element("img", "lightbox__image");
    const count = element("span", "lightbox__count");
    closeButton.addEventListener("click", closeLightbox);
    previous.addEventListener("click", () => moveLightbox(-1));
    next.addEventListener("click", () => moveLightbox(1));
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) closeLightbox();
    });
    lightbox.append(closeButton, previous, image, next, count);
    return lightbox;
  };

  const renderGallery = () => {
    const shell = element("div", `gallery-shell gallery-shell--${kind}`);
    shell.dataset.noAdvance = "true";
    const header = element("header", "gallery-header");
    header.append(
      element("span", "gallery-header__eyebrow", "OUR MEMORY ALBUM"),
      element("h2", "gallery-header__title", labels[kind].title),
      element("p", "gallery-header__subtitle", labels[kind].subtitle),
    );
    const closeButton = element("button", "gallery-close", "×");
    closeButton.type = "button";
    closeButton.setAttribute("aria-label", "关闭相册");
    closeButton.addEventListener("click", close);

    const wall = element("div", kind === "guo" ? "guo-gallery" : "together-gallery");
    items.forEach((src, index) => {
      const button = element("button", kind === "guo" ? "guo-gallery__photo" : "together-gallery__photo");
      button.type = "button";
      button.setAttribute("aria-label", `查看${labels[kind].title}第 ${index + 1} 张`);
      button.style.setProperty("--gallery-index", index);
      const image = element("img");
      image.src = src;
      image.alt = kind === "guo" ? `郭静恬日常照片 ${index + 1}` : `我们的照片 ${index + 1}`;
      image.loading = index < 3 ? "eager" : "lazy";
      image.decoding = "async";
      button.append(image);
      button.addEventListener("click", () => openLightbox(index, button));
      wall.append(button);
    });
    shell.append(header, closeButton, wall, createLightbox());
    overlay.replaceChildren(shell);
  };

  const open = (nextKind, trigger) => {
    if (destroyed || !labels[nextKind]) return;
    kind = nextKind;
    items = [...(nextKind === "guo" ? assets.guoDaily : assets.together)];
    returnFocus = trigger ?? document.activeElement;
    renderGallery();
    overlay.hidden = false;
    document.body.classList.add("gallery-is-open");
    for (const node of backgroundNodes) node.inert = true;
    overlay.querySelector(".gallery-close")?.focus({ preventScroll: true });
  };

  const trapFocus = (event) => {
    if (event.key !== "Tab") return false;
    const scope = lightboxIndex >= 0 ? overlay.querySelector(".lightbox") : overlay.querySelector(".gallery-shell");
    const focusable = [...(scope?.querySelectorAll("button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])") ?? [])]
      .filter((node) => !node.hidden && node.getClientRects().length > 0);
    if (!focusable.length) return false;

    const first = focusable[0];
    const last = focusable.at(-1);
    if (!scope.contains(document.activeElement)) {
      event.preventDefault();
      first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
    return true;
  };

  const onKeyDown = (event) => {
    if (overlay.hidden) return;
    if (trapFocus(event)) return;
    if (event.key === "Escape") {
      if (lightboxIndex >= 0) closeLightbox();
      else close();
    } else if (event.key === "ArrowLeft" && lightboxIndex >= 0) moveLightbox(-1);
    else if (event.key === "ArrowRight" && lightboxIndex >= 0) moveLightbox(1);
  };

  const onPointerDown = (event) => {
    if (lightboxIndex >= 0) pointerStartX = event.clientX;
  };

  const onPointerUp = (event) => {
    if (pointerStartX === null || lightboxIndex < 0) return;
    const distance = event.clientX - pointerStartX;
    pointerStartX = null;
    if (Math.abs(distance) >= 45) moveLightbox(distance > 0 ? -1 : 1);
  };

  document.addEventListener("keydown", onKeyDown);
  overlay.addEventListener("pointerdown", onPointerDown);
  overlay.addEventListener("pointerup", onPointerUp);

  return {
    open,
    close,
    reset() { close(); },
    isOpen: () => !overlay.hidden,
    destroy() {
      destroyed = true;
      close();
      document.removeEventListener("keydown", onKeyDown);
      overlay.removeEventListener("pointerdown", onPointerDown);
      overlay.removeEventListener("pointerup", onPointerUp);
    },
  };
}
