import { getWeaviateConfig } from "@/lib/weaviate/config";

/**
 * Placeholder type for the Weaviate client until the official SDK is wired in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type WeaviateClient = any;

/**
 * Error thrown when Weaviate client instantiation has not been implemented yet.
 */
export class WeaviateClientNotImplementedError extends Error {
  constructor() {
    super("Weaviate client integration not implemented yet.");
    this.name = "WeaviateClientNotImplementedError";
  }
}

/**
 * Lazily instantiate a Weaviate client using environment configuration.
 *
 * @throws WeaviateClientNotImplementedError until the SDK integration is completed.
 */
export async function getWeaviateClient(): Promise<WeaviateClient> {
  const config = getWeaviateConfig();
  void config;

  throw new WeaviateClientNotImplementedError();
}
