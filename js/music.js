function setButtonState(button, state) {
  const isPlaying = state === "playing";
  button.dataset.state = state;
  button.setAttribute("aria-pressed", String(isPlaying));
  button.setAttribute("aria-label", isPlaying ? "暂停音乐" : "播放音乐");
  button.hidden = false;
}

export function createMusicController({
  audio,
  button,
  src,
  volume = 0.48,
  fadeMs = 1100,
}) {
  let fadeFrame = 0;
  let destroyed = false;

  audio.src = src;
  audio.loop = true;
  audio.preload = "metadata";

  const cancelFade = () => {
    if (!fadeFrame) return;
    if (globalThis.cancelAnimationFrame) globalThis.cancelAnimationFrame(fadeFrame);
    else clearTimeout(fadeFrame);
    fadeFrame = 0;
  };

  const schedule = (callback) => {
    if (globalThis.requestAnimationFrame) return globalThis.requestAnimationFrame(callback);
    return setTimeout(() => callback(Date.now()), 16);
  };

  const fadeIn = () => {
    cancelFade();
    if (fadeMs <= 0) {
      audio.volume = volume;
      return;
    }

    audio.volume = 0;
    const startedAt = globalThis.performance?.now?.() ?? Date.now();
    const tick = (time) => {
      const progress = Math.min(1, (time - startedAt) / fadeMs);
      audio.volume = Math.min(volume, volume * progress);
      if (progress < 1 && !audio.paused && !destroyed) fadeFrame = schedule(tick);
      else fadeFrame = 0;
    };
    fadeFrame = schedule(tick);
  };

  const play = async () => {
    if (destroyed) return false;
    if (!audio.paused) {
      setButtonState(button, "playing");
      return true;
    }

    try {
      if (fadeMs > 0) audio.volume = 0;
      await audio.play();
      fadeIn();
      setButtonState(button, "playing");
      return true;
    } catch (error) {
      cancelFade();
      setButtonState(button, "unavailable");
      console.warn("BGM 播放失败：", error);
      return false;
    }
  };

  const pause = () => {
    cancelFade();
    audio.pause();
    setButtonState(button, "paused");
  };

  const reset = () => {
    cancelFade();
    audio.pause();
    try { audio.currentTime = 0; } catch { /* metadata may not be ready */ }
    audio.volume = volume;
    setButtonState(button, "paused");
  };

  const toggle = async () => {
    if (audio.paused) return play();
    pause();
    return false;
  };

  const onButtonClick = (event) => {
    event.stopPropagation();
    void toggle();
  };

  button.addEventListener("click", onButtonClick);

  return {
    play,
    pause,
    reset,
    toggle,
    isPlaying: () => !audio.paused,
    destroy() {
      destroyed = true;
      cancelFade();
      button.removeEventListener("click", onButtonClick);
      audio.pause();
    },
  };
}
