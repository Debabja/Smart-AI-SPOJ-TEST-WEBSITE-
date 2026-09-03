# STANDING RULE: Prevent Regressions of Previously-Fixed Bugs

## Core Mandates

1. **Pre-Edit Audit (Before Modifying Any File)**:
   - Check whether the file(s) being touched were part of any previous bug fix (BUG-01 through BUG-33+), especially high-touch shared files:
     - `client/src/hooks/useProctoring.js` (Webcam/screen capture proof, violation throttling, delayed capture, keyboard lock debounce, absence tracking)
     - `client/src/candidate/pages/CandidateTestScreen.jsx` & `CandidateAITestScreen.jsx` (Fullscreen lock, copy-paste gating, proctoring hooks, submit flow, split-panel layouts)
     - `client/src/admin/pages/AdminLiveDashboard.jsx` (Seat map tiles, color statuses, tentative timer, late join, malpractice alerts)
     - Shared badge/status components (`TestStatusBadge.jsx`, etc.)
   - Explicitly note in the response/plan what nearby previously-fixed functionality is being checked and preserved.

2. **Post-Edit Regression Self-Check & Full Git Diff**:
   - Run a thorough `git diff` on every modified file to confirm:
     - No unintended changes or deletions to neighboring functions/hooks.
     - No duplicate JSX blocks (the cause of BUG-14).
     - No dropped imports or reverted logic.
   - Confirm not only "does the new change work" but "does everything that worked before still work."

3. **Single Source of Truth (No Blind Duplication)**:
   - Shared/reused components must be edited in their shared definition, never duplicated or copy-pasted across screens.

4. **Regression Investigations**:
   - If a reported bug was previously fixed, treat it strictly as a REGRESSION investigation:
     - First step: inspect `git log` and `git diff` to determine *when* and *why* the previous fix was broken/undone.
     - Fix the regression at the root cause, rather than blindly re-implementing it.

5. **Explicit Clarification**:
   - If there is any uncertainty about whether a change might impact previously-fixed behavior, state the concern clearly and confirm before proceeding.
