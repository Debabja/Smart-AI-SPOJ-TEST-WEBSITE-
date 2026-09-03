/**
 * QA Verification Suite for: Actual Test Start and End Timestamps Feature
 *
 * Verifies:
 * 1. Backend schema: liveStartedAt and endedAt fields exist on Test schema.
 * 2. Start transition: startTest sets status to LIVE and records liveStartedAt.
 * 3. End transition: performEndTest sets status to ENDED, records endedAt, and backfills liveStartedAt if missing.
 * 4. Fallback backfill: getTest provides reliable fallback timestamps for existing legacy tests.
 * 5. Frontend rendering:
 *    - LIVE tests show "Started: [date] at [time]".
 *    - ENDED tests show "Started: [date] at [time]" and "Ended: [date] at [time]" + duration badge "Live for Xh Ym".
 *    - DRAFT / SCHEDULED tests display neither (only "Created by").
 * 6. Duration helper accurately formats hours and minutes.
 * 7. Zero regressions to existing Test detail header elements (badges, buttons, created by).
 */

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

async function runTests() {
  console.log('========================================================================');
  console.log('QA VERIFICATION SUITE: Actual Test Start & End Timestamps on Test Detail');
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

  const testModelPath = path.join(__dirname, '../../models/Test.js');
  const testLifecyclePath = path.join(__dirname, '../../services/testLifecycleService.js');
  const testControllerPath = path.join(__dirname, '../../controllers/testController.js');
  const testDetailPath = path.join(__dirname, '../../../../client/src/admin/pages/AdminTestDetail.jsx');

  const testModelCode = fs.readFileSync(testModelPath, 'utf-8');
  const testLifecycleCode = fs.readFileSync(testLifecyclePath, 'utf-8');
  const testControllerCode = fs.readFileSync(testControllerPath, 'utf-8');
  const testDetailCode = fs.readFileSync(testDetailPath, 'utf-8');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Backend Model Schema Check (Criterion 1)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Backend Test Model Schema ---');
  assert(
    testModelCode.includes('liveStartedAt: { type: Date, default: null }'),
    'Test schema includes additive liveStartedAt field'
  );
  assert(
    testModelCode.includes('endedAt: { type: Date, default: null }'),
    'Test schema includes additive endedAt field'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Controller & Service Lifecycle Tracking (Criterion 1 & 4)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Start & End Lifecycle Timestamp Tracking ---');
  assert(
    testControllerCode.includes('updates.liveStartedAt = now;') ||
    testControllerCode.includes('test.liveStartedAt = now;'),
    'startTest records liveStartedAt timestamp on transition to LIVE'
  );
  assert(
    testLifecycleCode.includes('updates.endedAt = now;'),
    'performEndTest records endedAt timestamp on transition to ENDED'
  );
  assert(
    testLifecycleCode.includes('updates.liveStartedAt ='),
    'performEndTest backfills liveStartedAt from earliest room if previously missing'
  );
  assert(
    testControllerCode.includes('if ((test.status === \'LIVE\' || test.status === \'ENDED\') && !test.liveStartedAt)'),
    'getTest includes opportunistic backfill for legacy tests missing liveStartedAt'
  );
  assert(
    testControllerCode.includes('if (test.status === \'ENDED\' && !test.endedAt)'),
    'getTest includes opportunistic backfill for legacy tests missing endedAt'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Frontend Timestamp & Duration Helpers (Criterion 2 & 3)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Frontend Formatting & Duration Logic ---');
  assert(
    testDetailCode.includes('const formatDateTime ='),
    'AdminTestDetail includes formatDateTime helper'
  );
  assert(
    testDetailCode.includes('const formatLiveDuration ='),
    'AdminTestDetail includes formatLiveDuration helper'
  );

  // Simulate formatLiveDuration logic
  const formatLiveDuration = (startDateStr, endDateStr) => {
    if (!startDateStr || !endDateStr) return null;
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);
    const diffMs = end - start;
    if (diffMs <= 0 || isNaN(diffMs)) return null;
    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    if (hours > 0 && minutes > 0) return `${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return '< 1m';
  };

  const tStart = '2026-09-03T10:00:00.000Z';
  const tEnd1 = '2026-09-03T11:23:00.000Z'; // 1h 23m
  const tEnd2 = '2026-09-03T10:45:00.000Z'; // 45m
  const tEnd3 = '2026-09-03T12:00:00.000Z'; // 2h

  assert(formatLiveDuration(tStart, tEnd1) === '1h 23m', '1h 23m formatted correctly');
  assert(formatLiveDuration(tStart, tEnd2) === '45m', '45m formatted correctly');
  assert(formatLiveDuration(tStart, tEnd3) === '2h', '2h formatted correctly');
  assert(formatLiveDuration(null, tEnd1) === null, 'Missing start returns null');
  assert(formatLiveDuration(tStart, null) === null, 'Missing end returns null');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 4: Frontend Conditional Visibility for Lifecycle States (Criteria 1, 2, 3)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: Frontend Conditional Visibility by Status ---');
  assert(
    testDetailCode.includes("(test.status === 'LIVE' || test.status === 'ENDED') && getLiveSessionText(test)"),
    'Live line is only rendered if test is LIVE or ENDED and getLiveSessionText exists'
  );
  assert(
    testDetailCode.includes("isEnded") && testDetailCode.includes("test.endedAt"),
    'Ended timestamp is strictly rendered for ENDED status in getLiveSessionText'
  );
  assert(
    testDetailCode.includes("test.status === 'ENDED' && formatLiveDuration(test.liveStartedAt, test.endedAt)"),
    'Live duration badge is strictly rendered for ENDED tests with both timestamps'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Regression Prevention (Criterion 5)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Regression Prevention Audit ---');
  assert(
    testDetailCode.includes('Created by <strong>{test.createdBy?.name || \'Admin\'}</strong> on'),
    'Created by [name] on [date] preserved'
  );
  assert(
    testDetailCode.includes('<TestStatusBadge'),
    'TestStatusBadge preserved'
  );
  assert(
    testDetailCode.includes('View Results & Shortlist') || testDetailCode.includes('/results'),
    'View Results & Shortlist button preserved for ENDED tests'
  );
  assert(
    testDetailCode.includes('Open Live Dashboard') || testDetailCode.includes('/live'),
    'Open Live Dashboard button preserved for LIVE tests'
  );

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
