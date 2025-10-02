# Background and Motivation

- User goal: Allow submission of a recipe URL, scrape the remote page, extract structured recipe data (title, ingredients, instructions, notes, nutrition facts), convert it into markdown, and surface it within the `CreateCard` view.
- Broader context: Saved recipes should be vectorized and persisted via a Weaviate endpoint to improve search relevance in "search" mode.
- Current UI: Toggle between search and create modes with mock behavior; create workflow accepts free text and displays placeholder content; search results rely on static mock data.
- MVP scope: Must scrape title + ingredients, persist recipes to Weaviate, and expose query-based search over stored recipes.

# Key Challenges and Analysis

- Recipe scraping: Need a robust server-side route or API handler that fetches external pages, handles CORS, follows redirects, and parses microdata / schema.org Recipe structures with fallbacks for less-structured pages. MVP requires at least title + ingredients; stretch goals include instructions and other metadata.
- Data extraction & normalization: Map scraped data into a consistent schema (title, ingredients array, captured sourceUrl) while handling missing fields and ensuring sanitization to avoid XSS. Preserve extensibility for instructions/notes later.
- Markdown/formatting: For MVP we can render scraped data in simple components; markdown conversion becomes optional once instructions are added.
- UI integration: Replace placeholder create workflow with async call to new API, manage loading/error states, and surface scraped data with save controls.
- Save UX: Persisting recipes now requires client-side state management for optimistic updates, duplicate submissions, and user feedback (toast/alert) when writes succeed or fail.
- Persistence & vectorization: Define backend call to Weaviate with proper authentication, schema, and payload including vectorization fields, ensuring saved recipes store at least title/ingredients and optional metadata.
- Search experience: Replace mock `ResultsGrid` with data fetched from Weaviate query endpoint, support search input, empty states, and fallback messaging.
- Observability & logging: Integrate Opik to capture AI/Weaviate interactions, manage flush lifecycle, and parameterize config via env vars.
- Testing & reliability: Need unit/integration tests for scraper, save/search endpoints, and client interactions; consider rate limiting, error handling, logging.

# High-level Task Breakdown

1. **Define MVP data contracts** – Create shared TypeScript interfaces for scraped recipe (title, ingredients, sourceUrl), save payload, and search result. _Success: Types referenced in API routes and UI compile; tests cover basic shape._
2. **Implement minimal scraping service** – Server-side utility to fetch recipe HTML and extract title + ingredients from schema.org or simple selectors. _Success: Given sample recipe URLs, service returns title/ingredient array or descriptive error; unit tests cover happy/edge cases._
3. **Create recipe scrape API endpoint** – Next.js route that accepts URL, invokes scraping service, and returns normalized recipe data. _Success: Endpoint returns title+ingredients JSON with reliable errors._
4. **Update create flow UI** – Modify form to accept URL, call scrape endpoint, and display scraped data in `CreateCard` with save CTA. _Success: Submitting URL shows spinner, results display title + ingredients and Save button triggers backend call._
5. **Implement Weaviate save pathway** – API route that receives recipe payload, writes to Weaviate collection (vectorization), and returns status/ID. _Success: Save button POST results in stored object; errors surface in UI toast._
6. **Replace search grid with Weaviate query** – Search mode should call backend endpoint that proxies a text query to Weaviate and returns matching recipes. _Success: Query input renders cards from live data; handles empty states/errors._
7. **Integrate Opik telemetry (MVP level)** – Instrument Weaviate client interactions with Opik to capture logs for save/search operations. _Success: Opik receives traces for save/search endpoints; env vars documented._
8. **Testing & documentation** – Add targeted tests for scraper + endpoints, and README updates covering env vars (Weaviate + Opik) and MVP usage. \_Success: Tests run green; README explains MVP setup.

# Project Status Board

- [x] Define recipe data contracts
- [x] Implement scraping service
- [x] Create recipe generation API endpoint
- [x] Wire create mode UI to API + markdown renderer
- [ ] Build save + Weaviate persistence flow (MVP)
  - [x] Save API route + Weaviate client helper implemented
  - [ ] Wire create flow save button to persistence
- [ ] Integrate Opik telemetry for save/search
- [ ] Replace mock search with real vector search
- [ ] Add tests & documentation updates

# Current Status / Progress Tracking

- Recipe type definitions created in `lib/types/recipe.ts`.
- Recipe scraping implemented with JSON-LD + DOM fallbacks and unit tests (`lib/recipes/scraper.test.ts`).
- `/api/recipes/scrape` POST returns normalized title/ingredients data with rich error responses.
- Cheerio & Vitest dependencies added; `pnpm test` runs scraper test suite.
- Weaviate config/client scaffolding and Opik tracing helper in place for upcoming persistence work.
- Create flow now calls `/api/recipes/scrape`, displays loading/error states, and renders recipe title + ingredients in `CreateCard`.
- Implemented Weaviate save API route and HTTP client helper with tests; ready to wire UI save action next.

## Immediate Next Steps

1. **Wire create flow save button to persistence**
  - Add save handler in `app/page.tsx` that posts the scraped recipe to `/api/recipes/save`.
  - Forward `onSave`, `isSaving`, and success/error messaging into `CreateCard`; surface results via toast and/or inline alert.
  - Preserve the scraped recipe in state after save and guard against duplicate submissions (disable button, show spinner text).
  - Write a lightweight component test (or RTL/Vitest hook test) if feasible to ensure the save handler handles success/error paths.
2. **Prepare search integration plan**
  - Outline the Weaviate query API shape and how it maps to `RecipeSearchResult`.
  - Identify UI updates required in `SearchForm`/`ResultsGrid` to consume real results (loading states, empty messaging).
  - Note telemetry touchpoints to fold in when wiring the search endpoint.

# Executor's Feedback or Assistance Requests

- _(empty)_

# Lessons

- _(empty)_
