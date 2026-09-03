# Walkthrough: BUG-30 Fix — Auto-End Lifecycle & Tentative Time Fallbacks

This update resolves **BUG-30 (Part A & Part B)** by implementing automatic lifecycle termination for concluded tests and fixing the "TENTATIVE TIME" badge fallback to distinguish between unstarted tests and completed sessions.

---

## 1. Problem Summary

1. **Part A (Indefinite LIVE Tests)**:
   - Previously, tests only transitioned from `LIVE` to `ENDED` when an admin manually clicked "End Test".
   - If all rooms expired/closed and all candidates finished or were disqualified, tests remained `LIVE` indefinitely across days (e.g. "Final test" remained `LIVE` for over 24 hours).
2. **Part B ("TENTATIVE TIME" Badge Fallback)**:
   - When no candidate was `IN_PROGRESS`, the dashboard fell back to showing `"Not started"` even when all candidates had already completed or been disqualified.

---

## 2. Changes Implemented

### Part A — Test Auto-End Lifecycle & Room Closure

- **`testLifecycleService.js` ([`testLifecycleService.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/services/testLifecycleService.js))**:
  - `performEndTest(testId, io, reason)`: Sets test status to `ENDED`, closes all active rooms, broadcasts `test:ended` and `room:updated` (`ROOMS_CLOSED`), and runs `evaluationService.runFinalEvaluationPass(testId)`.
  - `checkAndAutoEndTest(testId, io)`: Evaluates if a test has concluded:
    1. Zero rooms accepting new joins (all rooms `CLOSED` or `now > passwordValidUntil`).
    2. Zero candidates currently `IN_PROGRESS` (all joined candidates reached terminal states: `SUBMITTED`, `AUTO_SUBMITTED_TIME_UP`, `DISQUALIFIED`, or timer expired).
    3. Any unstarted joined candidates have exceeded their `startTestWindowMinutes` past room password expiry.
  - `checkAndAutoEndAllLiveTests(io)`: Sweeps all LIVE tests across the entire database.
  - `startLifecycleScheduler(io, 30000)`: Background daemon running every 30 seconds to clean up expired tests without requiring user interaction.
- **Opportunistic Checks**:
  - `GET /api/v1/tests` & `GET /api/v1/tests/:testId` in `testController.js`
  - `GET /api/v1/tests/:testId/live-candidates` in `roomController.js`
  - `POST /api/v1/submissions/submit-all` in `submissionController.js`
  - Candidate disqualification in `proctoringController.js`
- **Advisory Banner in `AdminTestDetail.jsx` ([`AdminTestDetail.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminTestDetail.jsx))**:
  - Prominent warning banner displayed if a test is `LIVE` but all rooms have expired, providing a 1-click `⏹ End Test Now` button.

### Part B — "TENTATIVE TIME" Distinct Fallbacks

