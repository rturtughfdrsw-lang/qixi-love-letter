import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(process.cwd(), process.argv[2] || ".");
const port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".txt": "text/plain; charset=utf-8",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp3": "audio/mpeg",
};

export function resolveRequestPath(serverRoot, pathname) {
  const requestPath = pathname === "/" ? "index.html" : pathname.replace(/^[/\\]+/, "");
  const target = resolve(serverRoot, requestPath);
  const inside = relative(serverRoot, target);
  if (inside === ".." || inside.startsWith(`..${sep}`) || isAbsolute(inside)) return null;
  return target;
}

function serve() {
  return createServer((request, response) => {
    let pathname;
    try {
      const url = new URL(request.url, `http://${request.headers.host}`);
      pathname = decodeURIComponent(url.pathname);
    } catch {
      response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" }).end("Bad request");
      return;
    }
    const target = resolveRequestPath(root, pathname);
    if (!target) {
      response.writeHead(403).end("Forbidden");
      return;
    }

    try {
      if (!statSync(target).isFile()) throw new Error("not a file");
      response.writeHead(200, {
        "Content-Type": mime[extname(target).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      createReadStream(target).pipe(response);
    } catch {
      response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
    }
  });
}

const isDirectRun = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  serve().listen(port, () => console.log(`http://localhost:${port}`));
}
