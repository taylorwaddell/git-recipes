"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface SearchFormProps {
  mode: "search" | "create"
  onModeChange: (mode: "search" | "create") => void
  onSubmit: (query: string) => void
}

export function SearchForm({ mode, onModeChange, onSubmit }: SearchFormProps) {
  const [query, setQuery] = useState("")
  const { toast } = useToast()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!query.trim()) return

    onSubmit(query)
    setQuery("")
  }

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
          placeholder={mode === "search" ? "Search for content..." : "Enter content to create..."}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-12 text-base"
        />
        <Button type="submit" size="lg" className="px-8">
          Submit
        </Button>
      </form>
    </div>
  )
}
