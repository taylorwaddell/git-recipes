"use client";

import { Plus, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type React from "react";
import { useState } from "react";

interface SearchFormProps {
  mode: "search" | "create";
  onModeChange: (mode: "search" | "create") => void;
  onSubmit: (query: string) => void;
}

export function SearchForm({ mode, onModeChange, onSubmit }: SearchFormProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmed = query.trim();
    if (!trimmed) return;

    onSubmit(trimmed);
    setQuery("");
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-center gap-2">
        <Button
          variant={mode === "search" ? "default" : "outline"}
          onClick={() => onModeChange("search")}
          className="gap-2"
        >
          <Search className="h-4 w-4" />
          Search
        </Button>
        <Button
          variant={mode === "create" ? "default" : "outline"}
          onClick={() => onModeChange("create")}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Create
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-3">
        <Input
          type="text"
          placeholder={
            mode === "search"
              ? "Search for recipes..."
              : "Paste a recipe URL..."
          }
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 text-base"
        />
        <Button type="submit" size="lg" className="px-8">
          {mode === "search" ? "Search" : "Create"}
        </Button>
      </form>
    </div>
  );
}
