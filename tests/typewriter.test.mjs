import test from "node:test";
import assert from "node:assert/strict";
import { createTypewriter } from "../js/typewriter.js";

function controlledSchedule() {
  const queue = [];
  return {
    schedule(callback) {
      const job = { callback, cancelled: false };
      queue.push(job);
      return () => { job.cancelled = true; };
    },
    runNext() {
      const job = queue.shift();
      if (job && !job.cancelled) job.callback();
    },
    get length() { return queue.length; },
  };
}

test("typewriter writes unicode characters and paragraphs sequentially", async () => {
  const clock = controlledSchedule();
  const nodes = [{ textContent: "" }, { textContent: "" }];
  const writer = createTypewriter({ delayFor: () => 1, schedule: clock.schedule });
  const finished = writer.play(nodes, ["你♡", "好"]);

  assert.deepEqual(nodes.map(({ textContent }) => textContent), ["", ""]);
  clock.runNext();
  assert.deepEqual(nodes.map(({ textContent }) => textContent), ["你", ""]);
  clock.runNext();
  clock.runNext();
  assert.deepEqual(nodes.map(({ textContent }) => textContent), ["你♡", "好"]);
  await finished;
  assert.equal(writer.isRunning(), false);
});

test("complete immediately fills every paragraph and resolves playback", async () => {
  const clock = controlledSchedule();
  const nodes = [{ textContent: "" }, { textContent: "" }];
  const writer = createTypewriter({ delayFor: () => 1, schedule: clock.schedule });
  const finished = writer.play(nodes, ["第一段", "第二段"]);

  assert.equal(writer.complete(), true);
  assert.deepEqual(nodes.map(({ textContent }) => textContent), ["第一段", "第二段"]);
  await finished;
  assert.equal(writer.isRunning(), false);
});

test("cancel prevents stale scheduled writes", () => {
  const clock = controlledSchedule();
  const node = { textContent: "" };
  const writer = createTypewriter({ delayFor: () => 1, schedule: clock.schedule });
  void writer.play([node], ["不会残留"]);
  writer.cancel();
  while (clock.length) clock.runNext();

  assert.equal(node.textContent, "");
  assert.equal(writer.isRunning(), false);
});

test("reduced motion reveals complete text without scheduling", async () => {
  const clock = controlledSchedule();
  const node = { textContent: "" };
  const writer = createTypewriter({ reducedMotion: true, schedule: clock.schedule });
  await writer.play([node], ["完整文字"]);

  assert.equal(node.textContent, "完整文字");
  assert.equal(clock.length, 0);
});
