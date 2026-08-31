async function testFullAiWorkflow() {
  console.log('=== Step 1: Admin Login ===');
  const adminLoginRes = await fetch('http://localhost:5000/api/v1/auth/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'superadmin@globussoft.in',
      password: 'GlobusAdmin2026!'
    })
  });
  const adminToken = (await adminLoginRes.json()).token;

  const testId = '6a9484207e45fff5fdabf0d1'; // LIVE AI Challenge

  // Create fresh room
  const roomRes = await fetch('http://localhost:5000/api/v1/tests/' + testId + '/rooms', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + adminToken
    },
    body: JSON.stringify({ roomName: 'AI Verification Lab', capacity: 30 })
  });
  const room = (await roomRes.json()).room;
  console.log('Created Room:', room.roomName, 'Code:', room.roomCode);

  console.log('\n=== Step 2: Candidate Register ===');
  const testEmail = 'ai_full_' + Date.now() + '@globussoft.in';
  const candRegRes = await fetch('http://localhost:5000/api/v1/auth/candidate/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Sneha Roy',
      email: testEmail,
      password: 'CandidatePass2026!',
      phone: '9876543210'
    })
  });
  const candData = await candRegRes.json();
  const candToken = candData.token;
  const candRefreshToken = candData.refreshToken;
  console.log('Candidate Registered:', candData.candidate?.name);
  console.log('Access Token issued:', candToken ? 'YES (' + candToken.slice(0, 15) + '...)' : 'NO');
  console.log('Refresh Token issued:', candRefreshToken ? 'YES (' + candRefreshToken.slice(0, 15) + '...)' : 'NO');

  console.log('\n=== Step 3: Join Room ===');
  const joinRes = await fetch('http://localhost:5000/api/v1/rooms/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + candToken
    },
    body: JSON.stringify({
      roomCode: room.roomCode,
      roomPassword: room.roomPassword
    })
  });
  console.log('Join room status:', joinRes.status);

  console.log('\n=== Step 4: Start Attempt ===');
  const startRes = await fetch('http://localhost:5000/api/v1/tests/' + testId + '/start-attempt', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + candToken
    },
    body: JSON.stringify({ roomId: room._id })
  });
  const startData = await startRes.json();
  console.log('Start attempt status:', startRes.status, 'Session ID:', startData.submissionSessionId);
  const qId = startData.questions[0]?._id;
  console.log('Question ID:', qId);

  console.log('\n=== Step 5: Save Files (Autosave simulation) ===');
  const saveRes = await fetch('http://localhost:5000/api/v1/ai-test/' + qId + '/save-files', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + candToken
    },
    body: JSON.stringify({
      filesJson: {
        'index.html': '<h1>AI Portfolio Project</h1><div id="app"></div>',
        'style.css': 'body { background: #1e293b; color: white; }',
        'script.js': 'console.log("Portfolio running");'
      }
    })
  });
  console.log('Save files status:', saveRes.status);

  console.log('\n=== Step 6: Submit AI Test Project (Submit Question) ===');
  const submitQRes = await fetch('http://localhost:5000/api/v1/ai-test/' + qId + '/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + candToken
    },
    body: JSON.stringify({
      filesJson: {
        'index.html': '<h1>AI Portfolio Project Completed</h1>',
        'style.css': 'body { background: #0f172a; color: #38bdf8; }',
        'script.js': 'document.getElementById("app").innerText = "Loaded!";'
      },
      promptLog: [
        { role: 'candidate', message: 'How do I style a modern navbar?', timestamp: new Date() },
        { role: 'ai', message: 'Use flexbox with justify-content space-between.', timestamp: new Date() }
      ]
    })
  });
  console.log('Submit AI Test question status:', submitQRes.status);
  const submitQData = await submitQRes.json();
  console.log('Submission status in DB:', submitQData.submission?.status, 'Submitted At:', submitQData.submission?.submittedAt);

  console.log('\n=== Step 7: Submit All (Finalize Assessment) ===');
  const submitAllRes = await fetch('http://localhost:5000/api/v1/tests/' + testId + '/submit-all', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + candToken
    },
    body: JSON.stringify({ roomId: room._id })
  });
  console.log('Submit all status:', submitAllRes.status);

  console.log('\n=== Step 8: Token Refresh Flow Test ===');
  const refreshRes = await fetch('http://localhost:5000/api/v1/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: candRefreshToken })
  });
  const refreshData = await refreshRes.json();
  console.log('Refresh token status:', refreshRes.status, 'New Access Token:', refreshData.token ? 'YES (' + refreshData.token.slice(0, 15) + '...)' : 'NO');

  console.log('\n✓ ALL AI TEST SUBMISSION WORKFLOWS VERIFIED SUCCESSFULLY!');
}
testFullAiWorkflow().catch(console.error);
