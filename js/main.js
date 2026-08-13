import { assets, loadLetter } from "./content.js";
import { createGalleryController } from "./galleries.js";
import { createMusicController } from "./music.js";
import { createScenePlayer } from "./scenes.js";

const stage = document.querySelector("#app-stage");
const errorPanel = document.querySelector("#error-panel");
const musicButton = document.querySelector("#music-toggle");
const galleryOverlay = document.querySelector("#gallery-overlay");

try {
  const model = await loadLetter();
  stage.dataset.ready = "true";
  stage.setAttribute("aria-busy", "false");
  const audio = new Audio();
  const music = createMusicController({ audio, button: musicButton, src: assets.music });
  model.assets = assets;
  const galleryController = createGalleryController({ overlay: galleryOverlay, assets });
  const player = createScenePlayer({
    stage,
    model,
    music,
    galleries: galleryController,
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  player.start();
  globalThis.__qixiApp = { model, music, player, galleries: galleryController };
} catch (error) {
  stage.setAttribute("aria-busy", "false");
  errorPanel.hidden = false;
  errorPanel.textContent = `${error.message}。请在项目目录运行 npm run serve 后打开页面。`;
  console.error(error);
}
