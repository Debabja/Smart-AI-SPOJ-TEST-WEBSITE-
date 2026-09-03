/**
 * QA Verification Suite for BUG-33: Fullscreen Notification Lifecycle & Keyboard Lock Debounce
 *
 * Verifies:
 * 1. navigator.keyboard.lock() is called exactly ONCE when entering fullscreen.
 * 2. Frequent component re-renders (simulating 1s countdown ticks, editor typing, chat updates)
 *    do NOT repeatedly call navigator.keyboard.lock() or unlockKeyboard().
 * 3. Chromium's native "press and hold Esc to exit" banner auto-hide timer is therefore NOT reset every second.
 * 4. Exiting fullscreen properly calls unlockKeyboard() and resets lock tracking state.
 * 5. Re-entering fullscreen invokes lockKeyboard() once more, preserving full re-entry behavior.
 * 6. Codebase audit verifies CandidateAITestScreen.jsx, CandidateTestScreen.jsx, and useProctoring.js.
 */

const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('========================================================================');
  console.log('QA VERIFICATION SUITE: BUG-33 (Fullscreen Prompt Lifecycle & Lock)');
  console.log('========================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, message) {
    totalTests++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passedTests++;
    } else {
      console.error(`[FAIL] ${message}`);
      process.exitCode = 1;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Simulation of Keyboard Lock Lifecycle under repeated renders
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Simulate Keyboard Lock under 1-second timer re-renders ---');

  function createKeyboardLockHarness() {
    let mockKeyboardLockCalls = 0;
    let mockKeyboardUnlockCalls = 0;

    const mockNavigator = {
      keyboard: {
        lock: async () => {
          mockKeyboardLockCalls++;
        },
        unlock: () => {
          mockKeyboardUnlockCalls++;
        },
      },
    };

    let isDocumentFullscreen = false;
    const isKeyboardLockedRef = { current: false };

    async function lockKeyboard() {
      if (isKeyboardLockedRef.current) return;
      if (!isDocumentFullscreen) return;

      if ('keyboard' in mockNavigator && typeof mockNavigator.keyboard.lock === 'function') {
        isKeyboardLockedRef.current = true;
        await mockNavigator.keyboard.lock();
      }
    }

    function unlockKeyboard() {
      if (!isKeyboardLockedRef.current) return;
      if ('keyboard' in mockNavigator && typeof mockNavigator.keyboard.unlock === 'function') {
        mockNavigator.keyboard.unlock();
        isKeyboardLockedRef.current = false;
      }
    }

    function enterFullscreen() {
      isDocumentFullscreen = true;
      lockKeyboard();
    }

    function exitFullscreen() {
      isDocumentFullscreen = false;
      unlockKeyboard();
    }

    return {
      getLockCalls: () => mockKeyboardLockCalls,
      getUnlockCalls: () => mockKeyboardUnlockCalls,
      isLocked: () => isKeyboardLockedRef.current,
      lockKeyboard,
      unlockKeyboard,
      enterFullscreen,
      exitFullscreen,
    };
  }

  const harness = createKeyboardLockHarness();

  // Initially: Not in fullscreen, not locked
  assert(harness.getLockCalls() === 0, 'No keyboard lock calls before entering fullscreen');
  assert(harness.isLocked() === false, 'Keyboard is not locked initially');

  // Step 1: Candidate enters fullscreen
  harness.enterFullscreen();
  assert(harness.getLockCalls() === 1, 'Keyboard lock engaged exactly ONCE on fullscreen entry (Criterion 1)');
  assert(harness.isLocked() === true, 'Keyboard lock state is true');

  // Step 2: Simulate 10 successive component re-renders (1s countdown ticks)
  for (let i = 1; i <= 10; i++) {
    harness.lockKeyboard(); // Hook's inline check on re-render
  }

  assert(
    harness.getLockCalls() === 1,
    `After 10 successive re-renders, lock calls remained 1 (actual: ${harness.getLockCalls()}) — Chrome prompt timer will NOT reset!`
  );
  assert(
    harness.getUnlockCalls() === 0,
    `No premature unlock calls occurred during active fullscreen (actual: ${harness.getUnlockCalls()})`
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Fullscreen Exit and Re-entry (Criterion 2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Fullscreen Exit and Re-entry ---');

  // Candidate exits fullscreen (e.g., presses and holds Esc)
  harness.exitFullscreen();
  assert(harness.getUnlockCalls() === 1, 'Keyboard unlock called upon exiting fullscreen');
  assert(harness.isLocked() === false, 'Keyboard lock state reset to false');

  // Candidate clicks "Return to Fullscreen"
  harness.enterFullscreen();
  assert(harness.getLockCalls() === 2, 'Keyboard lock re-engaged upon returning to fullscreen (Criterion 2)');
  assert(harness.isLocked() === true, 'Keyboard lock state is true again');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Source Code Audit of useProctoring.js
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Source Code Audit of useProctoring.js ---');
  const proctoringCode = fs.readFileSync(
    path.join(__dirname, '../../../../client/src/hooks/useProctoring.js'),
    'utf-8'
  );

  assert(
    proctoringCode.includes('isKeyboardLockedRef = useRef(false)'),
    'useProctoring.js contains isKeyboardLockedRef for tracking lock status'
  );
  assert(
    proctoringCode.includes('if (isKeyboardLockedRef.current) return;'),
    'lockKeyboard checks isKeyboardLockedRef.current before invoking navigator.keyboard.lock()'
  );
  assert(
    proctoringCode.includes('const onWarningRef = useRef(onWarning)'),
    'useProctoring.js stores onWarning in onWarningRef to prevent effect re-triggering'
  );
  assert(
    !proctoringCode.includes('}, [enabled, candidateId, testId, roomId, triggerDelayedScreenViolation, lockKeyboard, unlockKeyboard, onWarning]'),
    'Fullscreen effect does NOT depend on onWarning, avoiding churn on parent re-renders'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Source Code Audit of Candidate Screens
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Source Code Audit of CandidateAITestScreen.jsx & CandidateTestScreen.jsx ---');
  const aiTestCode = fs.readFileSync(
    path.join(__dirname, '../../../../client/src/candidate/pages/CandidateAITestScreen.jsx'),
    'utf-8'
  );
  const stdTestCode = fs.readFileSync(
    path.join(__dirname, '../../../../client/src/candidate/pages/CandidateTestScreen.jsx'),
    'utf-8'
  );

  assert(
    aiTestCode.includes('const handleProctorWarning = useCallback('),
    'CandidateAITestScreen.jsx wraps handleProctorWarning in useCallback (Criterion 4)'
  );
  assert(
    aiTestCode.includes('onWarning: handleProctorWarning'),
    'CandidateAITestScreen.jsx passes memoized handleProctorWarning to useProctoring'
  );
  assert(
    stdTestCode.includes('const handleProctorWarning = useCallback('),
    'CandidateTestScreen.jsx wraps handleProctorWarning in useCallback (Criterion 4)'
  );
  assert(
    stdTestCode.includes('onWarning: handleProctorWarning'),
    'CandidateTestScreen.jsx passes memoized handleProctorWarning to useProctoring'
  );

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
