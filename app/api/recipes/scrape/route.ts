import { NextResponse, type NextRequest } from "next/server";

import {
  scrapeRecipeFromUrl,
  RecipeScrapeParseError,
  RecipeScrapeRequestError,
} from "@/lib/recipes/scraper";

interface ScrapeRequestBody {
  url?: unknown;
}

/**
 * Handle recipe scraping requests from the Create flow.
 */
export async function POST(request: NextRequest) {
  let payload: ScrapeRequestBody;

  try {
    payload = (await request.json()) as ScrapeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const url = typeof payload.url === "string" ? payload.url.trim() : "";

  if (!url) {
    return NextResponse.json(
      { error: "The `url` field is required." },
      { status: 400 }
    );
  }

  try {
    const recipe = await scrapeRecipeFromUrl(url);
    return NextResponse.json(recipe);
  } catch (error) {
    if (error instanceof RecipeScrapeRequestError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    if (error instanceof RecipeScrapeParseError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Failed to scrape recipe", error);
    return NextResponse.json(
      { error: "Failed to scrape recipe." },
      { status: 500 }
    );
  }
}
