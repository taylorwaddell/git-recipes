/**
 * Utility helpers to instrument external service calls with Opik tracing.
 */

/**
 * Execute an async operation while leaving a hook for Opik instrumentation.
 *
 * @remarks
 * Currently a passthrough helper until Opik SDK wiring is completed.
 *
 * @param operation - Unique name describing the interaction, e.g. "weaviate.save".
 * @param execute - Async function performing the actual work.
 */
export async function trackExternalOperation<T>(
  operation: string,
  execute: () => Promise<T>
): Promise<T> {
  void operation;
  return execute();
}
