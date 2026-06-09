# Rx Mastery Flowspace Easter Egg Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Rx Mastery to Flowspace as a hidden public `/rx-mastery` route with a login/create-account option for saved progress and a guest option with unsaved in-memory progress.

**Architecture:** Keep the game as a self-contained Flowspace feature under `src/rx-mastery`. The top-level `App.tsx` detects `/rx-mastery` before the normal landing/workspace gate, skips workspace initialization for that route, and renders the game route. Guest progress stays in component memory; signed-in progress loads/saves through a dedicated Supabase `rx_mastery_progress` table keyed by `auth.users.id`.

**Tech Stack:** React, TypeScript, Vite, Supabase Auth, Supabase RLS, Vitest, Flowspace CSS/Tailwind conventions.

---

### Task 1: Add Rx Mastery Domain Files

**Files:**
- Create: `src/rx-mastery/types.ts`
- Create: `src/rx-mastery/medications.ts`
- Create: `src/rx-mastery/mastery.ts`
- Create: `src/rx-mastery/questions.ts`
- Create: `src/rx-mastery/recommendations.ts`
- Test: `src/rx-mastery/medications.test.ts`
- Test: `src/rx-mastery/mastery.test.ts`
- Test: `src/rx-mastery/questions.test.ts`
- Test: `src/rx-mastery/recommendations.test.ts`

- [ ] Add the Rx Mastery pure data/model files ported from the standalone project.
- [ ] Add focused tests for medication deck shape, mastery scoring, question generation, and recommendations.
- [ ] Run `npm test -- src/rx-mastery`.

### Task 2: Add Supabase Progress Persistence

**Files:**
- Create: `supabase/migrations/20260608000000_rx_mastery_progress.sql`
- Create: `src/rx-mastery/progressPersistence.ts`
- Test: `src/rx-mastery/progressPersistence.test.ts`

- [ ] Add a `rx_mastery_progress` table with `user_id` primary key, `progress jsonb`, timestamps, RLS enabled, and an own-user policy.
- [ ] Add `loadSavedProgress(userId)` and `saveSavedProgress(userId, progress)` helpers using Supabase.
- [ ] Ensure helper failures return `null` or a message instead of crashing the game.
- [ ] Run `npm test -- src/rx-mastery/progressPersistence.test.ts`.

### Task 3: Add Hidden Route And Auth/Gate Flow

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/stores/auth.ts`
- Create: `src/rx-mastery/RxMasteryPage.tsx`
- Create: `src/rx-mastery/RxAccessGate.tsx`
- Create: `src/rx-mastery/RxQuizSession.tsx`
- Create: `src/rx-mastery/RxFlashcardSession.tsx`

- [ ] Detect `/rx-mastery` in `App.tsx`.
- [ ] Always initialize auth, but skip workspace loading, sharing, invite, and workspace realtime effects on `/rx-mastery`.
- [ ] Before the normal unauthenticated landing gate, render `RxMasteryPage`.
- [ ] Update `signUp` redirect to use `window.location.href` so account confirmation can return to `/rx-mastery`.
- [ ] In `RxMasteryPage`, show the entry gate when not signed in and no guest choice has been made.
- [ ] Gate actions: login/create account renders the existing `AuthPage`; guest starts the game with unsaved in-memory progress.
- [ ] Signed-in play loads remote progress, saves after each answer, and shows a saved-progress status.
- [ ] Guest play never uses localStorage and shows a clear unsaved-progress status.

### Task 4: Add Styles And Verify

**Files:**
- Modify: `src/index.css`

- [ ] Add `rx-` prefixed styles for the full-screen game route.
- [ ] Run `npm test -- src/rx-mastery`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Browser-verify `http://127.0.0.1:5173/rx-mastery`: gate, guest flow, quiz, flashcards, mobile layout, and console errors.
