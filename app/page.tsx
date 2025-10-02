"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RecipeScrapeResult, RecipeSearchResult } from "@/lib/types/recipe";
import { useCallback, useState } from "react";

import { CreateCard } from "@/components/create-card";
import { ResultsGrid } from "@/components/results-grid";
import { SearchForm } from "@/components/search-form";
import { saveRecipeToApi } from "@/lib/recipes/save-client";
import { searchRecipesFromApi } from "@/lib/recipes/search-client";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const [mode, setMode] = useState<"search" | "create">("search");
  const [isLoading, setIsLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [searchResults, setSearchResults] = useState<RecipeSearchResult[]>([]);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<RecipeScrapeResult | null>(null);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedRecipeId, setSavedRecipeId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const { toast } = useToast();

  const handleModeChange = useCallback((nextMode: "search" | "create") => {
    setMode(nextMode);
    setShowResults(false);
    setSearchResults([]);
    setSearchError(null);
    setRecipe(null);
    setScrapeError(null);
    setSavedRecipeId(null);
    setSaveError(null);
    setIsSaving(false);
  }, []);

  const handleSubmit = async (query: string) => {
    setIsLoading(true);
    setShowResults(false);
    setSearchResults([]);
    setSearchError(null);
    setRecipe(null);
    setScrapeError(null);
    setSavedRecipeId(null);
    setSaveError(null);

    if (mode === "search") {
      try {
        const { results } = await searchRecipesFromApi(query);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "We couldn't search recipes. Please try again.";
        setSearchError(message);
      } finally {
        setIsLoading(false);
      }
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

  const handleSaveRecipe = useCallback(async () => {
    if (!recipe || isSaving) {
      return;
    }

    if (savedRecipeId) {
      toast({
        title: "Recipe already saved",
        description: "This recipe is already stored in Weaviate.",
      });
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    try {
      const { id } = await saveRecipeToApi(recipe);
      setSavedRecipeId(id);
      toast({
        title: "Recipe saved",
        description: "Your recipe is now stored in Weaviate.",
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "We couldn't save your recipe. Please try again.";
      setSaveError(message);
      toast({
        title: "Save failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  }, [isSaving, recipe, savedRecipeId, toast]);

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
          onModeChange={handleModeChange}
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

        {mode === "search" && searchError && !isLoading && (
          <Alert variant="destructive" className="mt-12">
            <AlertTitle>Unable to search recipes</AlertTitle>
            <AlertDescription>{searchError}</AlertDescription>
          </Alert>
        )}

        {mode === "search" && showResults && !isLoading && (
          <div className="mt-12">
            <ResultsGrid recipes={searchResults} />
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
            <CreateCard
              recipe={recipe}
              onSave={handleSaveRecipe}
              isSaving={isSaving}
              isSaved={Boolean(savedRecipeId)}
              saveError={saveError}
              savedRecipeId={savedRecipeId}
            />
          </div>
        )}
      </div>
    </main>
  );
}
