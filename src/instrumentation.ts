export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NODE_ENV !== "production") {
    const { ServerResponse } = await import("node:http");
    const setHeader = ServerResponse.prototype.setHeader;
    ServerResponse.prototype.setHeader = function (name: string, value: number | string | readonly string[]) {
      if (String(name).toLowerCase() === "cache-control" && String(value).includes("no-cache") && !String(value).includes("no-store")) {
        this.setHeader("Clear-Site-Data", '"cache"');
        value = "no-store, no-cache, must-revalidate, max-age=0";
      }
      return setHeader.call(this, name, value);
    };
  }
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { productionConfigError } = await import("@/lib/production");
  const problem = productionConfigError(process.env);
  if (problem) throw new Error(problem);
}
