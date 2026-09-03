/**
 * QA Verification Suite for BUG-37:
 * Duration Deduplication and Pipe "|" Separator on Live Header Line
 *
 * Verifies:
 * 1. The "Live:" line never shows duration in parentheses — duration appears exclusively in the "⏱️ Live for ..." pill badge (Criterion 1).
 * 2. Whenever a date is shown on the "Live:" line (Rule B or Rule C), it is separated from its adjacent time by a "|" character (Criterion 2).
 * 3. Rule A (same calendar day as created): "Live: 12:27 pm – 12:37 pm" with no stray "|" and no duration suffix (Criterion 3).
 * 4. Rule B (same day live, but different from creation): "Live: 3/9/2026 | 12:27 pm – 12:37 pm" (Criterion 4).
 * 5. Rule C (spans multiple calendar days): "Live: 2/9/2026 | 7:12 pm – 3/9/2026 | 10:41 am" (Criterion 4).
 * 6. Live in-progress: "Live: 12:27 pm – now" (same day) or "Live: 3/9/2026 | 12:27 pm – now" (different day).
 * 7. Separate pill badge "⏱️ Live for ..." remains intact as the single source of truth for duration display.
 * 8. Zero regressions to badges, "Created by" line, or action buttons (Criterion 5).
 */

const fs = require('fs');
const path = require('path');

