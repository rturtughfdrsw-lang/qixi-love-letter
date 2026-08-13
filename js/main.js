import { assets, loadLetter } from "./content.js";
import { createMusicController } from "./music.js";
import { createScenePlayer } from "./scenes.js";

const stage = document.querySelector("#app-stage");
const errorPanel = document.querySelector("#error-panel");
const musicButton = document.querySelector("#music-toggle");

try {
  const model = await loadLetter();
  stage.dataset.ready = "true";
  stage.setAttribute("aria-busy", "false");
  const audio = new Audio();
  const music = createMusicController({ audio, button: musicButton, src: assets.music });
  model.assets = assets;
  let galleryController = null;
  const player = createScenePlayer({
    stage,
    model,
    music,
    galleries: {
      open(...args) { galleryController?.open(...args); },
      reset() { galleryController?.reset(); },
    },
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
  });
  player.start();
  globalThis.__qixiApp = { model, music, player, setGalleries(controller) { galleryController = controller; } };
} catch (error) {
  stage.setAttribute("aria-busy", "false");
  errorPanel.hidden = false;
  errorPanel.textContent = `${error.message}。请在项目目录运行 npm run serve 后打开页面。`;
  console.error(error);
}
