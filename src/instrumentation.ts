export async function register() {
  if (process.env.NEXT_RUNTIME === "edge") return;
  if (process.env.NODE_ENV !== "development") return;
  const { registerDevMemoryGuard } = await import("@/lib/services/dev-memory-guard");
  registerDevMemoryGuard();
}
