# Background and Motivation

- User goal: Allow submission of a recipe URL, scrape the remote page, extract structured recipe data (title, ingredients), and save it to Weaviate for vector search.
- MVP scope: Must scrape title + ingredients, persist recipes to Weaviate, and expose query-based search over stored recipes.
- **CURRENT FOCUS**: Get the creation (scrape → save) flow working end-to-end in the UI.
- **Schema decision**: Use only `sourceUrl` field moving forward; legacy `source` field ignored (no historical data to migrate).

# Creation Flow Analysis

## Current Implementation Status

### What's Working ✅

1. **Scraping infrastructure**

   - `/api/recipes/scrape` endpoint implemented and tested (5 passing tests)
   - Cheerio-based parser with JSON-LD and DOM fallbacks
   - Returns `{ title, ingredients, sourceUrl }`
   - Proper error handling and validation

2. **Save infrastructure**

   - `lib/weaviate/client.ts` has `saveRecipe()` method
   - `/api/recipes/save` endpoint with validation (4 passing tests)
   - `saveRecipeToApi()` client helper (2 passing tests)
   - All unit tests passing (22/22 total)

3. **UI components**
   - `SearchForm` handles mode toggle and query submission
   - `CreateCard` displays scraped recipe with save button
   - State management in `app/page.tsx` for loading/error states
   - Toast notifications for user feedback

### Critical Missing Piece ❌

**The Weaviate client is missing the required `X-Weaviate-Cluster-Url` header!**

Evidence:

- Manual `curl` test succeeded when header was added: `-H "X-Weaviate-Cluster-Url: https://dybuzsdmrio22bqoii2jsa.c0.us-west3.gcp.weaviate.cloud"`
- Earlier `curl` without header failed with: `"no cluster URL found in request header: X-Weaviate-Cluster-Url"`
- Current `lib/weaviate/client.ts` only sends `Content-Type` and `Authorization` headers
- This means **all save operations through the app will fail** even though tests pass (tests mock the client)

### Data Flow Diagnosis

**Expected create flow:**

1. User enters URL in create mode → `handleSubmit()` called
2. Frontend POSTs to `/api/recipes/scrape` → returns recipe data
3. User clicks "Save" → `handleSaveRecipe()` called
4. Frontend calls `saveRecipeToApi()` → POSTs to `/api/recipes/save`
5. API route calls `client.saveRecipe()` → HTTP POST to Weaviate `/v1/objects`
6. Weaviate returns object ID → UI shows success

**Current failure point:**

- Step 5 fails because `saveRecipe()` doesn't include `X-Weaviate-Cluster-Url` header
- Weaviate rejects request with vectorization error
- User sees generic "Failed to save recipe" error

### Additional Observations

**Schema alignment:** ✅

- Weaviate schema includes `sourceUrl` property (verified via manual test)
- Code sends `sourceUrl` in payload
- No issues with property names

**Search flow:** ✅

- Search backend complete and tested
- GraphQL query includes `sourceUrl` in results
- UI wired to display search results
- Not the current focus but should work once data exists

## Root Cause & Solution

**Problem:** HTTP client missing required header for Weaviate Cloud vectorization.

**Solution:** Add `X-Weaviate-Cluster-Url` header to all Weaviate HTTP requests in `lib/weaviate/client.ts`.

**Impact:**

- Fixes save operations (creation flow)
- Also fixes search operations (both use same base client)
- No changes needed to API routes, tests, or UI
- Single file change with immediate unblocking effect

# Task Plan: Fix Creation Flow

## Immediate Priority Tasks

### Task 1: Add Missing Cluster URL Header (CRITICAL - Blocks Everything)

**Goal:** Fix Weaviate client to include required `X-Weaviate-Cluster-Url` header.

**Changes needed:**

1. Update `createHttpWeaviateClient()` in `lib/weaviate/client.ts`:
   - Add `X-Weaviate-Cluster-Url: ${baseUrl}` header to `saveRecipe()` fetch call
   - Add same header to `searchRecipes()` fetch call (for consistency)
2. No test changes needed (tests mock the client and pass)
3. No API route or UI changes needed

**Success criteria:**

- Save operation completes successfully through UI
- Weaviate returns object ID (not vectorization error)
- Manual test: create mode → enter recipe URL → scrape → save → see success message
- Saved recipe appears in Weaviate (can verify via search or direct query)

**Estimated time:** 5 minutes

### Task 2: End-to-End Verification (VALIDATION)

**Goal:** Confirm entire create flow works in the running app.

**Steps:**

1. Start dev server: `pnpm dev`
2. Navigate to app in browser
3. Switch to "Create" mode
4. Enter a real recipe URL (e.g., from AllRecipes, Serious Eats, NYT Cooking)
5. Verify scrape returns title + ingredients
6. Click "Save Recipe" button
7. Verify success toast appears
8. Verify "Already saved" state shows (button disabled, success alert visible)
9. Query Weaviate directly or use search mode to confirm recipe was stored

