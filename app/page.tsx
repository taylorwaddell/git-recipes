"use client"

import { useState } from "react"
import { SearchForm } from "@/components/search-form"
import { ResultsGrid } from "@/components/results-grid"
import { CreateCard } from "@/components/create-card"

export default function Home() {
  const [mode, setMode] = useState<"search" | "create">("search")
  const [isLoading, setIsLoading] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [showCreateCard, setShowCreateCard] = useState(false)
  const [submittedText, setSubmittedText] = useState("")

  const handleSubmit = (query: string) => {
    setIsLoading(true)
    setShowResults(false)
    setShowCreateCard(false)

    // Simulate API call
    setTimeout(() => {
      setIsLoading(false)
      if (mode === "search") {
        setShowResults(true)
      } else {
        setSubmittedText(query)
        setShowCreateCard(true)
      }
    }, 1500)
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-4xl font-bold tracking-tight text-foreground sm:text-5xl">Search & Create</h1>
          <p className="text-lg text-muted-foreground">Toggle between modes to search or create content</p>
        </div>

        <SearchForm mode={mode} onModeChange={setMode} onSubmit={handleSubmit} />

        {isLoading && (
          <div className="mt-12 flex items-center justify-center py-20">
            <div className="flex flex-col items-center gap-4">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-accent" />
              <p className="text-sm text-muted-foreground">{mode === "search" ? "Searching..." : "Creating..."}</p>
            </div>
          </div>
        )}

        {mode === "search" && showResults && !isLoading && (
          <div className="mt-12">
            <ResultsGrid />
          </div>
        )}

        {mode === "create" && showCreateCard && !isLoading && (
          <div className="mt-12">
            <CreateCard submittedText={submittedText} />
          </div>
        )}
      </div>
    </main>
  )
}
