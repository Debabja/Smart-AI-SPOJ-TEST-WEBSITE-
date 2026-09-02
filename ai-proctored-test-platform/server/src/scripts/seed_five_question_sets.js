// seed_five_question_sets.js — Creates 5 question sets with 5 questions each, and ensures all tests have 5 questions
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Admin = require('../models/Admin');
const QuestionSet = require('../models/QuestionSet');
const Question = require('../models/Question');
const Test = require('../models/Test');

const QUESTION_SETS_DATA = [
  {
    name: 'JavaScript Core & Problem Solving',
    testType: 'JAVASCRIPT',
    questions: [
      {
        title: 'Reverse a String',
        difficulty: 'EASY',
        description: 'Given a string S from standard input, write a function or program to reverse the string and print it to standard output.',
        inputFormat: 'A single line containing the string S.',
        outputFormat: 'A single line containing the reversed string.',
        constraints: '1 <= |S| <= 1000',
        visibleTestCases: [
          { input: 'hello', expectedOutput: 'olleh' },
          { input: 'world', expectedOutput: 'dlrow' }
        ],
        hiddenTestCases: [
          { input: 'antigravity', expectedOutput: 'ytivargitna' },
          { input: 'a', expectedOutput: 'a' },
          { input: '12345', expectedOutput: '54321' }
        ]
      },
      {
        title: 'Palindrome Checker',
        difficulty: 'EASY',
        description: 'Determine if a given string reads the same forwards and backwards. Return or print "true" if it is a palindrome, otherwise "false".',
        inputFormat: 'A single string on standard input.',
        outputFormat: 'Print true or false.',
        constraints: '1 <= |S| <= 10^5, case-sensitive alphabetic characters.',
        visibleTestCases: [
          { input: 'racecar', expectedOutput: 'true' },
          { input: 'hello', expectedOutput: 'false' }
        ],
        hiddenTestCases: [
          { input: 'madam', expectedOutput: 'true' },
          { input: 'noon', expectedOutput: 'true' },
          { input: 'openai', expectedOutput: 'false' }
        ]
      },
      {
        title: 'Two Sum Target Indices',
        difficulty: 'MEDIUM',
        description: 'Given an array of integers and an integer target, find the zero-based indices of the two numbers such that they add up to target. Print the two indices separated by a space in increasing order.',
        inputFormat: 'First line: integer N. Second line: N space-separated integers. Third line: target integer.',
        outputFormat: 'Two space-separated indices: i j',
        constraints: '2 <= N <= 10^4, -10^9 <= nums[i], target <= 10^9',
        visibleTestCases: [
          { input: '4\n2 7 11 15\n9', expectedOutput: '0 1' },
          { input: '3\n3 2 4\n6', expectedOutput: '1 2' }
        ],
        hiddenTestCases: [
          { input: '2\n3 3\n6', expectedOutput: '0 1' },
          { input: '4\n1 5 3 7\n8', expectedOutput: '0 3' }
        ]
      },
      {
        title: 'Factorial of a Number',
        difficulty: 'EASY',
        description: 'Calculate the factorial of a non-negative integer N (N!). Print the resulting integer value.',
        inputFormat: 'A single integer N.',
        outputFormat: 'A single integer representing N!.',
        constraints: '0 <= N <= 12',
        visibleTestCases: [
          { input: '5', expectedOutput: '120' },
          { input: '0', expectedOutput: '1' }
        ],
        hiddenTestCases: [
          { input: '1', expectedOutput: '1' },
          { input: '6', expectedOutput: '720' },
          { input: '10', expectedOutput: '3628800' }
        ]
      },
      {
        title: 'FizzBuzz Sequence',
        difficulty: 'EASY',
        description: 'For numbers from 1 to N, print "FizzBuzz" if divisible by 3 and 5, "Fizz" if divisible by 3, "Buzz" if divisible by 5, or the number itself. Output all space-separated on a single line.',
        inputFormat: 'A single integer N.',
        outputFormat: 'Space-separated sequence of tokens.',
        constraints: '1 <= N <= 100',
        visibleTestCases: [
          { input: '5', expectedOutput: '1 2 Fizz 4 Buzz' },
          { input: '3', expectedOutput: '1 2 Fizz' }
        ],
        hiddenTestCases: [
          { input: '1', expectedOutput: '1' },
          { input: '15', expectedOutput: '1 2 Fizz 4 Buzz Fizz 7 8 Fizz Buzz 11 Fizz 13 14 FizzBuzz' }
        ]
      }
    ]
  },
  {
    name: 'SPOJ - Data Structures & Algorithms',
    testType: 'SPOJ',
    questions: [
      {
        title: 'Maximum Subarray Sum (Kadane)',
        difficulty: 'MEDIUM',
        description: 'Find the maximum sum of a non-empty contiguous subarray within a given one-dimensional array of numbers.',
        inputFormat: 'Line 1: integer N. Line 2: N space-separated integers.',
        outputFormat: 'The maximum contiguous subarray sum.',
        constraints: '1 <= N <= 10^5, -10^4 <= nums[i] <= 10^4',
        visibleTestCases: [
          { input: '9\n-2 1 -3 4 -1 2 1 -5 4', expectedOutput: '6' },
          { input: '1\n1', expectedOutput: '1' }
        ],
        hiddenTestCases: [
          { input: '5\n5 4 -1 7 8', expectedOutput: '24' },
          { input: '3\n-1 -2 -3', expectedOutput: '-1' }
        ]
      },
      {
        title: 'Binary Search in Sorted Array',
        difficulty: 'EASY',
        description: 'Given a sorted array of distinct integers and a target value, return the 0-based index of the target if found, or -1 if not found.',
        inputFormat: 'Line 1: integer N. Line 2: N space-separated integers. Line 3: target integer.',
        outputFormat: 'Index of target or -1.',
        constraints: '1 <= N <= 10^5, elements in strictly ascending order.',
        visibleTestCases: [
          { input: '5\n1 3 5 7 9\n5', expectedOutput: '2' },
          { input: '5\n1 3 5 7 9\n2', expectedOutput: '-1' }
        ],
        hiddenTestCases: [
          { input: '1\n10\n10', expectedOutput: '0' },
          { input: '4\n2 4 6 8\n8', expectedOutput: '3' }
        ]
      },
      {
        title: 'Balanced Parentheses Validation',
        difficulty: 'MEDIUM',
        description: 'Given a string containing just the characters "(", ")", "{", "}", "[" and "]", determine if the input string is valid. Output YES if valid, NO otherwise.',
        inputFormat: 'A single string consisting of bracket characters.',
        outputFormat: 'YES or NO.',
        constraints: '1 <= |S| <= 10^4',
        visibleTestCases: [
          { input: '{[()]}', expectedOutput: 'YES' },
          { input: '{[(])}', expectedOutput: 'NO' }
        ],
        hiddenTestCases: [
          { input: '()', expectedOutput: 'YES' },
          { input: '(((', expectedOutput: 'NO' },
          { input: '()[]{}', expectedOutput: 'YES' }
        ]
      },
      {
        title: 'Merge Two Sorted Arrays',
        difficulty: 'EASY',
        description: 'Given two sorted integer arrays, merge them into a single sorted array and print the elements space-separated.',
        inputFormat: 'Line 1: size N. Line 2: N integers. Line 3: size M. Line 4: M integers.',
        outputFormat: 'Space-separated merged sorted sequence.',
        constraints: '1 <= N, M <= 10^4',
        visibleTestCases: [
          { input: '3\n1 3 5\n3\n2 4 6', expectedOutput: '1 2 3 4 5 6' },
          { input: '1\n2\n1\n1', expectedOutput: '1 2' }
        ],
        hiddenTestCases: [
          { input: '2\n5 10\n1\n3', expectedOutput: '3 5 10' }
        ]
      },
      {
        title: 'Kth Largest Element in Array',
        difficulty: 'MEDIUM',
        description: 'Given an integer array nums and an integer k, return the kth largest element in the array.',
        inputFormat: 'Line 1: integer N. Line 2: N space-separated integers. Line 3: integer k.',
        outputFormat: 'The kth largest element.',
        constraints: '1 <= k <= N <= 10^4, -10^4 <= nums[i] <= 10^4',
        visibleTestCases: [
          { input: '6\n3 2 1 5 6 4\n2', expectedOutput: '5' },
          { input: '4\n7 10 4 20\n3', expectedOutput: '7' }
        ],
        hiddenTestCases: [
          { input: '1\n1\n1', expectedOutput: '1' },
          { input: '5\n9 3 2 4 8\n1', expectedOutput: '9' }
        ]
      }
    ]
  },
  {
    name: 'React.js Component Architecture & State',
    testType: 'REACT',
    questions: [
      {
        title: 'Counter State Reducer',
        difficulty: 'EASY',
        description: 'Implement a reducer that takes an initial state and applies a list of commands: INCREMENT X, DECREMENT X, or RESET. Print the final counter value.',
        inputFormat: 'Line 1: initial value. Subsequent lines: action command string. Last line: END.',
        outputFormat: 'Final integer state.',
        constraints: 'Actions <= 100, numbers fit within 32-bit integer.',
        visibleTestCases: [
          { input: '0\nINCREMENT 1\nINCREMENT 2\nEND', expectedOutput: '3' },
          { input: '5\nDECREMENT 2\nRESET\nEND', expectedOutput: '0' }
        ],
        hiddenTestCases: [
          { input: '100\nDECREMENT 50\nINCREMENT 25\nEND', expectedOutput: '75' }
        ]
      },
      {
        title: 'Filterable Items State Logic',
        difficulty: 'MEDIUM',
        description: 'Given a list of items with Name and Category, filter the list by an active category and a case-insensitive name substring. Print matched names separated by comma and space, or "None" if empty.',
        inputFormat: 'Line 1: N. Next N lines: Name Category. Next line: ActiveCategory. Next line: SearchQuery.',
        outputFormat: 'Comma-separated matched item names or None.',
        constraints: '1 <= N <= 50',
        visibleTestCases: [
          { input: '2\nDog Animal\nCat Animal\nAnimal\nca', expectedOutput: 'Cat' },
          { input: '2\nPen Stationery\nPencil Stationery\nStationery\npen', expectedOutput: 'Pen, Pencil' }
        ],
        hiddenTestCases: [
          { input: '1\nRose Flower\nFlower\nz', expectedOutput: 'None' }
        ]
      },
      {
        title: 'Pagination Calculation Helper',
        difficulty: 'EASY',
        description: 'Given totalItems, pageSize, and currentPage (1-indexed), calculate totalPages, startIndex, endIndex (exclusive), hasPrev (true/false), and hasNext (true/false).',
        inputFormat: 'Three space-separated integers: totalItems pageSize currentPage',
        outputFormat: 'startIndex endIndex totalPages hasPrev hasNext',
        constraints: '0 <= totalItems <= 10^5, 1 <= pageSize <= 100, 1 <= currentPage',
        visibleTestCases: [
          { input: '25 10 2', expectedOutput: '10 20 3 true true' },
          { input: '5 10 1', expectedOutput: '0 5 1 false false' }
        ],
        hiddenTestCases: [
          { input: '50 10 5', expectedOutput: '40 50 5 true false' }
        ]
      },
      {
        title: 'Toggle Set State Manager',
        difficulty: 'MEDIUM',
        description: 'Simulate a multi-selection state that supports TOGGLE id (adds if missing, removes if present) and CLEAR. Output sorted remaining IDs separated by space, or "empty".',
        inputFormat: 'Sequence of lines with commands. Ends with END.',
        outputFormat: 'Space-separated list of IDs or empty.',
        constraints: 'Operations <= 50',
        visibleTestCases: [
          { input: 'TOGGLE 1\nTOGGLE 2\nTOGGLE 1\nEND', expectedOutput: '2' },
          { input: 'TOGGLE 5\nTOGGLE 5\nEND', expectedOutput: 'empty' }
        ],
        hiddenTestCases: [
          { input: 'TOGGLE 10\nTOGGLE 20\nCLEAR\nEND', expectedOutput: 'empty' }
        ]
      },
      {
        title: 'Form Validation Engine',
        difficulty: 'MEDIUM',
        description: 'Validate form fields: email must contain "@" and ".", password length must be >= 8, age must be >= 18. Output VALID if all pass, or first failing rule: INVALID_EMAIL, INVALID_PASSWORD, INVALID_AGE.',
        inputFormat: 'Space-separated: email password age',
        outputFormat: 'VALID or error code.',
        constraints: 'Single line of input.',
        visibleTestCases: [
          { input: 'test@example.com Secret123 25', expectedOutput: 'VALID' },
          { input: 'bademail Secret123 25', expectedOutput: 'INVALID_EMAIL' }
        ],
        hiddenTestCases: [
          { input: 'user@domain.com short 20', expectedOutput: 'INVALID_PASSWORD' },
          { input: 'user@domain.com Pass1234 15', expectedOutput: 'INVALID_AGE' }
        ]
      }
    ]
  },
  {
    name: 'Advanced JavaScript & Async Systems',
    testType: 'JAVASCRIPT',
    questions: [
      {
        title: 'Flatten Nested JSON Array',
        difficulty: 'MEDIUM',
        description: 'Given a JSON string representing a multi-dimensional nested array, flatten all elements into a single-dimensional array and print them comma-separated.',
        inputFormat: 'A single JSON string: e.g. [1,[2,[3,[4]],5]]',
        outputFormat: 'Comma-separated values.',
        constraints: 'N <= 100 elements, arbitrary depth.',
        visibleTestCases: [
          { input: '[1,[2,3],[4,[5]]]', expectedOutput: '1,2,3,4,5' },
          { input: '[1,2,3]', expectedOutput: '1,2,3' }
        ],
        hiddenTestCases: [
          { input: '[[[1]]]', expectedOutput: '1' },
          { input: '[10,[20,[30]]]', expectedOutput: '10,20,30' }
        ]
      },
      {
        title: 'Deep Object Property Getter',
        difficulty: 'MEDIUM',
        description: 'Given a dot-separated property path and a JSON object string, safely navigate the path and print the value, or "undefined" if path does not exist.',
        inputFormat: 'Line 1: dot-separated path (e.g. a.b.c). Line 2: JSON string.',
        outputFormat: 'The stringified value or undefined.',
        constraints: 'Valid JSON string.',
        visibleTestCases: [
          { input: 'user.profile.name\n{"user":{"profile":{"name":"Alice"}}}', expectedOutput: 'Alice' },
          { input: 'a.b.c\n{"a":{"b":{"c":"found"}}}', expectedOutput: 'found' }
        ],
        hiddenTestCases: [
          { input: 'x.y.z\n{"x":{"y":null}}', expectedOutput: 'undefined' }
        ]
      },
      {
        title: 'Debounce Call Counter',
        difficulty: 'EASY',
        description: 'Simulate a debounce mechanism: given call timestamps and a delay threshold, determine how many executions actually run.',
        inputFormat: 'Space-separated integers: N delay, followed by N call timestamps.',
        outputFormat: 'Integer number of actual executions.',
        constraints: '1 <= N <= 100',
        visibleTestCases: [
          { input: '3 50\n10 30 50', expectedOutput: '1' },
          { input: '2 50\n10 100', expectedOutput: '2' }
        ],
        hiddenTestCases: [
          { input: '1 50\n10', expectedOutput: '1' }
        ]
      },
      {
        title: 'String Compression (RLE)',
        difficulty: 'MEDIUM',
        description: 'Perform basic string compression using the counts of repeated characters. E.g. "aabcccccaaa" -> "a2b1c5a3". If compressed string is not shorter than original, print original.',
        inputFormat: 'A single string of lowercase letters.',
        outputFormat: 'Compressed string or original string.',
        constraints: '1 <= |S| <= 1000',
        visibleTestCases: [
          { input: 'aabcccccaaa', expectedOutput: 'a2b1c5a3' },
          { input: 'abc', expectedOutput: 'abc' }
        ],
        hiddenTestCases: [
          { input: 'aaaa', expectedOutput: 'a4' },
          { input: 'aabbcc', expectedOutput: 'aabbcc' }
        ]
      },
      {
        title: 'Group Anagrams Count',
        difficulty: 'MEDIUM',
        description: 'Given a list of words, determine the number of distinct anagram groups.',
        inputFormat: 'Space-separated words on a single line.',
        outputFormat: 'Number of anagram groups.',
        constraints: '1 <= words <= 100',
        visibleTestCases: [
          { input: 'eat tea tan ate nat bat', expectedOutput: '3' },
          { input: 'a', expectedOutput: '1' }
        ],
        hiddenTestCases: [
          { input: 'ab ba cd dc ef', expectedOutput: '3' }
        ]
      }
    ]
  },
  {
    name: 'SPOJ - Dynamic Programming Mastery',
    testType: 'SPOJ',
    questions: [
      {
        title: 'Coin Change Minimum Coins',
        difficulty: 'MEDIUM',
        description: 'You are given an integer array coins representing coins of different denominations and an integer amount. Return the fewest number of coins needed to make up that amount. If impossible, return -1.',
        inputFormat: 'Line 1: integer N. Line 2: N coin values. Line 3: target amount.',
        outputFormat: 'Minimum coins or -1.',
        constraints: '1 <= coins.length <= 12, 1 <= coins[i] <= 10^4, 0 <= amount <= 10^4',
        visibleTestCases: [
          { input: '3\n1 2 5\n11', expectedOutput: '3' },
          { input: '1\n2\n3', expectedOutput: '-1' }
        ],
        hiddenTestCases: [
          { input: '1\n1\n0', expectedOutput: '0' },
          { input: '3\n1 5 10\n18', expectedOutput: '5' }
        ]
      },
      {
        title: 'Longest Increasing Subsequence Length',
        difficulty: 'MEDIUM',
        description: 'Given an integer array nums, return the length of the longest strictly increasing subsequence.',
        inputFormat: 'Line 1: integer N. Line 2: N space-separated integers.',
        outputFormat: 'Length of the longest strictly increasing subsequence.',
        constraints: '1 <= N <= 2500, -10^4 <= nums[i] <= 10^4',
        visibleTestCases: [
          { input: '8\n10 9 2 5 3 7 101 18', expectedOutput: '4' },
          { input: '6\n0 1 0 3 2 3', expectedOutput: '4' }
        ],
        hiddenTestCases: [
          { input: '4\n7 7 7 7', expectedOutput: '1' },
          { input: '5\n1 2 3 4 5', expectedOutput: '5' }
        ]
      },
      {
        title: '0/1 Knapsack Problem',
        difficulty: 'HARD',
        description: 'Given N items, each with a weight and a value, determine the maximum value that can fit into a knapsack of capacity W.',
        inputFormat: 'Line 1: N W. Line 2: N values. Line 3: N weights.',
        outputFormat: 'Maximum total value.',
        constraints: '1 <= N <= 100, 1 <= W <= 1000',
        visibleTestCases: [
          { input: '3 50\n60 100 120\n10 20 30', expectedOutput: '220' },
          { input: '1 10\n50\n20', expectedOutput: '0' }
        ],
        hiddenTestCases: [
          { input: '2 15\n10 20\n5 10', expectedOutput: '30' }
        ]
      },
      {
        title: 'Word Break Verification',
        difficulty: 'MEDIUM',
        description: 'Given a string s and a dictionary of words dict, return YES if s can be segmented into a space-separated sequence of dictionary words, otherwise NO.',
        inputFormat: 'Line 1: string s. Line 2: integer K. Line 3: K space-separated words.',
        outputFormat: 'YES or NO.',
        constraints: '1 <= |s| <= 300, 1 <= K <= 100',
        visibleTestCases: [
          { input: 'leetcode\n2\nleet code', expectedOutput: 'YES' },
          { input: 'catsandog\n3\ncats dog sand', expectedOutput: 'NO' }
        ],
        hiddenTestCases: [
          { input: 'applepenapple\n2\napple pen', expectedOutput: 'YES' }
        ]
      },
      {
        title: 'Minimum Edit Distance',
        difficulty: 'HARD',
        description: 'Given two strings word1 and word2, return the minimum number of operations (insert, delete, replace) required to convert word1 to word2.',
        inputFormat: 'Line 1: word1. Line 2: word2.',
        outputFormat: 'Minimum edit distance integer.',
        constraints: '0 <= |word1|, |word2| <= 500',
        visibleTestCases: [
          { input: 'horse\nros', expectedOutput: '3' },
          { input: 'intention\nexecution', expectedOutput: '5' }
        ],
        hiddenTestCases: [
          { input: 'abc\nabc', expectedOutput: '0' },
          { input: 'a\nb', expectedOutput: '1' }
        ]
      }
    ]
  }
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-proctored-test');
  console.log('[Seed] Connected to MongoDB');

  const admin = await Admin.findOne({ role: 'SUPER_ADMIN' }) || await Admin.findOne();
  if (!admin) {
    console.error('[Seed] No admin account found. Cannot set createdBy.');
    process.exit(1);
  }
  console.log(`[Seed] Using Admin: ${admin.name} (${admin._id})`);

  const createdQuestionSets = [];

  // 1. Create or update the 5 Question Sets with exactly 5 questions each
  for (const setData of QUESTION_SETS_DATA) {
    let qSet = await QuestionSet.findOne({ name: setData.name });
    if (!qSet) {
      qSet = new QuestionSet({
        name: setData.name,
        testType: setData.testType,
        createdBy: admin._id,
        questionIds: [],
      });
      await qSet.save();
      console.log(`[Seed] Created QuestionSet: "${qSet.name}" (${qSet._id})`);
    } else {
      console.log(`[Seed] Found existing QuestionSet: "${qSet.name}" (${qSet._id})`);
    }

    const questionIds = [];
    for (const qData of setData.questions) {
      let q = await Question.findOne({ questionSetId: qSet._id, title: qData.title });
      if (!q) {
        q = new Question({
          questionSetId: qSet._id,
          testType: setData.testType,
          title: qData.title,
          description: qData.description,
          difficulty: qData.difficulty,
          inputFormat: qData.inputFormat,
          outputFormat: qData.outputFormat,
          constraints: qData.constraints,
          visibleTestCases: qData.visibleTestCases,
          hiddenTestCases: qData.hiddenTestCases,
        });
        await q.save();
        console.log(`  + Created Question: "${q.title}" (${q._id})`);
      } else {
        // Update test cases and fields
        q.description = qData.description;
        q.difficulty = qData.difficulty;
        q.inputFormat = qData.inputFormat;
        q.outputFormat = qData.outputFormat;
        q.constraints = qData.constraints;
        q.visibleTestCases = qData.visibleTestCases;
        q.hiddenTestCases = qData.hiddenTestCases;
        await q.save();
        console.log(`  ~ Updated Question: "${q.title}" (${q._id})`);
      }
      questionIds.push(q._id);
    }

    qSet.questionIds = questionIds;
    await qSet.save();
    console.log(`[Seed] QuestionSet "${qSet.name}" now has ${questionIds.length} questions.`);
    createdQuestionSets.push(qSet);
  }

  // 2. Also ensure existing 'Sample-Set-1' and 'test set 1' have 5 questions
  const sampleSet1 = await QuestionSet.findOne({ name: 'Sample-Set-1' });
  if (sampleSet1) {
    const existingQs = await Question.find({ questionSetId: sampleSet1._id });
    const additionalNeeded = 5 - existingQs.length;
    if (additionalNeeded > 0) {
      const extraQuestions = [
        {
          title: 'Array Chunking',
          difficulty: 'EASY',
          description: 'Given an array and chunk size, divide array into sub-arrays of maximum chunk size.',
          inputFormat: 'Line 1: N size. Line 2: elements.',
          outputFormat: 'Chunked array JSON.',
          visibleTestCases: [{ input: '4 2\n1 2 3 4', expectedOutput: '[[1,2],[3,4]]' }],
          hiddenTestCases: [{ input: '3 2\n1 2 3', expectedOutput: '[[1,2],[3]]' }]
        },
        {
          title: 'Valid Anagram Check',
          difficulty: 'EASY',
          description: 'Determine if two strings are anagrams of each other.',
          inputFormat: 'Line 1: s1. Line 2: s2.',
          outputFormat: 'true or false.',
          visibleTestCases: [{ input: 'anagram\nnagaram', expectedOutput: 'true' }],
          hiddenTestCases: [{ input: 'rat\ncar', expectedOutput: 'false' }]
        },
        {
          title: 'Binary Tree Invert Simulation',
          difficulty: 'MEDIUM',
          description: 'Invert binary tree nodes given as level-order traversal array.',
          inputFormat: 'Space-separated level order values.',
          outputFormat: 'Inverted level order.',
          visibleTestCases: [{ input: '4 2 7 1 3 6 9', expectedOutput: '4 7 2 9 6 3 1' }],
          hiddenTestCases: [{ input: '2 1 3', expectedOutput: '2 3 1' }]
        }
      ];

      for (let i = 0; i < additionalNeeded; i++) {
        const qData = extraQuestions[i];
        const newQ = new Question({
          questionSetId: sampleSet1._id,
          testType: sampleSet1.testType || 'JAVASCRIPT',
          title: qData.title,
          description: qData.description,
          difficulty: qData.difficulty,
          inputFormat: qData.inputFormat,
          outputFormat: qData.outputFormat,
          visibleTestCases: qData.visibleTestCases,
          hiddenTestCases: qData.hiddenTestCases,
        });
        await newQ.save();
        sampleSet1.questionIds.push(newQ._id);
        console.log(`  + Added question "${newQ.title}" to Sample-Set-1`);
      }
      await sampleSet1.save();
    }
  }

  const testSet1 = await QuestionSet.findOne({ name: 'test set 1' });
  if (testSet1 && (!testSet1.questionIds || testSet1.questionIds.length < 5)) {
    const spojSet = createdQuestionSets.find(s => s.testType === 'SPOJ');
    if (spojSet) {
      testSet1.questionIds = spojSet.questionIds;
      await testSet1.save();
      console.log(`[Seed] Linked 5 SPOJ questions to "test set 1".`);
    }
  }

  // 3. Ensure 5 distinct active/live Tests exist, each configured with totalQuestions: 5
  const TEST_TEMPLATES = [
    {
      title: 'JavaScript Core Assessment',
      testType: 'JAVASCRIPT',
      questionSetIndex: 0,
      durationMinutes: 45,
      passingCriteria: 3,
      instructions: 'Complete all 5 coding questions. Write clean, optimal JavaScript code. Handle edge cases and constraints carefully.'
    },
    {
      title: 'SPOJ DSA Core Evaluation',
      testType: 'SPOJ',
      questionSetIndex: 1,
      durationMinutes: 60,
      passingCriteria: 3,
      instructions: '5 Data Structures and Algorithms problems. Standard I/O required. Hidden test cases evaluate edge cases and asymptotic bounds.'
    },
    {
      title: 'React.js Component Architecture Test',
      testType: 'REACT',
      questionSetIndex: 2,
      durationMinutes: 60,
      passingCriteria: 3,
      instructions: 'Demonstrate clean component state logic, lifecycle reducers, and predictable state transitions across 5 questions.'
    },
    {
      title: 'Advanced JavaScript Engineering Test',
      testType: 'JAVASCRIPT',
      questionSetIndex: 3,
      durationMinutes: 45,
      passingCriteria: 3,
      instructions: 'Advanced JavaScript concepts, recursion, deep structure parsing, and performance patterns across 5 questions.'
    },
    {
      title: 'SPOJ Algorithms & DP Challenge',
      testType: 'SPOJ',
      questionSetIndex: 4,
      durationMinutes: 75,
      passingCriteria: 3,
      instructions: '5 algorithmic problem sets including dynamic programming and sequence optimization. Ensure optimal space and time complexity.'
    }
  ];

  for (const tpl of TEST_TEMPLATES) {
    const qSet = createdQuestionSets[tpl.questionSetIndex];
    let test = await Test.findOne({ title: tpl.title });
    if (!test) {
      test = new Test({
        title: tpl.title,
        testType: tpl.testType,
        createdBy: admin._id,
        questionSetId: qSet._id,
        durationMinutes: tpl.durationMinutes,
        totalQuestions: 5,
        passingCriteria: tpl.passingCriteria,
        instructions: tpl.instructions,
        startTestWindowMinutes: 15,
        supportedLanguages: tpl.testType === 'REACT' ? ['javascript', 'react'] : ['python', 'java', 'cpp', 'c', 'javascript'],
        status: 'LIVE'
      });
      await test.save();
      console.log(`[Seed] Created Test: "${test.title}" (${test._id}) with 5 questions`);
    } else {
      test.questionSetId = qSet._id;
      test.totalQuestions = 5;
      test.passingCriteria = tpl.passingCriteria;
      test.durationMinutes = tpl.durationMinutes;
      await test.save();
      console.log(`[Seed] Updated Test: "${test.title}" (${test._id}) to 5 questions`);
    }
  }

  // 4. Update ALL existing tests in database to have totalQuestions: 5
  const allTests = await Test.find();
  for (const t of allTests) {
    if (t.totalQuestions !== 5) {
      t.totalQuestions = 5;
      await t.save();
      console.log(`[Seed] Updated test "${t.title}" totalQuestions to 5`);
    }
  }

  console.log('\n[Seed] SUCCESS! Summary of all Question Sets and Tests:');
  const finalSets = await QuestionSet.find().lean();
  for (const s of finalSets) {
    const qCount = await Question.countDocuments({ questionSetId: s._id });
    console.log(` - QuestionSet: "${s.name}" (${s.testType}) -> ${qCount} questions in DB, questionIds len: ${s.questionIds?.length}`);
  }

  const finalTests = await Test.find().populate('questionSetId').lean();
  console.log(`\nTotal Tests: ${finalTests.length}`);
  for (const t of finalTests) {
    console.log(` - Test: "${t.title}" (${t.testType}) | Status: ${t.status} | Total Qs: ${t.totalQuestions} | Set: "${t.questionSetId?.name}"`);
  }

  await mongoose.disconnect();
  console.log('[Seed] Database disconnected cleanly.');
}

seed().catch(err => {
  console.error('[Seed] Error:', err);
  process.exit(1);
});
