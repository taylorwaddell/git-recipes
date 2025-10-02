/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecipeSavePayload } from "@/lib/types/recipe";
import { saveRecipeToApi } from "@/lib/recipes/save-client";

describe("saveRecipeToApi", () => {
  const recipe: RecipeSavePayload = {
    title: "Test Recipe",
    ingredients: ["1 cup flour", "2 eggs"],
    sourceUrl: "https://example.com/recipe",
  };

  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the recipe to the API and returns the identifier", async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ id: "recipe-123" }),
    } as unknown as Response;

    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const result = await saveRecipeToApi(recipe);

    expect(fetch).toHaveBeenCalledWith(
      "/api/recipes/save",
      expect.objectContaining({
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      })
    );

    const [, requestInit] = vi.mocked(fetch).mock.calls[0] as [
      string,
      RequestInit
    ];
    expect(requestInit.body).toEqual(JSON.stringify({ recipe }));
    expect(result).toEqual({ id: "recipe-123" });
  });

  it("throws an error when the API responds with a failure", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({ error: "Weaviate is down" }),
    } as unknown as Response;

    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await expect(saveRecipeToApi(recipe)).rejects.toThrow(/Weaviate is down/i);
  });
});
