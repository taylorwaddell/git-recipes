import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import Link from "next/link";
import type { RecipeSearchResult } from "@/lib/types/recipe";

interface ResultsGridProps {
  recipes: RecipeSearchResult[];
}

export function ResultsGrid({ recipes }: ResultsGridProps) {
  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-muted-foreground">
          No recipes found
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Try a different search query
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {recipes.map((recipe) => (
        <Card
          key={recipe.id}
          className="overflow-hidden transition-all hover:shadow-lg"
        >
          <CardHeader className="pb-3">
            <CardTitle className="text-xl">{recipe.title}</CardTitle>
            {recipe.score !== undefined && (
              <p className="text-xs text-muted-foreground">
                Relevance: {(recipe.score * 100).toFixed(0)}%
              </p>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Ingredients
              </p>
              <ul className="list-disc space-y-1 pl-4 text-sm text-foreground">
                {recipe.ingredients.slice(0, 3).map((ingredient, idx) => (
                  <li key={`${recipe.id}-${idx}`}>{ingredient}</li>
                ))}
                {recipe.ingredients.length > 3 && (
                  <li className="text-muted-foreground">
                    +{recipe.ingredients.length - 3} more
                  </li>
                )}
              </ul>
            </div>
            <Link
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block text-xs text-muted-foreground underline-offset-4 hover:underline"
            >
              View original recipe
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
