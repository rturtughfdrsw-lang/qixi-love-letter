import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const outputRoot = resolve(projectRoot, "dist");
const websiteEntries = ["index.html", "css", "js", "assets"];

await rm(outputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });

for (const entry of websiteEntries) {
  await cp(resolve(projectRoot, entry), resolve(outputRoot, entry), { recursive: true });
}

await writeFile(resolve(outputRoot, ".nojekyll"), "", "utf8");
console.log(`Static production site created at ${outputRoot}`);
