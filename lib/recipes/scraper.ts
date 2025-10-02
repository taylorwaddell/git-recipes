import * as cheerio from "cheerio";

import type { RecipeScrapeResult } from "@/lib/types/recipe";

/**
 * Base class for recipe scraping related errors.
 */
export class RecipeScrapeError extends Error {
  /**
   * HTTP status code hint for API consumers.
   */
  public readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "RecipeScrapeError";
    this.status = status;
  }
}

/**
 * Error thrown when the recipe page cannot be retrieved.
 */
export class RecipeScrapeRequestError extends RecipeScrapeError {
  constructor(message: string, status = 502) {
    super(message, status);
    this.name = "RecipeScrapeRequestError";
  }
}

/**
 * Error thrown when the recipe page cannot be parsed for required data.
 */
export class RecipeScrapeParseError extends RecipeScrapeError {
  constructor(message: string, status = 422) {
    super(message, status);
    this.name = "RecipeScrapeParseError";
  }
}

/**
 * Fetch and normalize recipe data from the provided source URL.
 *
 * @param sourceUrl - Fully qualified URL to the recipe page submitted by the user.
 * @returns Normalized recipe data containing title, ingredients, and source URL.
 * @throws RecipeScrapeRequestError When the URL is invalid or the request fails.
 * @throws RecipeScrapeParseError When parsing succeeds but required data is missing.
 */
export async function scrapeRecipeFromUrl(
  sourceUrl: string
): Promise<RecipeScrapeResult> {
  const normalizedUrl = normalizeRecipeUrl(sourceUrl);

  const html = await fetchRecipeHtml(normalizedUrl);
  const $ = cheerio.load(html);

  const recipeFromJsonLd = extractRecipeFromJsonLd($);

  const title = resolveTitle($, recipeFromJsonLd);
  const ingredients = resolveIngredients($, recipeFromJsonLd);

  if (!title || ingredients.length === 0) {
    throw new RecipeScrapeParseError(
      "Unable to extract recipe title and ingredients from the provided URL."
    );
  }

  return {
    title,
    ingredients,
    sourceUrl: normalizedUrl,
  };
}

/**
 * Validate and normalize the provided recipe URL.
 */
function normalizeRecipeUrl(url: string): string {
  try {
    const parsed = new URL(url);

    if (!/^https?:$/.test(parsed.protocol)) {
      throw new RecipeScrapeRequestError(
        "Only HTTP(S) recipe URLs are supported.",
        400
      );
    }

    return parsed.toString();
  } catch {
    throw new RecipeScrapeRequestError("Invalid recipe URL provided.", 400);
  }
}

/**
 * Retrieve the HTML content for the recipe URL.
 */
async function fetchRecipeHtml(url: string): Promise<string> {
  let response: Response;

  try {
    response = await fetch(url, {
      headers: {
        "User-Agent":
          "git-recipes/0.1 (+https://github.com/taylorwaddell/git-recipes)",
        Accept: "text/html,application/xhtml+xml",
      },
    });
  } catch {
    throw new RecipeScrapeRequestError(
      "Failed to fetch the remote recipe content.",
      502
    );
  }

  if (!response.ok) {
    throw new RecipeScrapeRequestError(
      `Recipe request failed with status ${response.status}.`,
      response.status >= 400 && response.status < 500 ? response.status : 502
    );
  }

  try {
    return await response.text();
  } catch {
    throw new RecipeScrapeRequestError(
      "Unable to read the recipe response body.",
      502
    );
  }
}

type JsonLdRecipe = {
  "@type"?: string | string[];
  name?: string;
  headline?: string;
  title?: string;
  recipeIngredient?: unknown;
  ingredients?: unknown;
  ingredient?: unknown;
};

/**
 * Attempt to extract a Recipe entry from JSON-LD blocks.
 */
