import test from "node:test";
import assert from "node:assert/strict";
import { resolveRequestPath } from "../scripts/serve.mjs";

test("static server rejects normalized paths outside its exact root", () => {
  const root = "E:\\七夕";

  assert.equal(resolveRequestPath(root, "/index.html"), "E:\\七夕\\index.html");
  assert.equal(resolveRequestPath(root, "/../七夕-backup/private.txt"), null);
  assert.equal(resolveRequestPath(root, "/../../Windows/win.ini"), null);
});
