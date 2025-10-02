import type { RecipeSavePayload, RecipeSearchResult } from "@/lib/types/recipe";

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

  /**
   * Search for recipes matching the provided query text.
   *
   * @param query - Free-text search query.
   * @returns Array of matching recipes with relevance scores.
   */
  searchRecipes(query: string): Promise<RecipeSearchResult[]>;
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
  const objectsEndpoint = new URL("/v1/objects", baseUrl).toString();
  const graphqlEndpoint = new URL("/v1/graphql", baseUrl).toString();

  return {
    async saveRecipe(payload: RecipeSavePayload): Promise<SaveRecipeResponse> {
      const requestBody = {
        class: WEAVIATE_RECIPE_CLASS,
        properties: payload,
      };

      return trackExternalOperation(
        "weaviate.save",
        {
          input: {
            title: payload.title,
            ingredientCount: payload.ingredients.length,
          },
          metadata: {
            sourceUrl: payload.sourceUrl,
          },
          tags: ["weaviate", "persistence"],
        },
        async () => {
          const response = await fetch(objectsEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "X-Weaviate-Cluster-Url": baseUrl,
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
        }
      );
    },

    async searchRecipes(query: string): Promise<RecipeSearchResult[]> {
      const trimmedQuery = query.trim();

      if (!trimmedQuery) {
        return [];
      }

      const graphqlQuery = {
        query: `
          {
            Get {
              ${WEAVIATE_RECIPE_CLASS}(
                hybrid: {
                  query: "${escapeGraphQLString(trimmedQuery)}"
                }
                limit: 20
              ) {
                title
                ingredients
                sourceUrl
                _additional {
                  id
                  score
                }
              }
            }
          }
        `,
      };

      return trackExternalOperation(
        "weaviate.search",
        {
          input: { query: trimmedQuery },
          metadata: { timestamp: new Date().toISOString() },
          tags: ["weaviate", "search"],
        },
        async () => {
          const response = await fetch(graphqlEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
              "X-Weaviate-Cluster-Url": baseUrl,
            },
            body: JSON.stringify(graphqlQuery),
          });

          const rawBody = await response.text();
          const parsedBody = safeParseJson(rawBody);

          if (!response.ok) {
            const errorMessage =
              extractWeaviateErrorMessage(parsedBody) ?? rawBody;
            throw new Error(
              `Failed to search recipes in Weaviate: ${response.status} ${
                response.statusText
              }${errorMessage ? ` - ${errorMessage}` : ""}`
            );
          }

          const data = parsedBody as {
            data?: {
              Get?: {
                [key: string]: Array<{
                  title?: unknown;
                  ingredients?: unknown;
                  sourceUrl?: unknown;
                  _additional?: {
                    id?: unknown;
                    score?: unknown;
                  };
                }>;
              };
            };
            errors?: Array<{ message?: string }>;
          };

          if (data.errors && data.errors.length > 0) {
            const errorMessages = data.errors
              .map((err) => err.message)
              .filter((msg): msg is string => Boolean(msg))
              .join("; ");
            throw new Error(`Weaviate search error: ${errorMessages}`);
          }

          const recipes = data?.data?.Get?.[WEAVIATE_RECIPE_CLASS] ?? [];

          return recipes
            .map((item): RecipeSearchResult | null => {
              const id =
                item._additional?.id && typeof item._additional.id === "string"
                  ? item._additional.id
                  : undefined;
              const title =
                typeof item.title === "string" ? item.title : undefined;
              const ingredients = Array.isArray(item.ingredients)
                ? item.ingredients.filter(
                    (ing): ing is string => typeof ing === "string"
                  )
                : undefined;
              const sourceUrl =
                typeof item.sourceUrl === "string" ? item.sourceUrl : undefined;
              const score =
                item._additional?.score &&
                typeof item._additional.score === "number"
                  ? item._additional.score
                  : undefined;

              if (!id || !title || !ingredients || !sourceUrl) {
                return null;
              }

              return {
                id,
                title,
                ingredients,
                sourceUrl,
                score,
              };
            })
            .filter((recipe): recipe is RecipeSearchResult => recipe !== null);
        }
      );
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

/**
 * Escape special characters in a string to safely embed it in a GraphQL query.
 *
 * @param value - Raw string to escape.
 * @returns Escaped string safe for use in GraphQL.
 */
function escapeGraphQLString(value: string): string {
  return value.replace(/["\\]/g, "\\$&").replace(/\n/g, "\\n");
}
