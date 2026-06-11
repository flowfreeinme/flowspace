# Rx Mastery UI Improvements — Design Spec

**Date:** 2026-06-10  
**Scope:** Visual polish across all four Rx Mastery screens  
**Approach:** Targeted upgrades (CSS + focused TSX changes per screen)  
**Tone:** Warm & Approachable — amber/orange accents on off-white base, dark green structural elements retained

---

## 1. Design Direction

Keep the existing dark green (`#18332d`) / teal-blue (`#2a6f97`) structural palette. Layer in warm amber (`#d4813a` / `#e8a245`) as the primary accent color — replacing the blue eyebrow text, progress elements, and CTA buttons. The result is a friendlier, lower-stress feel appropriate for a daily learning tool.

**Color tokens (additions/replacements):**
- Amber primary: `#d4813a`
- Amber light: `#e8a245`
- Amber background: `#fde8cc`
- Amber muted: `#fdf6eb`
- Warm border: `#e8dcc8`
- Warm off-white: `#fffcf5` (replacing `#fffefa` throughout rx-mastery)
- Existing dark green (`#18332d`) and correct/incorrect greens/reds remain unchanged

---

## 2. Quiz Session (`RxQuizSession.tsx`)

### 2a. Progress bar
- Add a thin (5px) amber gradient progress bar as the **first child** of `.rx-session-panel`, before the topbar, spanning full width
- Fill = `(index / activeRoundTotal) * 100%`
- Gradient: `linear-gradient(90deg, #d4813a, #e8a245)` on a `#f0e8d8` track
- Rounded right edge only (`border-radius: 0 3px 3px 0`), left edge flush to panel edge

### 2b. Score pill
- Replace the `<strong>{score} correct</strong>` in the topbar with a styled amber pill: `{score} ✓`
- CSS: `background: #d4813a; color: #fff; border-radius: 99px; padding: 3px 10px; font-size: 11px; font-weight: 900`

