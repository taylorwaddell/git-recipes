/**
 * Recipe scraping utilities.
 */
import type { RecipeScrapeResult } from "@/lib/types/recipe";

/**
 * Error thrown when scraping support has not been wired up yet.
 */
export class RecipeScrapeNotImplementedError extends Error {
  constructor() {
    super("Recipe scraping not implemented yet.");
    this.name = "RecipeScrapeNotImplementedError";
  }
}

/**
 * Fetch and normalize recipe data from the provided source URL.
 *
 * @remarks
 * This placeholder throws until the scraping pipeline is implemented.
 *
 * @param sourceUrl - Fully qualified URL to the recipe page submitted by the user.
 * @returns Normalized recipe data containing title, ingredients, and source URL.
 * @throws RecipeScrapeNotImplementedError when scraping has not been implemented.
 */
export async function scrapeRecipeFromUrl(
  sourceUrl: string
): Promise<RecipeScrapeResult> {
  void sourceUrl;
  throw new RecipeScrapeNotImplementedError();
}
