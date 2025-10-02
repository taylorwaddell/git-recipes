import type { RecipeSavePayload } from "@/lib/types/recipe";
import { getWeaviateConfig } from "@/lib/weaviate/config";
import { trackExternalOperation } from "@/lib/opik/tracing";

/**
 * Name of the Weaviate class that stores recipe data.
 */
const WEAVIATE_RECIPE_CLASS = "Recipe";

let cachedClient: WeaviateClient | null = null;

/**
 * Minimal response returned after persisting a recipe to Weaviate.
 */
export interface SaveRecipeResponse {
  /** Identifier assigned by Weaviate to the stored recipe object. */
  id: string;
}

/**
 * Subset of Weaviate functionality required by the application.
 */
export interface WeaviateClient {
  /**
   * Persist a recipe object and return its Weaviate identifier.
   *
   * @param payload - Recipe details to store in the vector database.
   * @returns Metadata describing the saved object.
   */
  saveRecipe(payload: RecipeSavePayload): Promise<SaveRecipeResponse>;
}

/**
 * Lazily instantiate and cache an HTTP-backed Weaviate client.
 *
 * @returns Cached client capable of persisting recipe objects.
 */
export async function getWeaviateClient(): Promise<WeaviateClient> {
  if (cachedClient) {
    return cachedClient;
  }

  const config = getWeaviateConfig();
  cachedClient = createHttpWeaviateClient(config.url, config.apiKey);
  return cachedClient;
}

/**
 * Reset the cached client instance.
 *
 * @remarks
 * Exposed solely for unit tests to ensure isolated state between runs.
 */
export function __resetWeaviateClientForTesting(): void {
  cachedClient = null;
}

/**
 * Create a lightweight HTTP client for interacting with the Weaviate REST API.
 *
 * @param baseUrl - Base URL of the Weaviate cluster.
 * @param apiKey - API key used for authenticated requests.
 * @returns Object exposing the subset of Weaviate operations required by the app.
 */
function createHttpWeaviateClient(
  baseUrl: string,
  apiKey: string
): WeaviateClient {
  const endpoint = new URL("/v1/objects", baseUrl).toString();

  return {
    async saveRecipe(payload: RecipeSavePayload): Promise<SaveRecipeResponse> {
      const requestBody = {
        class: WEAVIATE_RECIPE_CLASS,
        properties: payload,
      };

      return trackExternalOperation("weaviate.save", async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify(requestBody),
        });

        const rawBody = await response.text();
        const parsedBody = safeParseJson(rawBody);

        if (!response.ok) {
          const errorMessage =
            extractWeaviateErrorMessage(parsedBody) ?? rawBody;
          throw new Error(
            `Failed to save recipe to Weaviate: ${response.status} ${
              response.statusText
            }${errorMessage ? ` - ${errorMessage}` : ""}`
          );
        }

        const data = parsedBody as Partial<SaveRecipeResponse> | undefined;

        if (!data || typeof data.id !== "string" || data.id.length === 0) {
          throw new Error(
            "Weaviate response missing object id after save operation."
          );
        }

        return { id: data.id };
      });
    },
  };
}

/**
 * Attempt to parse a JSON string without throwing on malformed input.
 *
 * @param raw - String response body returned by Weaviate.
 * @returns Parsed JSON object or undefined when parsing fails.
 */
function safeParseJson(raw: string): unknown | undefined {
  if (!raw) {
    return undefined;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

/**
 * Derive a meaningful error message from a Weaviate error response payload.
 *
 * @param body - Parsed response body from Weaviate.
 * @returns First human-readable error message, if any.
 */
function extractWeaviateErrorMessage(body: unknown): string | undefined {
  if (!body || typeof body !== "object") {
    return undefined;
  }

  const record = body as Record<string, unknown>;

  if (Array.isArray(record.error)) {
    const messages = record.error
      .map((entry) => {
        if (entry && typeof entry === "object" && "message" in entry) {
          const value = (entry as { message?: unknown }).message;
          return typeof value === "string" ? value : undefined;
        }
        return undefined;
      })
      .filter((value): value is string => Boolean(value));

    if (messages.length > 0) {
      return messages.join("; ");
    }
  }

  if (typeof record.message === "string" && record.message.length > 0) {
    return record.message;
  }

  if (typeof record.error === "string" && record.error.length > 0) {
    return record.error;
  }

  return undefined;
}
