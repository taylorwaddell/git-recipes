"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { RecipeScrapeResult } from "@/lib/types/recipe";
import { Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CreateCardProps {
  recipe: RecipeScrapeResult;
  onSave?: () => Promise<void> | void;
  isSaving?: boolean;
}

export function CreateCard({
  recipe,
  onSave,
  isSaving = false,
}: CreateCardProps) {
  const { toast } = useToast();

  const handleSave = async () => {
    if (onSave) {
      await onSave();
      return;
    }

    toast({
      title: "Save coming soon",
      description: "We'll store recipes in Weaviate in the next milestone.",
    });
  };

  return (
    <Card className="mx-auto max-w-4xl">
      <CardHeader className="flex flex-col gap-2 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1 space-y-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Recipe preview
          </p>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {recipe.title}
          </h2>
          <Link
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            {recipe.sourceUrl}
          </Link>
        </div>
        <Button
          onClick={handleSave}
          size="sm"
          className="gap-2"
          disabled={isSaving}
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : "Save"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <h3 className="mb-2 text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Ingredients
          </h3>
          <ul className="list-disc space-y-2 pl-6 text-sm leading-relaxed text-foreground">
            {recipe.ingredients.map((ingredient, index) => (
              <li key={`${ingredient}-${index}`}>{ingredient}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
