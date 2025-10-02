/**
 * Client-side helper for searching recipes via the Next.js API route.
 */
import type { RecipeSearchResult } from "@/lib/types/recipe";

/**
 * Shape returned from the recipe search API endpoint.
 */
export interface ClientSearchRecipesResponse {
  /** Array of recipes matching the search query. */
  results: RecipeSearchResult[];
}

/**
 * Search for recipes matching the provided query.
 *
 * @param query - Free-text search query.
 * @returns Array of matching recipes.
 * @throws Error when the API response indicates failure or the payload is malformed.
 */
export async function searchRecipesFromApi(
  query: string
): Promise<ClientSearchRecipesResponse> {
  const response = await fetch("/api/recipes/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  const data = (await response.json().catch(() => null)) as {
    results?: unknown;
    error?: unknown;
  } | null;

  if (!response.ok || !data || !Array.isArray(data.results)) {
    const message =
      data && typeof data?.error === "string"
        ? data.error
        : "We couldn't search recipes. Please try again.";
    throw new Error(message);
  }

  return { results: data.results as RecipeSearchResult[] };
}
