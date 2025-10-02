import { NextResponse, type NextRequest } from "next/server";

import type { RecipeSavePayload } from "@/lib/types/recipe";
import { getWeaviateClient } from "@/lib/weaviate/client";

interface SaveRecipeRequestBody {
  recipe?: unknown;
}

/**
 * Handle recipe persistence requests originating from the Create flow.
 *
 * @param request - Incoming HTTP request containing the recipe payload to store.
 */
export async function POST(request: NextRequest) {
  let payload: SaveRecipeRequestBody;

  try {
    payload = (await request.json()) as SaveRecipeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const recipeCandidate = payload.recipe;
  const validation = validateRecipePayload(recipeCandidate);

  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.errorMessage },
      { status: 400 }
    );
  }

  try {
    const client = await getWeaviateClient();
    const result = await client.saveRecipe(validation.recipe);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to save recipe to Weaviate", error);
    return NextResponse.json(
      { error: "Failed to save recipe. Please try again." },
      { status: 502 }
    );
  }
}

type PayloadValidationResult =
  | { valid: true; recipe: RecipeSavePayload }
  | { valid: false; errorMessage: string };

/**
 * Validate and coerce an arbitrary value into a recipe save payload.
 *
 * @param value - Unknown value supplied by the caller.
 * @returns Validation result indicating success and the normalized payload or a descriptive error.
 */
function validateRecipePayload(value: unknown): PayloadValidationResult {
  if (!value || typeof value !== "object") {
    return {
      valid: false,
      errorMessage:
        "The `recipe` field must be an object containing title, ingredients, and sourceUrl.",
    };
  }

  const record = value as Record<string, unknown>;
  const title = record.title;
  const ingredients = record.ingredients;
  const sourceUrl = record.sourceUrl;

  if (
    !isNonEmptyString(title) ||
    !Array.isArray(ingredients) ||
    !isNonEmptyString(sourceUrl)
  ) {
    return {
      valid: false,
      errorMessage:
        "The `recipe` field must include non-empty title, ingredients[], and sourceUrl values.",
    };
  }

  if (!isStringArray(ingredients)) {
    return {
      valid: false,
      errorMessage: "All ingredients must be strings.",
    };
  }

  return {
    valid: true,
    recipe: {
      title: title.trim(),
      ingredients: ingredients.map((ingredient) => ingredient.trim()),
      sourceUrl: sourceUrl.trim(),
    },
  };
}

/**
 * Determine whether a value is a non-empty string.
 *
 * @param value - Value to evaluate.
 * @returns True when the value is a trimmed non-empty string.
 */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

/**
 * Validate that the provided value is an array of non-empty strings.
 *
 * @param value - Array candidate to inspect.
 * @returns True when each entry is a trimmed non-empty string.
 */
function isStringArray(value: unknown[]): value is string[] {
  return value.every(
    (entry) => typeof entry === "string" && entry.trim().length > 0
  );
}
