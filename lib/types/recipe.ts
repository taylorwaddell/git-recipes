/**
 * Normalized data returned from a recipe scraping request.
 */
export interface RecipeScrapeResult {
  /**
   * Human-readable title extracted from the remote recipe source.
   */
  title: string;
  /**
   * Array of ingredient strings normalized from the remote recipe source.
   */
  ingredients: string[];
  /**
   * Original URL submitted by the user for scraping.
   */
  sourceUrl: string;
}

/**
 * Payload persisted to Weaviate when a recipe is saved.
 */
export interface RecipeSavePayload extends RecipeScrapeResult {}

/**
 * Recipe data returned from Weaviate search queries.
 */
export interface RecipeSearchResult {
  /**
   * Stored recipe identifier returned from Weaviate.
   */
  id: string;
  /**
   * Recipe title as stored in Weaviate.
   */
  title: string;
  /**
   * Stored ingredients associated with the recipe.
   */
  ingredients: string[];
  /**
   * Original source URL for the recipe.
   */
  sourceUrl: string;
  /**
   * Optional similarity or relevance score returned by search queries.
   */
  score?: number;
}
