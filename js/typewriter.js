const defaultSchedule = (callback, milliseconds) => {
  const timeout = setTimeout(callback, milliseconds);
  return () => clearTimeout(timeout);
};

export function createTypewriter({
  reducedMotion = false,
  delayFor = () => 82,
  schedule = defaultSchedule,
} = {}) {
  let active = null;

  const settle = (run) => {
    if (active !== run) return;
    run.cancelScheduled?.();
    active = null;
    run.resolve();
  };

  const revealAll = (run) => {
    run.elements.forEach((node, index) => {
      node.textContent = run.texts[index] ?? "";
    });
  };

  const cancel = () => {
    if (!active) return false;
    const run = active;
    run.cancelScheduled?.();
    active = null;
    run.resolve();
    return true;
  };

  const complete = () => {
    if (!active) return false;
    const run = active;
    revealAll(run);
    settle(run);
    return true;
  };

  const play = (elements, texts) => {
    cancel();
    const normalizedTexts = texts.map((text) => String(text));
    elements.forEach((node) => { node.textContent = ""; });

    if (reducedMotion) {
      elements.forEach((node, index) => { node.textContent = normalizedTexts[index] ?? ""; });
      return Promise.resolve();
    }

    return new Promise((resolve) => {
      const run = {
        elements,
        texts: normalizedTexts,
        characters: normalizedTexts.map((text) => Array.from(text)),
        paragraphIndex: 0,
        characterIndex: 0,
        cancelScheduled: null,
        resolve,
      };
      active = run;
      const totalCharacters = run.characters.reduce((sum, characters) => sum + characters.length, 0);

      const scheduleNext = () => {
        if (active !== run) return;
        while (run.paragraphIndex < run.characters.length
          && run.characterIndex >= run.characters[run.paragraphIndex].length) {
          run.paragraphIndex += 1;
          run.characterIndex = 0;
        }
        if (run.paragraphIndex >= run.characters.length) {
          settle(run);
          return;
        }

        const character = run.characters[run.paragraphIndex][run.characterIndex];
        run.cancelScheduled = schedule(() => {
          if (active !== run) return;
          run.elements[run.paragraphIndex].textContent += character;
          run.characterIndex += 1;
          scheduleNext();
        }, delayFor(character, totalCharacters));
      };

      scheduleNext();
    });
  };

  return {
    play,
    complete,
    cancel,
    isRunning: () => Boolean(active),
  };
}
