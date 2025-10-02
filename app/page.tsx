"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

import { CreateCard } from "@/components/create-card";
import { RecipeScrapeResult } from "@/lib/types/recipe";
import { ResultsGrid } from "@/components/results-grid";
import { SearchForm } from "@/components/search-form";
import { useState } from "react";

export default function Home() {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [recipe, setRecipe] = useState<RecipeScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setShowResults(false);
    setRecipe(null);
    setScrapeError(null);

    if (mode === "search") {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setShowResults(true);
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/recipes/scrape", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: query }),
      });

      const data = (await response.json().catch(() => null)) as
        | RecipeScrapeResult
        | { error?: string }
        | null;

      if (!response.ok || !data || !("title" in data)) {
        const message =
          (data && "error" in data && data.error) ||
          "We couldn't fetch that recipe. Please try another URL.";
        throw new Error(message);
      }

      setRecipe(data);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't fetch that recipe. Please try another URL.";
      setScrapeError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Search & Create
          </h1>
          <p className="text-lg text-muted-foreground">
            Toggle between modes to search or create content
          </p>
        </div>

        <SearchForm
          mode={mode}
          onModeChange={setMode}
          onSubmit={handleSubmit}
        />

        {isLoading && (
          <div className="mt-12 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
              <p className="text-sm text-muted-foreground">
                {mode === "search" ? "Searching..." : "Creating..."}
              </p>
            </div>
          </div>
        )}

        {mode === "search" && showResults && !isLoading && (
          <div className="mt-12">
            <ResultsGrid />
          </div>
        )}

        {mode === "create" && scrapeError && !isLoading && (
          <Alert variant="destructive" className="mt-12">
            <AlertTitle>Unable to fetch recipe</AlertTitle>
            <AlertDescription>{scrapeError}</AlertDescription>
          </Alert>
        )}

        {mode === "create" && recipe && !isLoading && (
          <div className="mt-12">
            <CreateCard recipe={recipe} />
          </div>
        )}
      </div>
    </main>
  );
}
