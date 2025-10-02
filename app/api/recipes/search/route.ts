import { NextResponse, type NextRequest } from "next/server";

import { getWeaviateClient } from "@/lib/weaviate/client";

interface SearchRecipeRequestBody {
  query?: unknown;
}

/**
 * Handle recipe search requests originating from the Search flow.
 *
 * @param request - Incoming HTTP request containing the search query.
 */
export async function POST(request: NextRequest) {
  let payload: SearchRecipeRequestBody;

  try {
    payload = (await request.json()) as SearchRecipeRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON payload." },
      { status: 400 }
    );
  }

  const query = typeof payload.query === "string" ? payload.query.trim() : "";

  if (!query) {
    return NextResponse.json(
      { error: "The `query` field is required." },
      { status: 400 }
    );
  }

  try {
    const client = await getWeaviateClient();
    const results = await client.searchRecipes(query);
    return NextResponse.json({ results });
  } catch (error) {
    console.error("Failed to search recipes in Weaviate", error);
    return NextResponse.json(
      { error: "Failed to search recipes. Please try again." },
      { status: 502 }
    );
  }
}
