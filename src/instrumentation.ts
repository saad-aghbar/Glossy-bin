export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  const { productionConfigError } = await import("@/lib/production");
  const problem = productionConfigError(process.env);
  if (problem) throw new Error(problem);
}
