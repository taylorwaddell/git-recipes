/**
 * Persist scraped recipes via the Next.js API route.
 */
import type { RecipeSavePayload } from "@/lib/types/recipe";

/**
 * Shape returned from the recipe save API endpoint.
 */
export interface ClientSaveRecipeResponse {
  /** Identifier assigned to the stored recipe. */
  id: string;
}

/**
 * Persist a recipe to the backend save endpoint.
 *
 * @param recipe - Normalized recipe payload produced by the scraper.
 * @returns Identifier of the stored recipe on success.
 * @throws Error when the API response indicates failure or the payload is malformed.
 */
export async function saveRecipeToApi(
  recipe: RecipeSavePayload
): Promise<ClientSaveRecipeResponse> {
  const response = await fetch("/api/recipes/save", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ recipe }),
  });

  const data = (await response.json().catch(() => null)) as {
    id?: unknown;
    error?: unknown;
  } | null;

  if (!response.ok || !data || typeof data.id !== "string") {
    const message =
      data && typeof data?.error === "string"
        ? data.error
        : "We couldn't save your recipe. Please try again.";
    throw new Error(message);
  }

  return { id: data.id };
}
