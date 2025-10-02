import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { RecipeSearchResult } from "@/lib/types/recipe";
import { getWeaviateClient } from "@/lib/weaviate/client";

vi.mock("@/lib/weaviate/client", () => {
  return {
    getWeaviateClient: vi.fn(),
  };
});

describe("/api/recipes/search", () => {
  let consoleErrorSpy: ReturnType<typeof vi.spyOn> | undefined;

  beforeEach(() => {
    vi.resetAllMocks();
    consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {
      // Silence expected error logging during tests.
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
    consoleErrorSpy?.mockRestore();
  });

  it("returns 400 when payload is not valid JSON", async () => {
    const request = new NextRequest("http://localhost/api/recipes/search", {
      method: "POST",
      body: "{ invalid",
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toMatchObject({
      error: expect.stringContaining("Invalid JSON"),
    });
  });

  it("returns 400 when query is missing", async () => {
    const request = new NextRequest("http://localhost/api/recipes/search", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toMatchObject({ error: expect.stringContaining("query") });
  });

  it("returns search results from the Weaviate client", async () => {
    const mockResults: RecipeSearchResult[] = [
      {
        id: "recipe-1",
        title: "Test Recipe",
        ingredients: ["flour", "sugar"],
        sourceUrl: "https://example.com/recipe",
        score: 0.9,
      },
    ];

    const searchRecipes = vi.fn().mockResolvedValue(mockResults);
    vi.mocked(getWeaviateClient).mockResolvedValue({ searchRecipes } as any);

    const request = new NextRequest("http://localhost/api/recipes/search", {
      method: "POST",
      body: JSON.stringify({ query: "cake" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ results: mockResults });
    expect(searchRecipes).toHaveBeenCalledWith("cake");
  });

  it("returns 502 when Weaviate rejects the search operation", async () => {
    const error = new Error("Weaviate is down");
    const searchRecipes = vi.fn().mockRejectedValue(error);
    vi.mocked(getWeaviateClient).mockResolvedValue({ searchRecipes } as any);

    const request = new NextRequest("http://localhost/api/recipes/search", {
      method: "POST",
      body: JSON.stringify({ query: "test" }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data).toMatchObject({
      error: expect.stringContaining("Failed to search"),
    });
  });
});
