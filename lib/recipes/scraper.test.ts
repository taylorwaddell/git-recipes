import {
  RecipeScrapeParseError,
  RecipeScrapeRequestError,
  scrapeRecipeFromUrl,
} from "@/lib/recipes/scraper";
import { afterEach, describe, expect, it, vi } from "vitest";

const originalFetch = globalThis.fetch;

function mockFetch(
  html: string,
  options: { ok?: boolean; status?: number } = {}
) {
  const ok = options.ok ?? true;
  const status = options.status ?? (ok ? 200 : 500);

  return vi.fn().mockResolvedValue({
    ok,
    status,
    text: vi.fn().mockResolvedValue(html),
    headers: new Headers(),
  } as unknown as Response);
}

afterEach(() => {
  vi.restoreAllMocks();
  if (originalFetch) {
    globalThis.fetch = originalFetch;
  } else {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete (globalThis as { fetch?: typeof fetch }).fetch;
  }
});

describe("scrapeRecipeFromUrl", () => {
  it("extracts title and ingredients from JSON-LD", async () => {
    const html = `<!DOCTYPE html><html><head><script type="application/ld+json">${JSON.stringify(
      {
        "@context": "https://schema.org",
        "@type": "Recipe",
        name: "Test Pancakes",
        recipeIngredient: ["1 cup flour", "2 eggs"],
      }
    )}</script></head><body></body></html>`;

    globalThis.fetch = mockFetch(html) as unknown as typeof fetch;

    await expect(
      scrapeRecipeFromUrl("https://example.com/recipe")
    ).resolves.toEqual({
      title: "Test Pancakes",
      ingredients: ["1 cup flour", "2 eggs"],
      sourceUrl: "https://example.com/recipe",
    });
  });

  it("falls back to DOM-based extraction when JSON-LD is unavailable", async () => {
    const html = `<!DOCTYPE html><html><head><title>Simple Soup</title></head><body><article><h1>Simple Soup</h1><ul class="ingredients"><li>3 cups water</li><li>1 tbsp salt</li></ul></article></body></html>`;

    globalThis.fetch = mockFetch(html) as unknown as typeof fetch;

    await expect(
      scrapeRecipeFromUrl("https://example.com/soup")
    ).resolves.toEqual({
      title: "Simple Soup",
      ingredients: ["3 cups water", "1 tbsp salt"],
      sourceUrl: "https://example.com/soup",
    });
  });

  it("throws a request error for invalid URLs", async () => {
    await expect(scrapeRecipeFromUrl("notaurl")).rejects.toMatchObject({
      name: "RecipeScrapeRequestError",
      status: 400,
    });
  });

  it("throws a request error when fetching fails", async () => {
    const html = "";
    globalThis.fetch = mockFetch(html, {
      ok: false,
      status: 404,
    }) as unknown as typeof fetch;

    await expect(
      scrapeRecipeFromUrl("https://example.com/missing")
    ).rejects.toMatchObject({
      name: "RecipeScrapeRequestError",
      status: 404,
    });
  });

  it("throws a parse error when ingredients cannot be determined", async () => {
    const html = `<!DOCTYPE html><html><head><title>Empty Recipe</title></head><body><h1>Empty Recipe</h1></body></html>`;

    globalThis.fetch = mockFetch(html) as unknown as typeof fetch;

    await expect(
      scrapeRecipeFromUrl("https://example.com/empty")
    ).rejects.toThrow(RecipeScrapeParseError);
  });
});