**Success criteria:**

- No errors in browser console
- Success feedback visible to user
- Recipe actually saved to Weaviate (verified via search or API)
- `sourceUrl` field populated in saved object

**Estimated time:** 10 minutes

### Task 3: Error Scenario Testing (HARDENING)

**Goal:** Ensure graceful handling of common failure cases.

**Test cases:**

1. **Invalid URL in create mode**

   - Expected: Clear error message, no crash
   - Current: Should work (scraper has error handling)

2. **Network failure during save**

   - Expected: "Failed to save recipe" error, retry possible
   - Current: Should work (save route has try/catch)

3. **Duplicate save attempt**

   - Expected: "Recipe already saved" toast, no redundant API call
   - Current: Should work (duplicate guards in place)

4. **Weaviate auth failure**
   - Expected: 502 error with helpful message
   - Current: Should work (client extracts Weaviate errors)

**Success criteria:**

- All error cases show user-friendly messages
- No unhandled exceptions or crashes
- Users understand what went wrong and can retry

**Estimated time:** 15 minutes

## Secondary Tasks (Nice-to-Have)

### Task 4: Integration Test for Save Flow

**Goal:** Automated test that hits real Weaviate instance.

**Approach:**

- Create `lib/weaviate/client.integration.test.ts`
- Test: save recipe → fetch by ID → verify properties match
- Clean up test objects after run
- Skip by default (use `pnpm test:integration` to run)

**Deferred because:** Unit tests already cover logic; manual verification sufficient for MVP.

### Task 5: Schema Verification Helper

**Goal:** Runtime check that Weaviate schema matches code expectations.

**Approach:**

- Fetch schema on first client init
- Assert `Recipe` class has `title`, `ingredients`, `sourceUrl` properties
- Log warnings if mismatches found

**Deferred because:** Schema manually verified; manual testing will surface issues immediately.

### Task 6: Documentation Updates

**Goal:** Document setup and usage for new developers.

**Content:**

- Required env vars (`WEAVIATE_URL`, `WEAVIATE_API_KEY`)
- How to run dev server
- How to use create mode (scrape + save)
- How to use search mode (query recipes)

**Deferred because:** Flow needs to work first; docs can follow once stable.

# Project Status Board

- [x] Define recipe data contracts
- [x] Implement scraping service (5 tests passing)
- [x] Create `/api/recipes/scrape` endpoint
- [x] Wire create mode UI to scraping API
- [x] Build save infrastructure (client + API route + helpers, 6 tests passing)
- [x] Build search infrastructure (client + API route + helpers, 6 tests passing)
- [x] Wire search UI to real results
- [x] Verify Weaviate schema includes `sourceUrl` property
- [ ] **FIX CRITICAL: Add X-Weaviate-Cluster-Url header to HTTP client** ← BLOCKING
- [ ] End-to-end verification of create flow
- [ ] Error scenario testing
- [ ] Integration tests (optional/deferred)
- [ ] Schema verification helper (optional/deferred)
- [ ] Documentation updates (after flow works)

# Current Status

**Blocking Issue Identified:**

- Weaviate HTTP client missing `X-Weaviate-Cluster-Url` header
- This causes all save/search operations to fail with vectorization error
- Manual `curl` test proved header is required for Weaviate Cloud
- Fix is straightforward: add one header to two fetch calls in `lib/weaviate/client.ts`

**Test Status:**