- **`AdminLiveDashboard.jsx` ([`AdminLiveDashboard.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminLiveDashboard.jsx))**:
  - **Case 1: No Candidate Has Started Yet** (`candidatesInScope.length === 0` or no candidate has started): Displays `"Not started"` with tooltip `Tentative Time: No candidates have started yet`.
  - **Case 2: All Candidates Reached Terminal States** (`SUBMITTED`, `DISQUALIFIED`, or timer expired): Displays `"Session concluded"` with tooltip `Tentative Time: All candidates have finished or reached terminal states`.
  - **Case 3: In-Progress Candidates Active**: Displays the MAX remaining time among `IN_PROGRESS` candidates (BUG-21 preserved, e.g. `25m 00s`, monospace font with `#38BDF8`).
  - **Case 4: Test Status is `ENDED`**: Displays `"00:00 (Concluded)"`.

---

## 3. Verification & Acceptance Criteria Results

We executed the automated QA suite `test_bug30_lifecycle_and_tentative_time.js`:

| Acceptance Criterion | Result | Details |
| :--- | :---: | :--- |
| **1. "Final test" Auto-transitions to ENDED** | **PASS** | `Final test` transitioned from `LIVE` to `ENDED` and all rooms set to `CLOSED`. |
| **2. Multi-test Database Sweep** | **PASS** | Swept across all existing tests in DB; 10 completed expired tests transitioned to `ENDED`. |
| **2b. Active Tests Preserved** | **PASS** | Tests with future valid rooms (`JavaScript Core Assessment`, `SPOJ DSA Core Evaluation`, etc.) remained `LIVE`. |
| **3. Expired Room Password Blocks Joins** | **PASS** | Rooms past `passwordValidUntil` return `403 Room code expired` on candidate join attempt. |
| **4. "Not started" vs "Session concluded"** | **PASS** | Returns `"Not started"` when 0 candidates started; returns `"Session concluded"` when all candidates finished. |
| **5. BUG-21 In-Progress Remaining Time** | **PASS** | Calculates MAX remaining time among active candidates without regression. |
| **6. Manual "End Test" Action** | **PASS** | Admins can manually end a test at any time, transitioning status and closing rooms. |

Frontend production bundle compiled in `3.69s` with **0 errors**.

---

## 4. BUG-31: 1-Second Delayed Screen-Share Capture for `TAB_SWITCH` & `FULLSCREEN_EXIT`

### Problem Summary
Previously (per BUG-13), when a `TAB_SWITCH` or `FULLSCREEN_EXIT` violation occurred, the screen-capture frame was grabbed from the `MediaStream` immediately at the instant the event fired. This often resulted in mid-transition or blank frames rather than showing the window or tab the candidate actually navigated to.

### Changes Implemented
1. **Immediate Detection & Flagging**:
   - In [`useProctoring.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/hooks/useProctoring.js), `triggerDelayedScreenViolation` records the exact `detectedAt` timestamp synchronously at `t = 0`.
   - Fires `emitTabSwitch` / `emitFullscreenExit` socket events to admins immediately.
   - Shows candidate violation banner (`warningMessage`) and toast alert (`toast.error`) immediately.
2. **1-Second Settling Delay for Screen Capture**:
   - Waits 1 second (`setTimeout(..., 1000)`) before grabbing the frame from `screenVideoRef.current`.
   - The captured frame reflects the candidate's actual settled screen state.
   - Preserves original detection timestamp in watermark footer and sends `detectedAt` to backend.
3. **Independent Timers & Cleanup**:
   - Multiple rapid violations manage their own closures and timers in `delayedViolationTimeoutsRef` without clobbering each other.
   - All pending timers are cleared if the hook unmounts.
4. **Webcam Violations Unchanged**:
   - `PHONE_DETECTED`, `MULTIPLE_FACES`, and `NO_FACE_15MIN` continue to capture immediately without delay.
5. **Backend Timestamp Storage**:
   - In [`proctoringController.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/controllers/proctoringController.js), `reportViolation` accepts `detectedAt` from request body and stores it in `MalpracticeLog.create({ ..., detectedAt })`.

### QA Verification Results
Executed automated test suite `test_bug31_delayed_screen_capture.js`:
- Immediate alert fired synchronously at `t = 0ms`: **PASS**
- Screenshot capture delayed by approximately 1 second (`1007ms`): **PASS**
- Rapid successive violations (`TAB_SWITCH` then `FULLSCREEN_EXIT`) resolved independently: **PASS**
- Webcam violations (`MULTIPLE_FACES`) remained immediate (`0ms`): **PASS**
- Backend `MalpracticeLog` accurately preserved `detectedAt`: **PASS**
- Client build (`npm run build`) succeeded in `1.85s` with **0 errors**.

---

## 5. BUG-32: Seat Map Tile Styling & Visibility Improvements

### Problem Summary
On the Live Physical Seat Map in [`AdminLiveDashboard.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminLiveDashboard.jsx):
1. The "Not Started" (WHITE) tile border was a faint gray (`#e5e7eb`) with `opacity: 0.75`, making it blend into the page background.
2. The bottom-right corner of each tile displayed a redundant literal color-name text label (`"YELLOW"`, `"WHITE"`, `"GREEN"`, `"RED"`).
3. The circular status dot in the top-right corner of the WHITE tile was rendered in faint `#e5e7eb` on a white background, making it nearly invisible.

### Changes Implemented
1. **Black Border for "Not Started" Tiles**:
   - Replaced `#e5e7eb` with solid black (`#111827`), matching the visual weight of the yellow, green, and red tiles.
   - Removed opacity suppression (`opacity: 1`), keeping the tile crisp and distinct.
   - Updated the Seat Map legend swatch for "Not Started" to `border: '2px solid #111827'`.
2. **Removed Redundant Color-Name Text Labels**:
   - Removed the literal text label span (`"YELLOW"`, `"WHITE"`, `"GREEN"`, `"RED"`) from the tile footer across all statuses.
   - Preserved all other content: candidate name, violation badge (`⚠️ count`), room name, questions solved progress, and live timer/status string.
3. **High-Visibility Status Dots**:
   - For WHITE tiles: dot now has a solid fill (`#94A3B8`) with a distinct black outline (`border: '1.5px solid #111827'`).
   - For GREEN, YELLOW, and RED tiles: dots retain their vibrant colors with matching borders and glow.
   - Applied matching visible borders to table view (`CandidateRowItem`) status dots.

### QA Verification Results
Executed automated test suite `test_bug32_seat_map_styling.js`:
- WHITE tile border is solid black (`2px solid #111827`): **PASS**
- No color-name text label rendered across any tile status: **PASS**
- Status dot on WHITE tile has visible fill (`#94A3B8`) and black border (`1.5px solid #111827`): **PASS**
- In-progress, Passed, and Disqualified tiles preserved styling and visibility: **PASS**
- All other tile content (name, violations, room, Qs solved, timer) preserved: **PASS**
- Summary: **30 / 30 tests passed (100%)**. Client build succeeded in **1.76s** with **0 errors**.

---

## 6. BUG-33: Fullscreen Native Notification Bar Auto-Dismiss Fix

### Problem & Root Cause Investigation
On candidate test screens, entering fullscreen displayed Chromium's native keyboard-lock notification:
> `http://localhost:5173 – to exit full screen, press and hold [Esc]`

Rather than auto-hiding after 3–4 seconds, the notification remained permanently visible, obstructing top header buttons ("Submit Project", "Submit All & Finish").

**Root Cause Found**:
- In `CandidateAITestScreen.jsx` and `CandidateTestScreen.jsx`, an inline arrow function `onWarning: (msg) => setWarningMessage(msg)` was passed to `useProctoring`.
- The parent component re-renders every 1 second as the session countdown timer ticks down.
- In `useProctoring.js`, the fullscreen listener `useEffect` had `onWarning` in its dependency array.
- On every 1-second render, the effect's cleanup ran `unlockKeyboard()` and then immediately executed `lockKeyboard()`, issuing a new `navigator.keyboard.lock()` call to Chromium.
- Chromium treated each call as a new lock request, resetting its internal 3-second auto-hide timer every second, pinning the prompt permanently to the top of the viewport.

### Changes Implemented
1. **Synchronous Lock Status Tracking (`isKeyboardLockedRef`)**:
   - In [`useProctoring.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/hooks/useProctoring.js), added `isKeyboardLockedRef = useRef(false)`.
   - `lockKeyboard()` checks `if (isKeyboardLockedRef.current) return;`. It executes `navigator.keyboard.lock()` once on initial fullscreen entry. Subsequent re-renders do not re-invoke `keyboard.lock()`.
2. **Stable Callback Storage (`onWarningRef`)**:
   - Stored `onWarning` inside `onWarningRef = useRef(onWarning)`.
   - Removed `onWarning` from the `useEffect` dependency array, preventing the fullscreen effect from tearing down and re-running on render.
3. **Memoized Parent Handlers**:
   - In [`CandidateAITestScreen.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/candidate/pages/CandidateAITestScreen.jsx) and [`CandidateTestScreen.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/candidate/pages/CandidateTestScreen.jsx), wrapped `handleProctorWarning` in `useCallback`.
4. **Clean Exit & Re-Entry Lifecycle**:
   - Fullscreen exit (`handleFullscreenChange`) calls `unlockKeyboard()`, releasing the lock and resetting `isKeyboardLockedRef.current = false`.
   - Re-entering fullscreen safely engages `lockKeyboard()` once again, showing the notification briefly before it auto-hides.
   - Component unmount cleanly releases keyboard locks.

### QA Verification Results
Executed automated test suite `test_bug33_fullscreen_notification_lifecycle.js`:
- Keyboard lock called exactly ONCE on fullscreen entry: **PASS**
- 10 successive simulated 1-second timer re-renders produced 0 additional lock/unlock calls: **PASS**
- Fullscreen exit cleanly called `unlockKeyboard()` and reset lock state: **PASS**
- Fullscreen re-entry successfully re-engaged keyboard lock: **PASS**
- Code audit across `useProctoring.js`, `CandidateAITestScreen.jsx`, and `CandidateTestScreen.jsx`: **PASS**
- Summary: **18 / 18 tests passed (100%)**. Client build succeeded in **1.89s** with **0 errors**.

---

## 7. FEATURE: "Split / Code / Preview" View-Mode Toggle (AI Test Screen)

### Feature Overview
Added a three-button segmented control — **`◫ Split`**, **`💻 Code`**, **`▶ Preview`** — to the AI Test candidate screen's toolbar and panel headers, allowing candidates to toggle between:
1. **Split** (Default): Code Editor and Preview visible side-by-side at their proportional widths, with the center divider (Splitter 1) active for manual resizing.
2. **Code**: Preview panel collapsed (`display: 'none'`); Code Editor expands to fill the full combined width previously occupied by both panels.
3. **Preview**: Code Editor panel collapsed (`display: 'none'`); Preview iframe expands to fill the full combined width previously occupied by both panels.
4. **AI Assistant**: Remains visible, connected, and functional across all three view modes.

### Key Implementations
1. **Segmented UI Control**:
   - Styled with dark container (`#090d16`), subtle border (`#1e293b`), and Globussoft teal active highlight (`#0E7C86`).
   - Integrated in the top `timer-bar` toolbar directly above the panels, and compact versions in the Code Editor and Preview panel headers alongside their maximize buttons.
2. **Non-Destructive Visibility**:
   - Controlled via CSS `display: 'none'` / `display: 'flex'` without unmounting DOM elements, guaranteeing no loss of unsaved code, cursor positions, file tabs (`index.html`, `style.css`, `script.js`), or preview iframe state.
   - Automatically dispatches `window.resize` on view mode change so Monaco editor smoothly recalculates layout.
3. **Session Persistence**:
   - Initialized and persisted via `sessionStorage` (`ai_test_view_mode`), preserving the candidate's chosen mode across file tab switches and AI chat interactions.
4. **Isolated Scope**:
   - Exclusively applied to `CandidateAITestScreen.jsx`; standard JavaScript/SPOJ screens (`CandidateTestScreen.jsx`) are completely unaffected.

### QA Verification Results
Executed automated test suite `test_ai_editor_view_mode_toggle.js`:
- Segmented toggle component & buttons verified: **PASS**
- State persistence via `sessionStorage` verified: **PASS**
- Panel widths & visibility logic across all 3 view modes verified: **PASS**
- Non-destructive DOM visibility toggling (no unmount) verified: **PASS**
- Isolation to AI Test screen only (no changes to standard test screen) verified: **PASS**
- Regression audit (BUG-14, BUG-31, BUG-33) verified: **PASS**
- Summary: **31 / 31 tests passed (100%)**. Client build succeeded in **1.87s** with **0 errors**.

---

## 8. BUG-34: Fullscreen Refresh Bypass Prevention

### Problem
When a candidate exited fullscreen and refreshed the browser tab (`F5` / reload), `useProctoring` initialized `isFullscreen` to `true` by default and only listened for future `fullscreenchange` events. Because no state transition fired on a fresh page load in windowed mode, `proctoring.isFullscreen` remained `true`. The candidate could interact with questions, write code, run against test cases, and submit completely outside of fullscreen with zero blocking overlay, no re-prompt, and without the reload-triggered fullscreen exit being logged.

### Root Cause
1. `isFullscreen` in `useProctoring.js` was statically initialized with `useState(true)`.
2. Browser `fullscreenchange` event listeners only execute on active transitions; on initial mount after a reload in windowed mode, no transition occurs.
3. As a result, `proctoring.isFullscreen` evaluated to `true`, bypassing the fullscreen blocking overlay on reload.

### Solution
1. **Dynamic Initialization from Document State**:
   - Initialized `isFullscreen` via `useState(() => Boolean(document.fullscreenElement || document.webkitFullscreenElement))`. On a hard reload outside fullscreen, `isFullscreen` immediately starts as `false`.
2. **Immediate Mount / Reload Check & Violation Logging**:
   - In `useProctoring`'s fullscreen effect, immediately evaluates `document.fullscreenElement`.
   - If outside fullscreen on mount/reload, ensures `setIsFullscreen(false)`, logs a `FULLSCREEN_EXIT` violation (via `triggerDelayedScreenViolation`), and fires real-time socket alert to admins (`emitFullscreenExit`).
   - Guarded via `hasCheckedInitialFullscreenRef` to run once per page load and prevent duplicate logs on component re-renders.
   - `// ASSUMPTION: Fullscreen exits resulting from a browser refresh/reload are logged as standard FULLSCREEN_EXIT violations and count toward the candidate's malpractice total and disqualification threshold.`
3. **Blocking Overlay with Elevated z-Index**:
   - Updated the blocking overlay in both `CandidateTestScreen.jsx` and `CandidateAITestScreen.jsx` with `zIndex: 99999`, backdrop blur, and explicit action buttons (`#re-enter-fullscreen-btn`, `#ai-re-enter-fullscreen-btn`).
   - Completely blocks all interaction with questions, Monaco editor, splitters, run buttons, and submit buttons until the candidate clicks to re-enter fullscreen.
4. **Enhanced Re-Entry & Keyboard Lock**:
   - Enhanced `requestFullscreen` to support both standard and WebKit vendor prefixes. Upon successful re-entry, locks the keyboard again and restores test interaction.
5. **Exam Clock & Code State Integrity**:
   - The countdown timer strictly derives from server `candidateEndTime` against `Date.now()`. Staying on the blocking overlay does not pause the clock. If time expires while outside fullscreen, `handleTimerExpire` automatically submits.
   - Previously saved drafts and submissions (`sessionStorage` and backend save) are restored immediately upon re-entering fullscreen.

### Verification Results
Executed automated test suite `test_bug34_fullscreen_refresh_bypass.js`:
- Dynamic `isFullscreen` initialization on mount/reload verified: **PASS**
- Simulation of hard page reload producing `isFullscreen = false` verified: **PASS**
- Violation logging and socket emission on reload outside fullscreen verified: **PASS**
- Fullscreen blocking overlay (zIndex 99999) on both test screens verified: **PASS**
- Request fullscreen re-entry and keyboard lock verified: **PASS**
- Timer independence and autosaved draft restoration verified: **PASS**
- Regression audit (BUG-13, BUG-29, BUG-31, BUG-33) verified: **PASS**
- Summary: **18 / 18 tests passed (100%)**. Client build succeeded in **1.90s** with **0 errors**.

---

## 9. FEATURE: Actual Test Start and End Timestamps on Test Detail Page

### Feature Overview
Enhanced the Test detail page header ([`AdminTestDetail.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminTestDetail.jsx)) to display the actual timestamps for when a test started and ended, as well as its total live duration.

### Key Implementations
1. **Backend Schema Updates**:
   - Added additive lifecycle timestamps `liveStartedAt: { type: Date, default: null }` and `endedAt: { type: Date, default: null }` to [`Test.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/models/Test.js).
2. **Transition Tracking**:
   - **Start Test** (`startTest` in [`testController.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/controllers/testController.js)): Records `liveStartedAt: now` upon transitioning to `LIVE`.
   - **End Test** (`performEndTest` in [`testLifecycleService.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/services/testLifecycleService.js)): Records `endedAt: now` upon transitioning to `ENDED`.
   - **Legacy Fallback / Backfill**: In `getTest`, if an older `LIVE` or `ENDED` test is loaded without recorded timestamps, `liveStartedAt` is backfilled from the earliest room's start window, and `endedAt` from `updatedAt`.
   - `// ASSUMPTION: If liveStartedAt was not recorded when test went LIVE, derive from the earliest room's start window or createdAt.`
3. **Frontend Header Display**:
   - **LIVE Tests**: Displays `Started: [date] at [time]`.
   - **ENDED Tests**: Displays `Started: [date] at [time] • Ended: [date] at [time]` and convenience badge `⏱️ Live for [Xh Ym]`.
   - **DRAFT / SCHEDULED Tests**: Only displays the existing `Created by [name] on [date]`.
   - Styled consistently with muted gray text (`#6b7280`, `0.875rem`) below the test title and badges.

### QA Verification Results
Executed automated test suite `test_test_lifecycle_timestamps.js`:
- Schema fields `liveStartedAt` and `endedAt` verified: **PASS**
- `startTest` records `liveStartedAt` verified: **PASS**
- `performEndTest` records `endedAt` verified: **PASS**
- `getTest` fallback backfill for legacy tests verified: **PASS**
- Frontend date/time formatting and duration calculation verified: **PASS**
- Conditional visibility across `DRAFT`, `LIVE`, and `ENDED` verified: **PASS**
- Zero regressions to badges, action buttons, or created by lines: **PASS**
- Summary: **21 / 21 tests passed (100%)**. Production build succeeded in **1.87s** with **0 errors**.

---

## 10. BUG-35: Redundant Duplicate Date Deduplication on Test Detail Header

### Problem
On the Test detail header, displaying creation date, start date, and end date separately caused visual clutter when all events occurred on the same day (e.g. `Created by BIG BOSS on 3/9/2026` followed by `Started: 3/9/2026 at 12:27 pm · Ended: 3/9/2026 at 12:37 pm`).

### Solution
Replaced the separate `Started: ... · Ended: ...` text line with a date-deduplicated `Live: ...` line following the three required rules:
- **RULE A** (Same day for start, end, and creation): Omits date on Live line entirely.
  `Line 1: Created by BIG BOSS on 3/9/2026`
  `Line 2: Live: 12:27 pm – 12:37 pm (10m)`
- **RULE B** (Live session same day, but different from creation): Displays the live date once.
  `Line 1: Created by BIG BOSS on 1/9/2026`
  `Line 2: Live: 3/9/2026, 12:27 pm – 12:37 pm (10m)`
- **RULE C** (Live session spans midnight across different calendar days): Displays both dates explicitly.
  `Line 2: Live: 3/9/2026 11:50 pm – 4/9/2026 12:10 am (20m)`
- **In-Progress LIVE Tests**: Shows `Live: [start time] – now` (or `Live: [date], [start time] – now` if started on a previous day).
- **DRAFT / SCHEDULED Tests**: Only shows `Created by [admin] on [date]`, no Live line.
- **Duration Calculation**: Directly reuses `formatLiveDuration` to append duration suffix `(Xm)` or `(Xh Ym)`.
- **Preserved Elements**: The separate `⏱️ Live for ...` pill badge remains completely untouched with its exact formatting and position.

### QA Verification Results
Executed automated test suite `test_bug35_date_deduplication.js`:
- Rule A date deduplication verified: **PASS**
- Rule B date inclusion verified: **PASS**
- Rule C midnight spanning verified: **PASS**
- LIVE test in-progress phrasing verified: **PASS**
- DRAFT tests omission verified: **PASS**
- Duration reuse verified: **PASS**
- Separate pill badge preserved: **PASS**
- Zero regressions to badges and action buttons: **PASS**
- Summary: **15 / 15 tests passed (100%)**. Client build succeeded in **1.79s** with **0 errors**.

---

## 11. BUG-37: Duration Deduplication and Pipe "|" Separator on Live Header Line

### Problem
On the Test detail header, the duration was being rendered twice (both inline as `(15h 28m)` and in the separate `⏱ LIVE FOR 15H 28M` pill badge). Additionally, within multi-part timestamps like `2/9/2026 7:12 pm`, the date and time ran together without visual separation.

### Solution
1. **Removed Inline Duration**: Completely eliminated the parenthetical `(${duration})` suffix from `getLiveSessionText`. The duration is now rendered exclusively in the `⏱️ Live for ...` pill badge.
2. **Added Pipe `|` Separator**:
   - **Rule A** (same day as created, dates omitted): `Live: 12:27 pm – 12:37 pm` (no pipe needed).
   - **Rule B** (same day live, different from creation date): `Live: 3/9/2026 | 12:27 pm – 12:37 pm`.
   - **Rule C** (session spans multiple days): `Live: 2/9/2026 | 7:12 pm – 3/9/2026 | 10:41 am`.
   - **Live In-Progress**: `Live: 12:27 pm – now` (same day) or `Live: 3/9/2026 | 12:27 pm – now` (different day).
3. **Pill Badge**: Left completely untouched in its original format, styling, and position.

### QA Verification Results
Executed automated test suite `test_bug37_separator_and_duration_dedup.js`:
- Zero parenthetical duration in Live line verified: **PASS**
- Rule B date and time pipe separation verified: **PASS**
- Rule C two-date pipe separation verified: **PASS**
- Rule A date omission without stray pipe verified: **PASS**
- Live in-progress pipe separation verified: **PASS**
- Separate pill badge preserved as single source of truth for duration: **PASS**
- Zero regressions to badges, created by line, or action buttons: **PASS**
- Summary: **16 / 16 tests passed (100%)**. Client build succeeded in **1.81s** with **0 errors**.

---

## 12. BUG-36: Test Configuration Editing (DRAFT & LIVE/ENDED Lifecycles)

### Problem
On the Test detail page, core test configuration fields (Question Set, Duration, Total Questions, Start Window, Supported Languages, Instructions, and Test Name) could not be edited after test creation, even when the test was still in `DRAFT` status and had not yet started.

### Solution
1. **Edit Button on Configuration Details Card**:
   - Added an `✏️ Edit` button to the `Configuration Details` card header in [`AdminTestDetail.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminTestDetail.jsx).
2. **DRAFT Status Full Editability**:
   - When opened on a `DRAFT` test, all fields are unlocked and fully editable:
     - Test Name / Title
     - Question Set (dropdown filtered by `test.testType`, with fallback to ensure current set is listed)
     - Duration (Minutes)
     - Total Questions
     - Start Window / Join Window (Minutes)
     - Supported Languages (multi-select checkboxes)
     - Candidate Instructions
3. **LIVE / ENDED Status Protection**:
   - Once a test has transitioned to `LIVE` or `ENDED`, assessment parameters (Question Set, Duration, Total Questions, Start Window, Languages) are disabled to protect candidate sessions and scoring integrity.
   - An advisory banner (`🔒 Core assessment settings... are locked once a test is LIVE`) informs the admin.
   - Test Name and Instructions remain editable.
4. **Backend Enforcement & Validation**:
   - [`updateTest` in `testController.js`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/controllers/testController.js) rejects changes to locked configuration fields if test status is `LIVE` or `ENDED`.
   - Validates positive duration, positive question count, positive window, non-empty languages, and non-empty title/instructions.
   - Fully populates `createdBy` and `questionSetId` upon returning the updated test object.
5. **Instant Synchronization**:
   - `setTest(res.data.test)` updates local state immediately, updating the header title, question set name, duration, questions count, start window, languages, and instructions without a page reload.

### QA Verification Results
Executed automated test suite `test_bug36_edit_test_configuration.js`:
- Edit button present on Configuration Details card: **PASS**
- Full field editability in DRAFT status: **PASS**
- Field locking and advisory notice in LIVE/ENDED status: **PASS**
- Server-side security enforcement for locked fields: **PASS**
- Input validation checks: **PASS**
- Instant client state synchronization: **PASS**
- Zero regressions to Passing Criteria, Malpractice Threshold, or Room management: **PASS**
- Summary: **15 / 15 tests passed (100%)**. Client build succeeded in **1.76s** with **0 errors**.

---

## 13. BUG-38: Edit Test Configuration Modal Full Parity with Create Modal

### Problem
Comparing the "Create New Test" modal against the "Edit Test Configuration" modal built for BUG-36 revealed discrepancies:
1. Missing `Test Type` dropdown field in the Edit modal.
2. Need to confirm intentional omission of `Passing Criteria` from the Edit modal (to prevent conflicting dual editing paths with the dedicated Passing Criteria card).
3. Inconsistent field labeling: `Start Window` in Edit vs. `Join Window / Password Validity (Minutes)` with expiration subtext in Create.
4. Divergent Supported Languages: Edit showed `REACT` while Create only showed 5 languages without `REACT`.

### Solution
1. **Added Test Type with Cascading Reset**:
   - Added `Test Type *` select dropdown to the Edit modal in [`AdminTestDetail.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminTestDetail.jsx).
   - Editable only while `test.status === 'DRAFT'`. Locked/disabled for `LIVE` and `ENDED` tests.
   - When changed, `questionSetId` is immediately reset to empty (`''`), requiring the admin to choose a valid question set for the newly selected test type.
   - Question Sets in the dropdown filter dynamically by `editFormData.testType`.
2. **Preserved Single Source of Truth for Passing Criteria**:
   - Confirmed intentional omission from Edit Configuration modal. Passing Criteria remains exclusively editable via the dedicated card on the Test Detail page, which directly invokes shortlist recalculation.
3. **Unified Field Labels and Layout**:
   - Renamed label to `Join Window / Password Validity (Minutes)`.
   - Added helper sub-text: `Room passwords expire after this window from room creation (FR-3.3).`
   - Unified modal layout to mirror Create modal:
     - Row 1: `Test Title *`
     - Row 2: `Test Type *` & `Question Set *` (2 columns)
     - Row 3: `Duration (Minutes) *` & `Total Questions` (2 columns)
     - Row 4: `Join Window / Password Validity (Minutes)`
     - Row 5: `Supported Languages`
     - Row 6: `Candidate Instructions *`
4. **Canonical Supported Languages Parity**:
   - Audited the `Test` Mongoose model schema enum: `['python', 'java', 'cpp', 'c', 'javascript', 'react']`.
   - Added `'react'` to `PROGRAMMING_LANGUAGES` in [`AdminTests.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminTests.jsx) so both Create and Edit modals offer the exact identical set of 6 checkboxes.

### QA Verification Results
Executed automated test suite `test_bug38_edit_modal_parity.js`:
- Edit modal renders Test Type select dropdown with all test types: **PASS**
- Test Type field is disabled when test status is not DRAFT: **PASS**
- Backend updateTest locks testType when test is LIVE or ENDED: **PASS**
- `handleEditTestTypeChange` resets `questionSetId` to empty string when Test Type changes: **PASS**
- Question Set dropdown filters by `editFormData.testType`: **PASS**
- Passing Criteria intentionally omitted from Edit modal: **PASS**
- Unified `Join Window / Password Validity (Minutes)` label and helper sub-text: **PASS**
- Canonical 6 supported languages match identically between Create and Edit: **PASS**
- Zero regressions to previous features or bug fixes: **PASS**
- Summary: **17 / 17 tests passed (100%)**. Client build succeeded in **1.86s** with **0 errors**.

---

## 14. BUG-39: DRAFT-Only Test Configuration Editing & Button Visibility

### Problem
On the Test detail page for an `ENDED` or `LIVE` test, the "Edit" button on the Configuration Details card was still visible and clickable. Per directive, editing is strictly DRAFT-only: once a test goes `LIVE` or has `ENDED`, the Edit button should be hidden and the backend endpoint must reject modifications with 403 Forbidden.

### Solution
1. **Conditional "Edit" Button Rendering**:
   - In [`AdminTestDetail.jsx`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/client/src/admin/pages/AdminTestDetail.jsx#L719-L738), wrapped the Edit button with `{test?.status === 'DRAFT' && (...)}`.
   - The button is visible and active on `DRAFT` tests, and completely hidden on `LIVE` and `ENDED` tests.
2. **Backend API Security Enforcement**:
   - In [`testController.js:updateTest`](file:///c:/Users/GLB-BLR-112/Desktop/spoj%20test%20website/ai-proctored-test-platform/server/src/controllers/testController.js#L112-L130), added a strict check:
     ```javascript
     if (existing.status !== 'DRAFT') {
       return res.status(403).json({
         error: `Test configuration can only be edited while in DRAFT status. Current status: ${existing.status}.`,
       });
     }
     ```
   - Direct API calls attempting to mutate non-DRAFT tests are immediately rejected.
3. **Dead Partial-Locking Code Cleanup**:
   - Cleaned up confusing partial-edit logic, complex ternaries, and advisory banners.
   - Simplified modal header badge to `DRAFT`.
   - Guarded `handleOpenEditModal` and `handleSaveConfig` with `if (test?.status !== 'DRAFT') return;`.
4. **Preserved Independent Controls**:
   - Passing Criteria (FR-2.2) remains editable anytime via its dedicated card.
   - Malpractice Disqualification Threshold (FR-2.3) remains editable post-test via its dedicated card.

### QA Verification Results
Executed automated test suite `test_bug39_draft_only_edit.js`:
- Edit button conditionally rendered strictly for `DRAFT` status: **PASS**
- Edit button completely hidden on `LIVE` tests: **PASS**
- Edit button completely hidden on `ENDED` tests: **PASS**
- Client-side open and save guards enforced: **PASS**
- Backend `updateTest` rejects non-DRAFT tests with 403 Forbidden: **PASS**
- Full field editing in DRAFT status preserved: **PASS**
- Independent Passing Criteria and Malpractice Threshold controls preserved: **PASS**
- Dead partial-lock code and advisory banners cleaned up: **PASS**
- Summary: **18 / 18 tests passed (100%)**. Client build succeeded in **1.77s** with **0 errors**.
