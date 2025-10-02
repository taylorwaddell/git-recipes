/**
 * Environment configuration utilities for the Opik SDK.
 */

export interface OpikConfig {
  /** Opik API key for authentication. */
  apiKey: string;
  /** Workspace name where traces will be stored. */
  workspace: string;
  /** Optional URL override for self-hosted Opik instances. */
  urlOverride?: string;
}

/**
 * Collect Opik configuration from environment variables.
 *
 * @throws Error when required environment variables are missing.
 */
export function getOpikConfig(): OpikConfig {
  const apiKey = process.env.OPIK_API_KEY?.trim();
  const workspace = process.env.OPIK_WORKSPACE?.trim();
  const urlOverride = process.env.OPIK_URL_OVERRIDE?.trim();

  const missing: string[] = [];
  if (!apiKey) missing.push("OPIK_API_KEY");
  if (!workspace) missing.push("OPIK_WORKSPACE");

  if (missing.length > 0) {
    throw new Error(
      `Missing required Opik environment variables: ${missing.join(", ")}`
    );
  }

  return {
    apiKey: apiKey!,
    workspace: workspace!,
    urlOverride: urlOverride || undefined,
  };
}
