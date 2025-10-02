/**
 * @vitest-environment jsdom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecipeSearchResult } from "@/lib/types/recipe";
import { searchRecipesFromApi } from "@/lib/recipes/search-client";

describe("searchRecipesFromApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the query to the API and returns the results", async () => {
    const mockResults: RecipeSearchResult[] = [
      {
        id: "recipe-1",
        title: "Chocolate Cake",
        ingredients: ["flour", "sugar", "cocoa"],
        sourceUrl: "https://example.com/cake",
        score: 0.95,
      },
    ];

    const mockResponse = {
      ok: true,
      status: 200,
      json: async () => ({ results: mockResults }),
    } as unknown as Response;

    vi.mocked(fetch).mockResolvedValue(mockResponse);

    const result = await searchRecipesFromApi("cake");

    expect(fetch).toHaveBeenCalledWith(
      "/api/recipes/search",
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
    expect(requestInit.body).toEqual(JSON.stringify({ query: "cake" }));
    expect(result).toEqual({ results: mockResults });
  });

  it("throws an error when the API responds with a failure", async () => {
    const mockResponse = {
      ok: false,
      status: 500,
      json: async () => ({ error: "Search failed" }),
    } as unknown as Response;

    vi.mocked(fetch).mockResolvedValue(mockResponse);

    await expect(searchRecipesFromApi("test")).rejects.toThrow(
      /Search failed/i
    );
  });
});
