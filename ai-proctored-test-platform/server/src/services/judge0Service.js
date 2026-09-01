// Judge0 Service — Module 3
// Handles code execution requests to the self-hosted Judge0 instance
// Judge0 API documentation: https://judge0.com/
// Per PRD Section 5 & 9.5: ALL code execution runs strictly through sandboxed Judge0 instances
const fetch = require('node-fetch');

// Language ID mapping for Judge0 (standard IDs from Judge0 documentation)
const LANGUAGE_IDS = {
  python: 71,       // Python 3
  java: 62,         // Java (OpenJDK 13.0.1)
  cpp: 54,          // C++ (GCC 9.2.0)
  c: 50,            // C (GCC 9.2.0)
  javascript: 63,   // JavaScript (Node.js 12.14.0)
  react: 63,        // React uses JavaScript/Node for evaluation
};

const getJudge0BaseUrl = () => {
  return (process.env.JUDGE0_API_URL || 'http://localhost:2358').replace(/\/+$/, '');
};

const JUDGE0_API_KEY = process.env.JUDGE0_API_KEY || '';

/**
 * Submit a single code execution to Judge0 and wait for result.
 * Strictly routes through Judge0 API — no local shell execution fallback.
 * @param {string} code - Source code
 * @param {string} language - Language name (python, java, cpp, etc.)
 * @param {string} stdin - Standard input
 * @param {string} expectedOutput - Expected stdout for comparison
 * @returns {Object} Judge0 result object
 */
const executeCode = async (code, language, stdin = '', expectedOutput = '') => {
  const languageId = LANGUAGE_IDS[language];
  if (!languageId) {
    return {
      stdout: null,
      stderr: `Unsupported language: ${language}`,
      status: { id: 13, description: 'Unsupported Language' },
    };
  }

  const primaryUrl = getJudge0BaseUrl();
  const headers = {
    'Content-Type': 'application/json',
    ...(JUDGE0_API_KEY && { 'X-Auth-Token': JUDGE0_API_KEY }),
  };

  const payload = JSON.stringify({
    language_id: languageId,
    source_code: code,
    stdin: stdin || '',
    expected_output: expectedOutput || undefined,
    cpu_time_limit: 5,
    memory_limit: 256 * 1024,
  });

  const sendToJudge0 = async (baseUrl) => {
    const url = `${baseUrl}/submissions?base64_encoded=false&wait=true`;
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: payload,
      timeout: 12000,
    });
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Judge0 responded with HTTP ${response.status}: ${errText}`);
    }
    return await response.json();
  };

  try {
    try {
      return await sendToJudge0(primaryUrl);
    } catch (primaryErr) {
      // If primary URL failed (e.g. ENOTFOUND judge0 when running server outside docker container), try localhost:2358
      if (!primaryUrl.includes('localhost') && !primaryUrl.includes('127.0.0.1')) {
        console.debug('[Judge0] Primary URL failed (' + primaryErr.message + '), trying http://localhost:2358 fallback...');
        return await sendToJudge0('http://localhost:2358');
      }
      throw primaryErr;
    }
  } catch (err) {
    console.error('[Judge0] Code execution request failed:', err.message);
    return {
      stdout: null,
      stderr: `Judge0 execution service unavailable: ${err.message}. Please verify the Judge0 container is running.`,
      status: { id: 13, description: 'Service Unavailable' },
    };
  }
};

/**
 * Run code against an array of test cases.
 * @param {string} code
 * @param {string} language
 * @param {Array<{input: string, expectedOutput: string}>} testCases
 * @returns {Array} Array of Judge0 result objects
 */
const runAgainstTestCases = async (code, language, testCases) => {
  if (!testCases || testCases.length === 0) {
    return [];
  }

  const CONCURRENCY = 5;
  const results = [];
  for (let i = 0; i < testCases.length; i += CONCURRENCY) {
    const batch = testCases.slice(i, i + CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map((tc) => executeCode(code, language, tc.input || '', tc.expectedOutput || ''))
    );
    results.push(...batchResults);
  }
  return results;
};

module.exports = { executeCode, runAgainstTestCases, LANGUAGE_IDS };
