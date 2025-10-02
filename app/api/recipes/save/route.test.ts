import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * @vitest-environment node
 */
import { NextRequest } from "next/server";
import { POST } from "./route";
import type { RecipeSavePayload } from "@/lib/types/recipe";
import { getWeaviateClient } from "@/lib/weaviate/client";

vi.mock("@/lib/weaviate/client", () => {
  return {
    getWeaviateClient: vi.fn(),
  };
});

describe("/api/recipes/save", () => {
  const recipe: RecipeSavePayload = {
    title: "Unit Test Recipe",
    ingredients: ["1 tsp salt"],
    sourceUrl: "https://example.com",
  };
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
    const request = new NextRequest("http://localhost/api/recipes/save", {
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

  it("returns 400 when recipe payload is missing", async () => {
    const request = new NextRequest("http://localhost/api/recipes/save", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data).toMatchObject({ error: expect.stringContaining("recipe") });
  });

  it("persists the recipe using the Weaviate client", async () => {
    const saveRecipe = vi.fn().mockResolvedValue({ id: "test-id" });
    vi.mocked(getWeaviateClient).mockResolvedValue({ saveRecipe });

    const request = new NextRequest("http://localhost/api/recipes/save", {
      method: "POST",
      body: JSON.stringify({ recipe }),
    });

    const response = await POST(request);
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ id: "test-id" });
    expect(saveRecipe).toHaveBeenCalledWith(recipe);
  });

  it("returns 502 when Weaviate rejects the save operation", async () => {
    const error = new Error("Weaviate is down");
    const saveRecipe = vi.fn().mockRejectedValue(error);
    vi.mocked(getWeaviateClient).mockResolvedValue({ saveRecipe });

    const request = new NextRequest("http://localhost/api/recipes/save", {
      method: "POST",
      body: JSON.stringify({ recipe }),
    });

    const response = await POST(request);
    expect(response.status).toBe(502);
    const data = await response.json();
    expect(data).toMatchObject({
      error: expect.stringContaining("Failed to save"),
    });
  });
});
