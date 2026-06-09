# Rx Mastery Missed Questions Review Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a post-quiz Round Summary that lists missed questions and lets users retry only missed items.

**Architecture:** Keep the feature inside `RxQuizSession` so quiz mode owns its own round state. Add a small pure review helper module for missed-item formatting and summary state, then wire that state into the existing medication and SIG question branches.

**Tech Stack:** React, TypeScript, Vitest, Vite, Flowspace CSS, Vercel deployment.

---

### Task 1: Review State Helpers

**Files:**
- Create: `src/rx-mastery/quizReview.ts`
- Test: `src/rx-mastery/quizReview.test.ts`

- [ ] Write failing tests for creating missed review items, perfect summaries, and review-needed summaries.
- [ ] Add `MissedQuestionReview` and `RoundReviewSummary` helper types.
- [ ] Add `createMissedQuestionReview` to store prompt, selected answer, correct answer, explanation, and replay metadata.
- [ ] Add `createRoundReviewSummary` to expose score, total, missed count, perfect status, and review availability.
- [ ] Run `npm test -- src/rx-mastery/quizReview.test.ts`.

### Task 2: Quiz Session Summary And Retry Flow

**Files:**
- Modify: `src/rx-mastery/RxQuizSession.tsx`
- Modify: `src/index.css`

- [ ] Add local state for missed items, completed mode, and review mode.
- [ ] Capture missed medication and SIG questions when the user selects the wrong answer.
- [ ] Replace final-question `Finish round` with a Round Summary screen.
- [ ] Add `Review Missed` to start a retry round using only missed questions.
- [ ] Keep retry answers recorded as normal quiz attempts.
- [ ] Add compact summary/review styling matching the existing Rx Mastery interface.
- [ ] Run `npm test -- src/rx-mastery`.

### Task 3: Verification, Commit, Deploy

**Files:**
- No new files beyond Task 1 and Task 2.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Browser verify guest quiz summary, missed review retry, and perfect-round behavior locally.
- [ ] Commit implementation with `git commit -m "feat: add rx mastery missed review"`.
- [ ] Deploy with `vercel deploy --prod`.
- [ ] Browser verify production `/rx-mastery`.
- [ ] Push `main` to GitHub after production verification.
