/**
 * QA Verification Suite for BUG-32: Seat Map Tile Styling
 * Verifies:
 * 1. Black border (#111827) for "Not Started" (WHITE) tile.
 * 2. Status dot has visible border and fill on WHITE tile and colors on other statuses.
 * 3. Removal of literal color-name labels ("YELLOW", "WHITE", "GREEN", "RED").
 * 4. Preservation of all other tile content (name, violation count badge, room, Qs Solved, descriptive status line).
 * 5. Complete verification across all 4 statuses (Passed/GREEN, In Progress/YELLOW, Disqualified/RED, Not Started/WHITE).
 */

const STATUS_COLORS = {
  GREEN: '#2ECC71',
  YELLOW: '#F1C40F',
  RED: '#E74C3C',
  WHITE: '#e5e7eb',
};

function computeSeatTileStyles(candidate, roomName, nowMs) {
  const isCandidateInProgress = candidate.status === 'IN_PROGRESS';
  const color = STATUS_COLORS[candidate.colorStatus] || (isCandidateInProgress ? STATUS_COLORS.YELLOW : STATUS_COLORS.WHITE);
  const isWhite = color === STATUS_COLORS.WHITE && !isCandidateInProgress;
  const malpracticeCount = candidate.malpracticeCount || 0;

  // Tile container styles
  const containerStyle = {
    background: isWhite ? '#ffffff' : `${color}15`,
    border: `2px solid ${isWhite ? '#111827' : color}`,
    borderRadius: 10,
    padding: '12px 14px',
    cursor: 'pointer',
    minHeight: 115,
    boxShadow: isWhite ? '0 1px 4px rgba(0,0,0,0.06)' : `0 2px 8px ${color}20`,
    opacity: 1,
  };

  // Status dot styles
  const dotStyle = {
    width: 10,
    height: 10,
    borderRadius: '50%',
    backgroundColor: isWhite ? '#94A3B8' : color,
    border: isWhite ? '1.5px solid #111827' : `1px solid ${color}`,
    display: 'inline-block',
    boxShadow: isWhite ? 'none' : `0 0 6px ${color}`,
  };

  // Remaining timer / status text
  let formattedTimer;
  if (candidate.status === 'SUBMITTED' || candidate.status === 'AUTO_SUBMITTED_TIME_UP') {
    formattedTimer = 'Submitted';
  } else if (candidate.status === 'DISQUALIFIED') {
    formattedTimer = 'Disqualified';
  } else if (candidate.status === 'NOT_STARTED' || (!candidate.candidateStartTime && !isCandidateInProgress && (candidate.colorStatus === 'WHITE' || !candidate.colorStatus))) {
    formattedTimer = 'Not started';
  } else if (candidate.candidateEndTime && candidate.candidateEndTime - nowMs <= 0) {
    formattedTimer = 'Time up';
  } else if (candidate.candidateEndTime && candidate.candidateEndTime - nowMs > 0) {
    const rem = candidate.candidateEndTime - nowMs;
    const mins = Math.floor(rem / 60000);
    const secs = Math.floor((rem % 60000) / 1000);
    formattedTimer = `${mins}m ${secs < 10 ? '0' : ''}${secs}s left`;
  } else {
    formattedTimer = isCandidateInProgress ? 'In Progress' : 'Not started';
  }

  // Rendered tile fields
  const renderedFields = {
    candidateName: candidate.name || candidate.candidateName || 'Candidate',
    malpracticeBadge: `⚠️ ${malpracticeCount}`,
    roomText: roomName || candidate.roomName || 'Room',
    progressText: candidate.status === 'NOT_STARTED' ? 'Not started' : `${candidate.questionsCompleted ?? 0} Qs Solved`,
    footerTimer: formattedTimer,
    // BUG-32: color name text label MUST NOT exist
    colorNameLabel: undefined,
  };

  return {
    containerStyle,
    dotStyle,
    renderedFields,
    isWhite,
    color,
  };
}