### 2c. Eyebrow accent
- Change `.rx-eyebrow` color from `#2a6f97` to `#d4813a` within rx-mastery context (scoped to `.rx-page` so it doesn't affect the rest of Flowspace)

### 2d. Choice button hover
- Change `.rx-choice-button:hover` border-color from `#2a6f97` to `#d4813a`
- Correct choice: unchanged (`#2f8f5b` green border, `#e6f4ec` background)
- Missed choice: unchanged (`#b75c36` red border, `#ffe9df` background)

### 2e. Feedback card
- No structural changes — keep existing layout
- Swap background from `#eef5f7` to `#fdf6eb` (warm tint) for the neutral state
- Correct feedback: keep `#e6f4ec` green; incorrect: keep `#ffe9df` red

### 2f. Next/primary button
- Change `.rx-primary-button` background from `#2a6f97` to `#d4813a`

---

## 3. Home Screen — Mastery Tiles (`RxMasteryPage.tsx` + CSS)

### 3a. Custom progress bars (replace native `<meter>`)
- Remove `<meter>` and `<small>{tile.mastery}% mastery</small>` from each tile
- Replace with:
  ```tsx
  <div className="rx-tile-bar-track">
    <div className="rx-tile-bar-fill" style={{ width: `${tile.mastery}%` }} data-level={masteryLevel(tile.mastery)} />
  </div>
  <div className="rx-tile-bar-meta">
    <span className="rx-tile-pct">{tile.mastery}%</span>
    <span className="rx-tile-level" data-level={masteryLevel(tile.mastery)}>{masteryLabel(tile.mastery)}</span>
  </div>
  ```
- Define both as module-level functions in `RxMasteryPage.tsx`:
  - `masteryLevel(pct: number)` returns: `"novice"` (0–24), `"learning"` (25–49), `"proficient"` (50–74), `"strong"` (75–89), `"mastered"` (90–100)
  - `masteryLabel(pct: number)` returns the capitalized string ("Novice", "Learning", etc.)

### 3b. Bar styling
- Track: `height: 6px; background: #f0e8d8; border-radius: 3px`
- Fill gradients by level:
  - novice: `#d4c8b0` (flat, muted)
  - learning: `linear-gradient(90deg, #d4813a, #e8a245)`
  - proficient: `linear-gradient(90deg, #e8a245, #c8b830)`
  - strong: `linear-gradient(90deg, #c8b830, #4ea86a)`
  - mastered: `#2f8f5b` (solid green)

### 3c. Level badge styling
- Small pill, right-aligned next to percentage
- novice: `background: #f0ebe0; color: #8a7860`
- learning: `background: #fde8cc; color: #c4641a`
- proficient: `background: #fef0b0; color: #8a6a00`
- strong: `background: #d8f0e4; color: #1a6644`
- mastered: `background: #c8ecd8; color: #0f4a28`

### 3d. Tile icon background
- Change `.rx-tile-icon` background from `#dcebf0` to `#fde8cc`, color from `#1d5d7e` to `#c4641a`

### 3e. Hero stat block
- No structural changes — the dark green block is strong as-is

---

## 4. Round Summary (`RxQuizSession.tsx` — summary screen)

### 4a. Score hero block
Replace the current `rx-review-summary-hero` div with a two-column layout:
- Left: SVG ring chart (64×64px)
  - Background circle: `rgba(255,255,255,0.15)` stroke on dark green
  - Progress arc: amber `#e8a245`, stroke-dashoffset calculated from `(1 - score/total) * 163.4`
  - Center label: score number only (large, white)
- Right: eyebrow ("Round complete" or "Missed review summary"), score fraction (`{score} / {total} correct`), subtext (missed count or "Perfect round!")
- Container: dark green background (`#18332d`), white text, `border-radius: 12px`, `padding: 16px`

### 4b. Missed question rows
Replace the existing `<dl>` structure with color-coded answer chips:
```tsx
<div className="rx-missed-answers">
  <div className="rx-answer-chip rx-answer-wrong">
    <span className="rx-chip-label">Your answer</span>
    <span className="rx-chip-value">{missed.selectedAnswer}</span>
  </div>
  <div className="rx-answer-chip rx-answer-right">
    <span className="rx-chip-label">Correct</span>
    <span className="rx-chip-value">{missed.correctAnswer}</span>
  </div>
</div>
```
- Wrong chip: `background: #ffe9df; color: #8a3010`
- Correct chip: `background: #e6f4ec; color: #1a5c38`
- Side-by-side 2-column grid

### 4c. Review Missed button
- Show missed count in label: `Review Missed ({summary.missedCount})`
- Button style: amber primary (matches updated `.rx-primary-button`)

---

## 5. Flashcard Session (`RxFlashcardSession.tsx`)

### 5a. 3D flip animation
Replace the current `className={rx-flashcard ${flipped ? 'is-flipped' : ''}}` flat toggle with a proper CSS 3D flip:
```tsx
<div className="rx-card-scene">
  <div className={`rx-card-3d ${flipped ? 'is-flipped' : ''}`} onClick={() => !flipped && setFlipped(true)}>
    <div className="rx-card-face rx-card-front">
      {/* prompt content */}
    </div>
    <div className="rx-card-face rx-card-back">
      {/* answer content */}
    </div>
  </div>
</div>
```

### 5b. Card face styling
- Front: warm off-white (`#fffcf5`), amber eyebrow, dark term text, hint text "Tap to reveal"
- Back: dark green background (`#18332d`), amber label, white answer text
- Both faces: `backface-visibility: hidden`, `border-radius: 12px`

### 5c. Grade buttons
- "Got it": green tones (`background: #e6f4ec; border: 1.5px solid #a8d8bc; color: #1a5c38`)
- "Not yet": red tones (`background: #ffe9df; border: 1.5px solid #f0b89a; color: #8a3010`)
- Grade buttons only shown after flip (when `flipped === true`)

### 5d. Card counter
- Add `<p className="rx-card-counter">Card {index + 1}</p>` below grade buttons (flashcards loop indefinitely, so no "of N" total)
- Style: small, muted, centered

---

## 6. Shared CSS Changes

All changes scoped to `.rx-page` to avoid affecting other Flowspace routes.

- `.rx-eyebrow` color: `#d4813a` (was `#2a6f97`)
- `.rx-primary-button` background: `#d4813a` (was `#2a6f97`)  
- `.rx-tile-action` background: `#d4813a` (was `#2a6f97`)
- `.rx-choice-button:hover` border-color: `#d4813a` (was `#2a6f97`)
- `.rx-feedback` background: `#fdf6eb` (warm neutral state, was `#eef5f7`)
- New classes: `rx-tile-bar-track`, `rx-tile-bar-fill`, `rx-tile-bar-meta`, `rx-tile-pct`, `rx-tile-level`, `rx-card-scene`, `rx-card-3d`, `rx-card-face`, `rx-card-front`, `rx-card-back`, `rx-answer-chip`, `rx-answer-wrong`, `rx-answer-right`, `rx-card-counter`

---

## 7. Out of Scope

- No changes to domain logic, scoring, or progress persistence
- No changes to the Knowledge Library or ReviewQueue components
- No changes to the Access Gate or auth flow
- No animation library dependency — all motion via CSS transitions only

---

## 8. Testing

- All existing tests must continue to pass (no logic changes)
- Manual verification: quiz round start to finish, summary screen, missed review loop, flashcard flip and grading
- Check responsive behavior at 720px and 560px breakpoints
