/**
 * @vitest-environment node
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RecipeSavePayload } from "@/lib/types/recipe";
import {
  __resetWeaviateClientForTesting,
  getWeaviateClient,
  type SaveRecipeResponse,
} from "@/lib/weaviate/client";

vi.mock("@/lib/opik/tracing", () => {
  return {
    trackExternalOperation: vi.fn(
      async (_operation: string, execute: () => Promise<unknown>) => execute()
    ),
  };
});

type MockFetchResponse = {
  ok: boolean;
  status: number;
  statusText: string;
  json: () => Promise<unknown>;
  text: () => Promise<string>;
};

describe("Weaviate client", () => {
  const payload: RecipeSavePayload = {
    title: "Test Recipe",
    ingredients: ["1 cup flour", "2 eggs"],
    sourceUrl: "https://example.com/test-recipe",
  };

  beforeEach(() => {
    process.env.WEAVIATE_URL = "https://example.com";
    process.env.WEAVIATE_API_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn());
    __resetWeaviateClientForTesting();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.WEAVIATE_URL;
    delete process.env.WEAVIATE_API_KEY;
    vi.clearAllMocks();
  });

  it("saves a recipe and returns the new object id", async () => {
    const responseData: SaveRecipeResponse = {
      id: "abcd-1234",
    };

    const mockFetch = vi.mocked(global.fetch);
    const mockResponse: MockFetchResponse = {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => responseData,
      text: async () => JSON.stringify(responseData),
    };

    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const client = await getWeaviateClient();
    const result = await client.saveRecipe(payload);

    expect(mockFetch).toHaveBeenCalledWith(
      "https://example.com/v1/objects",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
          "Content-Type": "application/json",
        }),
      })
    );

    const [_, requestInit] = mockFetch.mock.calls[0] as [string, RequestInit];
    const parsedBody = JSON.parse(requestInit.body as string);
    expect(parsedBody).toMatchObject({
      class: "Recipe",
      properties: {
        title: payload.title,
        ingredients: payload.ingredients,
        sourceUrl: payload.sourceUrl,
      },
    });

    expect(result).toEqual(responseData);
  });

  it("throws a descriptive error when Weaviate returns a non-OK response", async () => {
    const mockFetch = vi.mocked(global.fetch);
    const mockResponse: MockFetchResponse = {
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
      json: async () => ({
        error: [
          {
            message: "Vectorizer offline",
          },
        ],
      }),
      text: async () => '{"error":[{"message":"Vectorizer offline"}]}',
    };

    mockFetch.mockResolvedValue(mockResponse as unknown as Response);

    const client = await getWeaviateClient();

    await expect(client.saveRecipe(payload)).rejects.toThrow(
      /Vectorizer offline/i
    );
  });
});