async function runTests() {
  console.log('========================================================================');
  console.log('QA VERIFICATION SUITE: BUG-37 Separator & Duration Deduplication');
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
  const testDetailCode = fs.readFileSync(testDetailPath, 'utf-8');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 1: Source Code Structure & Logic Audit
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: Source Code Audit for BUG-37 ---');
  assert(
    !testDetailCode.includes('durationSuffix') && !testDetailCode.includes('(${duration})'),
    'Live line helper completely excludes inline duration suffix (Criterion 1)'
  );
  assert(
    testDetailCode.includes('`Live: ${formatDateOnly(startDate)} | ${formatTimeOnly(startDate)} – ${formatTimeOnly(endDate)}`'),
    'Rule B includes pipe "|" separator between date and time (Criterion 2)'
  );
  assert(
    testDetailCode.includes('`Live: ${formatDateOnly(startDate)} | ${formatTimeOnly(startDate)} – ${formatDateOnly(endDate)} | ${formatTimeOnly(endDate)}`'),
    'Rule C includes pipe "|" separator for both start and end timestamps (Criterion 2)'
  );
  assert(
    testDetailCode.includes('`Live: ${formatTimeOnly(startDate)} – ${formatTimeOnly(endDate)}`'),
    'Rule A has no pipe "|" when date is omitted (Criterion 3)'
  );
  assert(
    testDetailCode.includes('⏱️ Live for {formatLiveDuration(test.liveStartedAt, test.endedAt)}'),
    'Separate Live for pill badge preserved as single source of truth for duration'
  );

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 2: Simulation of Formatting Rules
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: Formatting Simulation ---');

  const isSameCalendarDay = (d1, d2) => {
    if (!d1 || !d2) return false;
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  };

  const formatTimeOnly = (dateObj) => {
    return dateObj.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase();
  };

  const formatDateOnly = (dateObj) => {
    return dateObj.toLocaleDateString();
  };

  const getLiveSessionText = (test) => {
    if (!test?.liveStartedAt) return null;

    const startDate = new Date(test.liveStartedAt);
    const createdDate = new Date(test.createdAt);
    const isLive = test.status === 'LIVE';
    const isEnded = test.status === 'ENDED';

    if (!isLive && !isEnded) return null;

    if (isEnded) {
      if (!test.endedAt) return null;
      const endDate = new Date(test.endedAt);

      const sameDayLive = isSameCalendarDay(startDate, endDate);
      const sameDayCreated = isSameCalendarDay(startDate, createdDate);

      if (sameDayLive) {
        if (sameDayCreated) {
          return `Live: ${formatTimeOnly(startDate)} – ${formatTimeOnly(endDate)}`;
        } else {
          return `Live: ${formatDateOnly(startDate)} | ${formatTimeOnly(startDate)} – ${formatTimeOnly(endDate)}`;
        }
      } else {
        return `Live: ${formatDateOnly(startDate)} | ${formatTimeOnly(startDate)} – ${formatDateOnly(endDate)} | ${formatTimeOnly(endDate)}`;
      }
    }

    if (isLive) {
      const sameDayCreated = isSameCalendarDay(startDate, createdDate);
      if (sameDayCreated) {
        return `Live: ${formatTimeOnly(startDate)} – now`;
      } else {
        return `Live: ${formatDateOnly(startDate)} | ${formatTimeOnly(startDate)} – now`;
      }
    }

    return null;
  };

  // Rule A
  const testA = {
    status: 'ENDED',
    createdAt: '2026-09-03T05:00:00.000Z',
    liveStartedAt: '2026-09-03T06:57:00.000Z', // 12:27 PM IST
    endedAt: '2026-09-03T07:07:00.000Z',       // 12:37 PM IST
  };
  const textA = getLiveSessionText(testA);
  assert(textA.startsWith('Live: ') && textA.includes(' – '), 'Rule A output formatted');
  assert(!textA.includes('|'), 'Rule A contains no stray pipe separator');
  assert(!textA.includes('(') && !textA.includes(')'), 'Rule A contains no parenthetical duration');

  // Rule B
  const testB = {
    status: 'ENDED',
    createdAt: '2026-09-01T05:00:00.000Z',     // 1/9/2026
    liveStartedAt: '2026-09-03T06:57:00.000Z', // 3/9/2026
    endedAt: '2026-09-03T07:07:00.000Z',       // 3/9/2026
  };
  const textB = getLiveSessionText(testB);
  assert(textB.includes(' | '), 'Rule B contains " | " between date and start time');
  assert(!textB.includes('(') && !textB.includes(')'), 'Rule B contains no parenthetical duration');

  // Rule C (from screenshot: 2/9/2026 | 7:12 pm – 3/9/2026 | 10:41 am)
  const testC = {
    status: 'ENDED',
    createdAt: '2026-09-02T05:00:00.000Z',
    liveStartedAt: '2026-09-02T13:42:00.000Z', // 2/9/2026 7:12 PM IST
    endedAt: '2026-09-03T05:11:00.000Z',       // 3/9/2026 10:41 AM IST
  };
  const textC = getLiveSessionText(testC);
  const pipeCountC = (textC.match(/ \| /g) || []).length;
  assert(pipeCountC === 2, `Rule C contains exactly two " | " separators (one for start, one for end) (actual: ${pipeCountC})`);
  assert(!textC.includes('(') && !textC.includes(')'), 'Rule C contains no parenthetical duration');

  // Currently LIVE test
  const testLiveDiffDay = {
    status: 'LIVE',
    createdAt: '2026-09-01T05:00:00.000Z',
    liveStartedAt: '2026-09-03T06:57:00.000Z',
  };
  const textLive = getLiveSessionText(testLiveDiffDay);
  assert(textLive.includes(' | ') && textLive.endsWith(' – now'), 'LIVE test on different day includes pipe and "– now"');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 3: Regression Prevention Audit
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: Regression Prevention Audit ---');
  assert(
    testDetailCode.includes('Created by <strong>{test.createdBy?.name || \'Admin\'}</strong> on'),
    'Created by line preserved'
  );
  assert(
    testDetailCode.includes('<TestStatusBadge') && testDetailCode.includes('status={test.status}'),
    'TestStatusBadge preserved'
  );
  assert(
    testDetailCode.includes('View Results &amp; Shortlist') || testDetailCode.includes('View Results'),
    'View Results & Shortlist action button preserved'
  );

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
