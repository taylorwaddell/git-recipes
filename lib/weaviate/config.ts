/**
 * Environment configuration utilities for the Weaviate client.
 */

export interface WeaviateConfig {
  /** Weaviate REST endpoint URL. */
  url: string;
  /** Admin API key for the Weaviate cluster. */
  apiKey: string;
}

/**
 * Collect Weaviate configuration from environment variables.
 *
 * @throws Error when required environment variables are missing.
 */
export function getWeaviateConfig(): WeaviateConfig {
  const url = process.env.WEAVIATE_URL?.trim();
  const apiKey = process.env.WEAVIATE_API_KEY?.trim();

  const missing: string[] = [];

  if (!url) missing.push("WEAVIATE_URL");
  if (!apiKey) missing.push("WEAVIATE_API_KEY");

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(", ")}`
    );
  }

  return { url: url!, apiKey: apiKey! };
}