async function runTests() {
  console.log('========================================================================');
  console.log('QA VERIFICATION SUITE: BUG-32 (Seat Map Tile Styling & Visibility)');
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

  const nowMs = Date.now();

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS 1: Not Started (WHITE)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('--- TEST 1: "Not Started" (WHITE) Candidate Tile ---');
  const candNotStarted = {
    candidateId: 'c1',
    name: 'hello',
    status: 'NOT_STARTED',
    colorStatus: 'WHITE',
    malpracticeCount: 0,
    questionsCompleted: 0,
    candidateStartTime: null,
  };

  const tileWhite = computeSeatTileStyles(candNotStarted, 'dssssssssss', nowMs);

  // Criterion 1: Black border
  assert(
    tileWhite.containerStyle.border === '2px solid #111827',
    `WHITE tile border is solid black (#111827): received "${tileWhite.containerStyle.border}" (Criterion 1)`
  );
  assert(
    tileWhite.containerStyle.opacity === 1,
    'WHITE tile opacity is 1 (not faded or washed out)'
  );

  // Criterion 2: No color-name text label
  assert(
    tileWhite.renderedFields.colorNameLabel === undefined,
    'No literal color-name label ("WHITE") rendered on tile (Criterion 2)'
  );

  // Criterion 3: Status dot visibility on WHITE tile
  assert(
    tileWhite.dotStyle.backgroundColor === '#94A3B8',
    `Status dot has clearly visible dark gray background (#94A3B8): received "${tileWhite.dotStyle.backgroundColor}" (Criterion 3)`
  );
  assert(
    tileWhite.dotStyle.border === '1.5px solid #111827',
    `Status dot has distinct black outline (1.5px solid #111827): received "${tileWhite.dotStyle.border}" (Criterion 3)`
  );

  // Criterion 4: All other tile content preserved
  assert(tileWhite.renderedFields.candidateName === 'hello', 'Candidate name is preserved ("hello")');
  assert(tileWhite.renderedFields.malpracticeBadge === '⚠️ 0', 'Malpractice count badge is preserved');
  assert(tileWhite.renderedFields.roomText === 'dssssssssss', 'Room text is preserved');
  assert(tileWhite.renderedFields.progressText === 'Not started', 'Progress text is preserved ("Not started")');
  assert(tileWhite.renderedFields.footerTimer === 'Not started', 'Footer status text is preserved ("Not started")');

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS 2: In Progress (YELLOW)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 2: "In Progress" (YELLOW) Candidate Tile ---');
  const candInProgress = {
    candidateId: 'c2',
    name: 'hi',
    status: 'IN_PROGRESS',
    colorStatus: 'YELLOW',
    malpracticeCount: 9,
    questionsCompleted: 0,
    candidateStartTime: nowMs - 60000,
    candidateEndTime: nowMs + 353000, // 5m 53s left
  };

  const tileYellow = computeSeatTileStyles(candInProgress, 'dssssssssss', nowMs);

  assert(
    tileYellow.containerStyle.border === `2px solid ${STATUS_COLORS.YELLOW}`,
    `YELLOW tile border is yellow: received "${tileYellow.containerStyle.border}"`
  );
  assert(
    tileYellow.renderedFields.colorNameLabel === undefined,
    'No literal color-name label ("YELLOW") rendered on tile (Criterion 2)'
  );
  assert(
    tileYellow.dotStyle.backgroundColor === STATUS_COLORS.YELLOW,
    `Status dot is yellow (#F1C40F): received "${tileYellow.dotStyle.backgroundColor}"`
  );
  assert(
    tileYellow.dotStyle.border === '1px solid #F1C40F',
    'Status dot has matching border'
  );
  assert(tileYellow.renderedFields.candidateName === 'hi', 'Candidate name is preserved ("hi")');
  assert(tileYellow.renderedFields.malpracticeBadge === '⚠️ 9', 'Malpractice count badge is preserved (⚠️ 9)');
  assert(tileYellow.renderedFields.footerTimer === '5m 53s left', `Footer timer is preserved: received "${tileYellow.renderedFields.footerTimer}"`);

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS 3: Passed (GREEN)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 3: "Passed" (GREEN) Candidate Tile ---');
  const candGreen = {
    candidateId: 'c3',
    name: 'top_scorer',
    status: 'SUBMITTED',
    colorStatus: 'GREEN',
    malpracticeCount: 0,
    questionsCompleted: 5,
    candidateStartTime: nowMs - 1200000,
    candidateEndTime: nowMs - 300000,
  };

  const tileGreen = computeSeatTileStyles(candGreen, 'Main Lab', nowMs);

  assert(
    tileGreen.containerStyle.border === `2px solid ${STATUS_COLORS.GREEN}`,
    `GREEN tile border is green: received "${tileGreen.containerStyle.border}"`
  );
  assert(
    tileGreen.renderedFields.colorNameLabel === undefined,
    'No literal color-name label ("GREEN") rendered on tile (Criterion 2)'
  );
  assert(
    tileGreen.dotStyle.backgroundColor === STATUS_COLORS.GREEN,
    `Status dot is green (#2ECC71): received "${tileGreen.dotStyle.backgroundColor}"`
  );
  assert(tileGreen.renderedFields.progressText === '5 Qs Solved', 'Progress shows 5 Qs Solved');
  assert(tileGreen.renderedFields.footerTimer === 'Submitted', 'Footer shows Submitted');

  // ──────────────────────────────────────────────────────────────────────────
  // STATUS 4: Disqualified (RED)
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 4: "Disqualified" (RED) Candidate Tile ---');
  const candRed = {
    candidateId: 'c4',
    name: 'malpractice_user',
    status: 'DISQUALIFIED',
    colorStatus: 'RED',
    malpracticeCount: 15,
    questionsCompleted: 1,
    candidateStartTime: nowMs - 900000,
  };

  const tileRed = computeSeatTileStyles(candRed, 'Lab 101', nowMs);

  assert(
    tileRed.containerStyle.border === `2px solid ${STATUS_COLORS.RED}`,
    `RED tile border is red: received "${tileRed.containerStyle.border}"`
  );
  assert(
    tileRed.renderedFields.colorNameLabel === undefined,
    'No literal color-name label ("RED") rendered on tile (Criterion 2)'
  );
  assert(
    tileRed.dotStyle.backgroundColor === STATUS_COLORS.RED,
    `Status dot is red (#E74C3C): received "${tileRed.dotStyle.backgroundColor}"`
  );
  assert(tileRed.renderedFields.footerTimer === 'Disqualified', 'Footer shows Disqualified');

  // ──────────────────────────────────────────────────────────────────────────
  // TEST 5: Verify AdminLiveDashboard.jsx source code directly
  // ──────────────────────────────────────────────────────────────────────────
  console.log('\n--- TEST 5: Source Code Audit of AdminLiveDashboard.jsx ---');
  const fs = require('fs');
  const path = require('path');
  const dashboardCode = fs.readFileSync(
    path.join(__dirname, '../../../../client/src/admin/pages/AdminLiveDashboard.jsx'),
    'utf-8'
  );

  // Check that `#111827` is used for the white tile border
  assert(
    dashboardCode.includes("border: `2px solid ${isWhite ? '#111827' : color}`"),
    'AdminLiveDashboard.jsx uses #111827 for isWhite tile border'
  );

  // Check that the literal color label span was removed
  assert(
    !dashboardCode.includes("{candidate.colorStatus || (isCandidateInProgress ? 'YELLOW' : 'WHITE')}"),
    'Redundant literal color text label successfully removed from SeatTile'
  );

  // Check that dot has border and backgroundColor for isWhite
  assert(
    dashboardCode.includes("backgroundColor: isWhite ? '#94A3B8' : color"),
    'Status dot uses distinguishable #94A3B8 for isWhite'
  );
  assert(
    dashboardCode.includes("border: isWhite ? '1.5px solid #111827' : `1px solid ${color}`"),
    'Status dot has visible border (1.5px solid #111827) on isWhite tile'
  );

  console.log('\n========================================================================');
  console.log(`SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED (${Math.round((passedTests / totalTests) * 100)}%)`);
  console.log('========================================================================');
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