function extractRecipeFromJsonLd($: cheerio.CheerioAPI): JsonLdRecipe | null {
  const scripts = $("script[type='application/ld+json']").toArray();

  for (const script of scripts) {
    const raw = $(script).contents().text();
    const parsed = parseJsonLd(raw);

    if (!parsed) continue;

    const recipe = findRecipeEntry(parsed);
    if (recipe) {
      return recipe;
    }
  }

  return null;
}

function parseJsonLd(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function findRecipeEntry(data: unknown): JsonLdRecipe | null {
  if (!data) return null;

  if (Array.isArray(data)) {
    for (const entry of data) {
      const recipe = findRecipeEntry(entry);
      if (recipe) return recipe;
    }
    return null;
  }

  if (typeof data === "object") {
    const typed = data as Record<string, unknown>;
    const typeCandidate = typed["@type"];

    if (isRecipeType(typeCandidate)) {
      return typed as JsonLdRecipe;
    }

    if (Array.isArray(typed["@graph"])) {
      return findRecipeEntry(typed["@graph"]);
    }
  }

  return null;
}

function isRecipeType(type: unknown): boolean {
  if (typeof type === "string") {
    return type.toLowerCase() === "recipe";
  }

  if (Array.isArray(type)) {
    return type.some((value) =>
      typeof value === "string" ? value.toLowerCase() === "recipe" : false
    );
  }

  return false;
}

/**
 * Determine the best available title from JSON-LD or the DOM.
 */
function resolveTitle(
  $: cheerio.CheerioAPI,
  recipe: JsonLdRecipe | null
): string {
  const candidates: string[] = [];

  if (recipe) {
    const { name, headline, title } = recipe;
    candidates.push(name ?? "", headline ?? "", title ?? "");
  }

  candidates.push(
    $("meta[property='og:title']").attr("content") ?? "",
    $("meta[name='twitter:title']").attr("content") ?? "",
    $("[itemprop='name']").first().text(),
    $("h1").first().text(),
    $("title").first().text()
  );

  const cleaned = candidates.map(cleanText).filter((value) => value.length > 0);

  return cleaned[0] ?? "";
}

/**
 * Determine the best available ingredient list from JSON-LD or the DOM.
 */
function resolveIngredients(
  $: cheerio.CheerioAPI,
  recipe: JsonLdRecipe | null
): string[] {
  const seen = new Set<string>();

  if (recipe) {
    const fromJsonLd = normalizeIngredientList(
      recipe.recipeIngredient ?? recipe.ingredients ?? recipe.ingredient
    );
    for (const item of fromJsonLd) {
      seen.add(item);
    }
  }

  if (seen.size === 0) {
    for (const item of extractIngredientsFromDom($)) {
      seen.add(item);
    }
  }

  return Array.from(seen);
}

function normalizeIngredientList(value: unknown): string[] {
  const results: string[] = [];

  const push = (candidate: unknown) => {
    if (typeof candidate !== "string") return;
    const cleaned = cleanText(candidate);
    if (cleaned.length > 0) {
      results.push(cleaned);
    }
  };

  if (Array.isArray(value)) {
    for (const item of value) {
      if (
        item &&
        typeof item === "object" &&
        "item" in (item as Record<string, unknown>)
      ) {
        push((item as Record<string, unknown>).item);
      } else {
        push(item as unknown as string);
      }
    }
  } else if (typeof value === "string") {
    value
      .split(/\r?\n/)
      .map((segment) => segment.split(/\s{2,}/))
      .flat()
      .forEach(push);
  }

  return results;
}

function extractIngredientsFromDom($: cheerio.CheerioAPI): string[] {
  const selectors = [
    "[itemprop='recipeIngredient']",
    "[itemprop='ingredients']",
    "ul[class*='ingredient'] li",
    "ol[class*='ingredient'] li",
    "li[class*='ingredient']",
    "li[id*='ingredient']",
  ];

  const values: string[] = [];

  for (const selector of selectors) {
    $(selector)
      .toArray()
      .forEach((element) => {
        const text = cleanText($(element).text());
        if (text.length > 0) {
          values.push(text);
        }
      });

    if (values.length > 0) break;
  }

  return values;
}

function cleanText(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}