- ✅ 22/22 unit tests passing (tests mock client, so they don't catch this)
- ⚠️ Real HTTP calls will fail until header added

**Next Action:**

- Add cluster URL header to client
- Verify create flow works end-to-end in browser
- Test error scenarios

## Immediate Next Steps

1. ✅ Manual save verification via `curl` (completed - proved `sourceUrl` works)
2. ✅ Add `X-Weaviate-Cluster-Url` header to client (completed - added to both save and search operations)
3. ✅ Verify tests still pass (22/22 passing)
4. ✅ Start dev server (running on http://localhost:3000)
5. **→ Manual testing of create flow** (ready for user to test in browser)
6. Test error scenarios
7. Consider integration tests and docs (deferred until after validation)

**Executor Progress:**

- Added `X-Weaviate-Cluster-Url: baseUrl` header to both `saveRecipe()` and `searchRecipes()` fetch calls in `lib/weaviate/client.ts`
- All 22 tests still passing after changes
- Dev server started successfully on http://localhost:3000
- Ready for manual verification of create flow

# Executor's Feedback or Assistance Requests

**Planner to User:**

I've analyzed the Weaviate save functionality in detail and found a **critical bug**:

**The Problem:**

- Your TypeScript code uses `sourceUrl`
- Your Weaviate schema expects `source`
- Recipe URLs are being silently dropped when you save

**The Evidence:**

- Schema check shows Weaviate has properties: `title`, `ingredients`, `source`
- Your code sends: `title`, `ingredients`, `sourceUrl`
- Database query shows 0 existing objects (safe to change either way)

**Two Fix Options:**

**Option A** - Update Weaviate schema (RECOMMENDED):

- Change property name from `source` → `sourceUrl` in Weaviate
- Pro: More descriptive, matches TypeScript conventions
- Pro: Code stays clean
- Con: Requires schema update via Weaviate console or API
- Time estimate: 15 minutes

**Option B** - Update code:

- Change `sourceUrl` → `source` in all TypeScript files
- Pro: No schema changes
- Pro: Faster
- Con: Less clear property name
- Con: Changes 8+ files (types, client, tests, UI components)
- Time estimate: 30 minutes

**My recommendation**: Option A (update Weaviate schema to use `sourceUrl`)

**What I need from you:**

1. Which option do you prefer? (A or B)
2. If Option A: Do you want me to update the schema via API, or will you do it manually?
3. After fix: Should I prioritize integration tests or move to other features?

# Lessons Learned

- Use `jsdom@22` with the current Node runtime to avoid `DONT_CONTEXTIFY` errors in Vitest when running browser-style tests.
- Inline alerts within `CreateCard` provide clearer user feedback than toast-only notifications when showing save success/errors.
- Guard duplicate submissions at the handler level (checking `isSaving`/`isSaved` flags) to prevent race conditions and redundant API calls.
- **Unit tests that mock external services can't catch HTTP header issues** - need integration tests or manual verification for real API interactions.
- **Weaviate Cloud requires `X-Weaviate-Cluster-Url` header for vectorization** - not documented clearly, discovered via trial and error with `curl`.
- **Always test critical paths manually before considering them "done"** - all tests passed but the app couldn't actually save recipes due to missing header.

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
- [x] Build save + Weaviate persistence flow (MVP)
  - [x] Save API route + Weaviate client helper implemented
  - [x] Wire create flow save button to persistence
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
- WEAVIATE_URL and WEAVIATE_API_KEY configured in local environment for live persistence testing.
- Create flow now persists recipes via `/api/recipes/save`, showing toast + inline feedback and preventing duplicate submissions.
- Added `saveRecipeToApi` helper with unit tests (jsdom environment) and installed `jsdom@22` for frontend-oriented Vitest suites.
- Save persistence MVP complete: recipes write to Weaviate with success/error UI and duplicate-submission guarding.

## Immediate Next Steps

1. **Implement Weaviate search backend and UI integration**

   - Design search API contract (`/api/recipes/search`): accepts query string, returns array of `RecipeSearchResult`.
   - Extend Weaviate client to support `searchRecipes(query: string)` method using hybrid/vector search.
   - Wrap search calls with `trackExternalOperation` for Opik instrumentation.
   - Create client-side `searchRecipesFromApi` helper with unit tests (jsdom environment).
   - Update `app/page.tsx` to call search API when in search mode; manage loading/error/empty states.
   - Replace mock data in `ResultsGrid` with real search results; pass recipes array and handle empty/error UI.
   - Add Vitest coverage for search endpoint and client helper (success, error, empty result scenarios).

2. **Testing, documentation, and final polish**
   - Run full test suite and verify all paths (scrape, save, search) work end-to-end.
   - Update README with setup instructions: required env vars (`WEAVIATE_URL`, `WEAVIATE_API_KEY`), installation steps, and usage examples.
   - Document Opik integration points and note that telemetry is instrumented but SDK wiring is pending.
   - Consider adding basic error boundary and improving loading/empty state messaging across UI.

# Executor's Feedback or Assistance Requests

**Planner Review (latest):**

- Save flow is fully wired and tested; recipes persist to Weaviate with inline feedback and duplicate-submission guards.
- All existing tests (scraper, save API, save client helper) pass cleanly with `jsdom@22`.
- Next milestone is search integration: need to add Weaviate search method, API route, client helper, UI wiring, and comprehensive tests.
- Once search is functional, wrap up with README documentation covering env setup and MVP usage patterns.

**Executor (current):**

- Starting search integration implementation: extending Weaviate client with searchRecipes method, then building API route and frontend wiring.

# Lessons

- Use `jsdom@22` with the current Node runtime to avoid `DONT_CONTEXTIFY` errors in Vitest when running browser-style tests.
- Inline alerts within `CreateCard` provide clearer user feedback than toast-only notifications when showing save success/errors.
- Guard duplicate submissions at the handler level (checking `isSaving`/`isSaved` flags) to prevent race conditions and redundant API calls.
