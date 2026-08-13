import { loadLetter } from "./content.js";

const stage = document.querySelector("#app-stage");
const errorPanel = document.querySelector("#error-panel");

try {
  const model = await loadLetter();
  stage.dataset.ready = "true";
  stage.setAttribute("aria-busy", "false");
  stage.dispatchEvent(new CustomEvent("letter:loaded", { detail: model }));
} catch (error) {
  stage.setAttribute("aria-busy", "false");
  errorPanel.hidden = false;
  errorPanel.textContent = `${error.message}。请在项目目录运行 npm run serve 后打开页面。`;
  console.error(error);
}
