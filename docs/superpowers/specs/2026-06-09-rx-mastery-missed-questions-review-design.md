# Rx Mastery Missed Questions Review Design

## Goal

Add a post-quiz review step so pharmacy techs can see what they missed and retry only those questions before returning to the Mastery Map.

## Approved Behavior

After a 10-question quiz, the user lands on a Round Summary instead of exiting immediately.

The summary shows:
- Total score, formatted as correct answers out of 10.
- Every missed question.
- The answer the user selected.
- The correct answer.
- A short explanation using the same medication or SIG-code context already shown in quiz feedback.

If the user missed one or more questions, the summary shows:
- `Review Missed`: starts a focused retry round using only the missed questions.
- `Finish Round`: returns to the Mastery Map.

If the user missed nothing, the summary shows:
- A perfect-round message.
- `Finish Round`.

## Progress Rules

The original missed answer still counts as a quiz miss. A retry answer counts as a new quiz attempt, so getting a retry correct can improve confidence normally.

## Scope

This feature applies to quiz mode only, including:
- Brand to generic.
- Generic to brand.
- Indication.
- Control title.
- SIG code to meaning.
- SIG meaning to code.
- Mixed Review questions.

Flashcards do not get a missed-question summary in this pass.

## UI Notes

The review should stay inside the existing quiz session panel. The visual treatment should match the current Rx Mastery style: compact, professional, and easy to scan. Missed items should be visible as rows or cards with the prompt, selected answer, correct answer, and explanation.

## Testing Notes

Tests should cover:
- Missed-answer capture for medication quiz questions.
- Missed-answer capture for SIG code questions.
- Round summary availability after the final question.
- Review Missed starting a retry round with only missed questions.
- Perfect rounds showing no Review Missed action.
