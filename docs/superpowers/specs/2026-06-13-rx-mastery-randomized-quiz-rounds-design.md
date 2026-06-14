# Rx Mastery Randomized Quiz Rounds Design

## Goal

Prevent quiz mode from showing the same first 10 questions every time by randomizing the question deck at the start of each round.

## Approved Behavior

Each new quiz round creates a randomized deck before the first question appears. The deck order stays fixed for the rest of that round so the question does not change while the user is answering.

The quiz should randomize:
- Brand/generic rounds.
- Indication rounds.
- Control title rounds.
- SIG code rounds.
- Mixed Review rounds.

Round length stays capped at 10 questions. If a source list has fewer than 10 items, the round uses the available items.

## Missed Review Behavior

`Review Missed` keeps using only the exact missed questions from the completed round. It should not reshuffle or introduce unrelated questions.

## Scope

This changes quiz mode only. Flashcards keep their existing order in this pass.

## Testing Notes

Tests should cover:
- Medication quiz rounds sample items in randomized order.
- SIG code rounds sample items in randomized order.
- Mixed Review assigns varied medication question types over a randomized medication deck.
- Rounds are capped at 10 items.
- A seeded random function can prove behavior deterministically.
