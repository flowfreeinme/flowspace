# Rx Mastery SIG Codes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add SIG code learning to the existing Flowspace `/rx-mastery` route as a new Mastery Map area with quiz and flashcard practice.

**Architecture:** Extend the existing Rx Mastery feature in `src/rx-mastery` with a dedicated SIG code dataset, SIG progress buckets in the saved `ProgressState`, and SIG-specific quiz/flashcard branches. Keep medication logic and SIG logic separate where practical, while saving both to the same Flowspace `rx_mastery_progress.progress` JSON.

**Tech Stack:** React, TypeScript, Vite, Supabase JSON progress, Vitest, Flowspace CSS.

---

### Task 1: SIG Dataset And Progress Model

**Files:**
- Create: `src/rx-mastery/sigCodes.ts`
- Modify: `src/rx-mastery/types.ts`
- Modify: `src/rx-mastery/mastery.ts`
- Test: `src/rx-mastery/sigCodes.test.ts`
- Test: `src/rx-mastery/mastery.test.ts`

- [ ] Write failing tests for SIG dataset uniqueness and SIG progress creation/update.
- [ ] Add SIG code types and dataset from the user-provided training sheet.
- [ ] Extend `ProgressState` with `sigCodes` buckets.
- [ ] Add `ensureProgressForSigCodes`, `recordSigAnswer`, and `getSigCodeMastery`.
- [ ] Run `npm test -- src/rx-mastery/sigCodes.test.ts src/rx-mastery/mastery.test.ts`.

### Task 2: SIG Questions And UI Integration

**Files:**
- Modify: `src/rx-mastery/questions.ts`
- Modify: `src/rx-mastery/questions.test.ts`
- Modify: `src/rx-mastery/RxMasteryPage.tsx`
- Modify: `src/rx-mastery/RxQuizSession.tsx`
- Modify: `src/rx-mastery/RxFlashcardSession.tsx`

- [ ] Write failing tests for SIG code-to-meaning and meaning-to-code question generation.
- [ ] Add SIG question generation helpers.
- [ ] Add a `SIG Codes` Mastery Map tile.
- [ ] Route SIG quiz and cards into existing session components.
- [ ] Run `npm test -- src/rx-mastery`.

### Task 3: Styling, Verification, Deploy

**Files:**
- Modify: `src/index.css`

- [ ] Add any needed SIG-specific visual polish.
- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Browser verify `/rx-mastery` locally and in production after deploy.
- [ ] Deploy with `vercel deploy --prod`.
