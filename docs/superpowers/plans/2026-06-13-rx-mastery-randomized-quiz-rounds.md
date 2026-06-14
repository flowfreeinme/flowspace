# Rx Mastery Randomized Quiz Rounds Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Randomize quiz question selection so users do not see the same first 10 questions every new round.

**Architecture:** Add a pure `quizRound` helper that creates a fixed randomized deck for a quiz session. `RxQuizSession` consumes that deck with `useState` so it is created once on mount and is not reshuffled during answer rendering.

**Tech Stack:** React, TypeScript, Vitest, Vite, Flowspace CSS, Vercel deployment.

---

### Task 1: Random Round Deck Helper

**Files:**
- Create: `src/rx-mastery/quizRound.ts`
- Test: `src/rx-mastery/quizRound.test.ts`

- [ ] Write failing tests for randomized medication, SIG, and mixed-review round decks.
- [ ] Add a seeded-testable shuffle helper that accepts an optional random function.
- [ ] Add `createQuizRoundDeck` returning `MissedQuestionReplay[]`.
- [ ] Cap deck length at 10 or available item count.
- [ ] Run `npm test -- src/rx-mastery/quizRound.test.ts`.

### Task 2: Quiz Session Integration

**Files:**
- Modify: `src/rx-mastery/RxQuizSession.tsx`

- [ ] Initialize a quiz deck once when `RxQuizSession` mounts.
- [ ] Use the current deck item to build the active medication or SIG question.
- [ ] Keep missed-review replay behavior unchanged.
- [ ] Run `npm test -- src/rx-mastery`.

### Task 3: Verification And Release

**Files:**
- No additional files.

- [ ] Run `npm test`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Browser verify two new quiz rounds start with different medication prompts.
- [ ] Browser verify SIG quiz still works.
- [ ] Commit implementation with `git commit -m "feat: randomize rx mastery quiz rounds"`.
- [ ] Deploy with `vercel deploy --prod`.
- [ ] Browser verify production `/rx-mastery`.
- [ ] Push `main` to GitHub.
