/**
 * Utility helpers to instrument external service calls with Opik tracing.
 */

import { Opik } from "opik";
import { getOpikConfig } from "./config";

/**
 * Shared Opik client instance (singleton pattern).
 */
let opikClient: Opik | null = null;

/**
 * Get or create the shared Opik client instance.
 *
 * @returns Configured Opik client.
 */
function getOpikClient(): Opik {
  if (!opikClient) {
    const config = getOpikConfig();
    opikClient = new Opik({
      apiKey: config.apiKey,
      workspaceName: config.workspace,
      projectName: "git-recipes",
      ...(config.urlOverride && { apiUrl: config.urlOverride }),
    });
  }
  return opikClient;
}

/**
 * Context passed to traced operations for logging additional details.
 */
export interface TraceContext {
  /** Input parameters for the operation (will be logged to trace). */
  input?: Record<string, unknown>;
  /** Additional metadata to attach to the trace. */
  metadata?: Record<string, unknown>;
  /** Tags to categorize the operation. */
  tags?: string[];
}

/**
 * Execute an async operation with Opik tracing instrumentation.
 *
 * Creates a trace and span for the operation, logs input/output/errors,
 * and ensures traces are flushed before returning.
 *
 * @param operation - Unique name describing the interaction, e.g. "weaviate.save".
 * @param context - Optional context with input, metadata, and tags.
 * @param execute - Async function performing the actual work.
 * @returns The result of the executed operation.
 * @throws Re-throws any error from the operation after logging to Opik.
 */
export async function trackExternalOperation<T>(
  operation: string,
  context: TraceContext | undefined,
  execute: () => Promise<T>
): Promise<T> {
  const client = getOpikClient();
  const startTime = Date.now();

  // Create a trace for this operation
  const trace = client.trace({
    name: operation,
    input: context?.input,
    metadata: context?.metadata,
    tags: context?.tags,
  });

  try {
    // Execute the operation
    const result = await execute();

    // Log successful completion
    const endTime = Date.now();
    trace.update({
      output: { success: true },
      metadata: {
        ...context?.metadata,
        duration_ms: endTime - startTime,
      },
    });
    trace.end();

    // Flush to ensure trace is sent
    await client.flush();

    return result;
  } catch (error) {
    // Log error details
    const endTime = Date.now();
    trace.update({
      output: {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      metadata: {
        ...context?.metadata,
        duration_ms: endTime - startTime,
        error_type: error instanceof Error ? error.name : "Unknown",
      },
    });
    trace.end();

    // Flush before re-throwing
    await client.flush();

    throw error;
  }
}
