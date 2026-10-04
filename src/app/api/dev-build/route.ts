import { readdir, stat } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-dynamic";

const skip = new Set(["node_modules", ".next", ".git", "vendor", "public", "review"]);

async function newest(dir: string): Promise<number> {
  let max = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (skip.has(entry.name) || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) max = Math.max(max, await newest(full));
    else max = Math.max(max, (await stat(full)).mtimeMs);
  }
  return max;
}

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return new Response("production", { status: 404 });
  }
  const stamp = String(await newest(path.join(process.cwd(), "src")));
  return new Response(stamp, {
    headers: { "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0" },
  });
}
