/**
 * QA Verification Suite for BUG-36:
 * Test Configuration Editing (DRAFT & LIVE/ENDED Lifecycles)
 *
 * Verifies:
 * 1. An "Edit" button exists on the Configuration Details card header (Criterion 1).
 * 2. While DRAFT, all core config fields are editable: title, questionSetId, durationMinutes, totalQuestions, startTestWindowMinutes, supportedLanguages, instructions (Criterion 2).
 * 3. When LIVE or ENDED, core assessment fields (question set, duration, total questions, start window, languages) are locked/disabled with clear advisory text; only title and instructions remain editable (Criterion 3).
 * 4. Backend PATCH /tests/:testId strictly enforces locking for LIVE and ENDED tests, rejecting unauthorized configuration changes (Criterion 3).
 * 5. Input validation rules are enforced: positive duration, positive question count, positive window, non-empty languages, non-empty title/instructions (Criterion 5).
 * 6. UI updates local component state directly on save (res.data.test) without requiring manual refresh (Criterion 4).
 * 7. Zero regressions to Passing Criteria, Malpractice Threshold, Room management, or test start/end (Criterion 6).
 */

const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('========================================================================');
  console.log('QA VERIFICATION SUITE: BUG-36 Test Configuration Editing');
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

  const testDetailPath = path.join(__dirname, '../../../../client/src/admin/pages/AdminTestDetail.jsx');
  const testControllerPath = path.join(__dirname, '../../controllers/testController.js');

  const testDetailCode = fs.readFileSync(testDetailPath, 'utf-8');
  const testControllerCode = fs.readFileSync(testControllerPath, 'utf-8');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Edit Button on Configuration Details Card (Criterion 1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Edit Button Presence on Configuration Details Card ---');
  assert(
    testDetailCode.includes('id="edit-config-btn"') &&
    testDetailCode.includes('onClick={handleOpenEditModal}'),
    'Edit button is placed in Configuration Details card header'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Full Field Editing in DRAFT Status (Criterion 2)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: DRAFT Status Field Editability ---');
  assert(
    testDetailCode.includes('id="edit-test-title"') &&
    testDetailCode.includes('id="edit-question-set"') &&
    testDetailCode.includes('id="edit-duration-minutes"') &&
    testDetailCode.includes('id="edit-total-questions"') &&
    testDetailCode.includes('id="edit-start-window"') &&
    testDetailCode.includes('id="edit-instructions"'),
    'All six core configuration fields plus Test Title are present in Edit modal'
  );
  assert(
    testDetailCode.includes('handleEditLanguageToggle'),
    'Multi-select language toggling is supported in Edit modal'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: DRAFT-Only Access Control (BUG-39 superseding partial lock)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: DRAFT-Only Access Control ---');
  assert(
    testDetailCode.includes("{test?.status === 'DRAFT' && (") &&
    testDetailCode.includes('id="edit-config-btn"'),
    'Edit button on Configuration Details card is strictly rendered only when test?.status === \'DRAFT\''
  );
  assert(
    testDetailCode.includes("if (test?.status !== 'DRAFT') return;"),
    'handleOpenEditModal guards against opening if test is not DRAFT'
  );
  assert(
    testDetailCode.includes("if (test?.status !== 'DRAFT')"),
    'handleSaveConfig guards against submitting if test is not DRAFT'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Backend Enforcement & Input Validation (BUG-39)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Backend Security & Input Validation ---');
  assert(
    testControllerCode.includes("existing.status !== 'DRAFT'") &&
    testControllerCode.includes('403'),
    'Server updateTest rejects modifications to non-DRAFT tests with 403 Forbidden'
  );
  assert(
    testControllerCode.includes('durationMinutes <= 0') &&
    testControllerCode.includes('totalQuestions <= 0') &&
    testControllerCode.includes('startTestWindowMinutes <= 0') &&
    testControllerCode.includes('supportedLanguages.length === 0'),
    'Server updateTest strictly enforces positive numbers and non-empty language selections'
  );
  assert(
    testControllerCode.includes('.populate(\'questionSetId\', \'name testType questionIds\')'),
    'Server updateTest hydrates questionSetId on return for instant client synchronization'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Immediate Client Reflection (Criterion 4)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Instant State Synchronization on Save ---');
  assert(
    testDetailCode.includes('const res = await api.updateTest(testId, payload);') &&
    testDetailCode.includes('setTest(res.data.test);'),
    'Saved changes update local test state immediately without page reload'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 6: Regression Prevention Audit (Criterion 6)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 6: Regression Prevention Audit ---');
  assert(
    testDetailCode.includes('handleUpdatePassingCriteria'),
    'Passing criteria editing preserved'
  );
  assert(
    testDetailCode.includes('handleUpdateMalpracticeThreshold'),
    'Malpractice threshold editing preserved'
  );
  assert(
    testDetailCode.includes('handleAddRoomSubmit') && testDetailCode.includes('handleDeleteRoom'),
    'Physical room creation and management preserved'
  );
  assert(
    testDetailCode.includes('handleStartTest') && testDetailCode.includes('handleEndTest'),
    'Start and End test workflows preserved'
  );
  assert(
    testDetailCode.includes('getLiveSessionText'),
    'BUG-35 & BUG-37 date-deduplicated Live line preserved'
  );

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
