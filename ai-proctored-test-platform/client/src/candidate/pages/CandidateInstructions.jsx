// CandidateInstructions.jsx — show test.instructions before start-attempt
// Explicitly requests and verifies mandatory Webcam AND Microphone permissions before starting (FR-5.2, BUG-08)
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../../services/apiClient';
import globussoftLogo from '../../assets/globussoft-logo.png';
import { setScreenStream } from '../../services/screenStreamManager';

export default function CandidateInstructions() {
  const navigate = useNavigate();
  const [joinData, setJoinData] = useState(null);
  const [webcamGranted, setWebcamGranted] = useState(false);
  const [micGranted, setMicGranted] = useState(false);
  const [screenGranted, setScreenGranted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [requestingPermissions, setRequestingPermissions] = useState(false);
  const [error, setError] = useState('');
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const stored = sessionStorage.getItem('joinData');
    if (!stored) {
      navigate('/candidate/join');
      return;
    }
    setJoinData(JSON.parse(stored));
  }, [navigate]);

  // Clean up media tracks when unmounting
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // Ensure video element receives stream whenever webcamGranted changes
  useEffect(() => {
    if (webcamGranted && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
    }
  }, [webcamGranted]);

  // Ref callback to bind stream immediately on video mount
  const handleVideoRef = (el) => {
    videoRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
    }
  };

  // FR-5.2: Mandatory Webcam, Mic, and Screen Sharing permission check (BUG-08, BUG-13)
  const requestMediaPermissions = async () => {
    setError('');
    setRequestingPermissions(true);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support media access. Please use modern Chrome or Edge.');
      setRequestingPermissions(false);
      return;
    }

    try {
      // 1. Webcam + Microphone access
      let hasVideo = webcamGranted;
      let hasAudio = micGranted;

      if (!webcamGranted || !micGranted) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: true,
        });

        streamRef.current = stream;
        const videoTracks = stream.getVideoTracks();
        const audioTracks = stream.getAudioTracks();

        hasVideo = videoTracks.length > 0 && videoTracks[0].readyState === 'live';
        hasAudio = audioTracks.length > 0 && audioTracks[0].readyState === 'live';

        setWebcamGranted(hasVideo);
        setMicGranted(hasAudio);

        if (videoTracks[0]) {
          videoTracks[0].onended = () => setWebcamGranted(false);
        }
        if (audioTracks[0]) {
          audioTracks[0].onended = () => setMicGranted(false);
        }
      }

      // 2. Screen Sharing access for TAB_SWITCH and FULLSCREEN_EXIT proctoring (BUG-13)
      if (!screenGranted) {
        if (!navigator.mediaDevices.getDisplayMedia) {
          setError('Your browser does not support screen proctoring. Please use Chrome or Edge.');
          return;
        }

        toast('Please select "Entire Screen" in the browser prompt to allow proctoring verification.', {
          icon: '🖥️',
          duration: 5000,
        });

        // Request display media with monitor (Entire Screen) preference and exclude current tab
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
            cursor: 'always',
          },
          audio: false,
          selfBrowserSurface: 'exclude',
          surfaceSwitching: 'include',
          systemAudio: 'exclude',
        });

        const screenTracks = screenStream.getVideoTracks();
        const hasScreen = screenTracks.length > 0 && screenTracks[0].readyState === 'live';

        if (hasScreen) {
          // Validate that the user shared their entire monitor, not a single browser tab or application window
          const trackSettings = screenTracks[0].getSettings();
          const surface = trackSettings.displaySurface;

          if (surface && surface !== 'monitor') {
            // Hard-gate violation: Candidate shared a Tab or Window instead of Entire Screen
            screenTracks[0].stop();
            setScreenStream(null);
            setScreenGranted(false);
            const msg = 'Invalid Selection: You selected a single browser tab or window. For anti-cheating proctoring compliance, you MUST select "Entire Screen". Click "Grant Permissions" and select the "Entire Screen" tab.';
            setError(msg);
            toast.error(msg, { duration: 7000 });
            return;
          }

          setScreenStream(screenStream);
          setScreenGranted(true);

          screenTracks[0].onended = () => {
            setScreenGranted(false);
            setScreenStream(null);
            toast.error('Screen sharing was stopped. Please grant screen sharing to proceed.');
          };
        }
      }

      if (hasVideo && hasAudio && screenGranted) {
        setError('');
        toast.success('Camera, Microphone, and Screen Sharing verified!');
      }
    } catch (err) {
      console.error('Media permission error:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setScreenGranted(false);
        setScreenStream(null);
        setError('Permission was denied or cancelled. Camera, microphone, and Entire Screen sharing are all mandatory to start this test. Please click "Grant Permissions" and allow each prompt.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera or microphone found. Please connect a working webcam and microphone to proceed.');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        setError('Camera or microphone is already in use by another application. Please close other applications using your devices and try again.');
      } else {
        setError('Camera, microphone, and Entire Screen sharing access are mandatory. Please grant permissions and try again.');
      }
    } finally {
      setRequestingPermissions(false);
    }
  };

  const handleStartTest = async () => {
    // Strict requirement: Block start action until camera, mic, and screen permissions are granted (BUG-13)
    if (!webcamGranted || !micGranted || !screenGranted) {
      setError('Camera, microphone, and screen sharing permissions must all be granted before starting the test (FR-5.2).');
      return;
    }

    setLoading(true);
    try {
      // FR-5.2: Enter fullscreen before starting
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }

      // POST /tests/:testId/start-attempt (§9.5)
      const { data } = await api.startAttempt(joinData.test._id, { roomId: joinData.room._id });

      // Stop instruction preview stream before test screen initializes proctoring
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }

      // Store session data for the test screen
      sessionStorage.setItem(
        'testSession',
        JSON.stringify({
          test: joinData.test,
          room: joinData.room,
          questions: data.questions,
          candidateStartTime: data.candidateStartTime,
          candidateEndTime: data.candidateEndTime,
          submissionSessionId: data.submissionSessionId,
        })
      );

      // Navigate based on test type
      if (joinData.test.testType === 'AI_TEST') {
        navigate('/candidate/ai-test');
      } else {
        navigate('/candidate/test');
      }
    } catch (err) {
      console.error('[Instructions] Start test error:', JSON.stringify(err.response?.data) || err.message);
      setError(err.response?.data?.error || 'Failed to start test attempt');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    } finally {
      setLoading(false);
    }
  };

  if (!joinData) return null;

  const isPermissionsComplete = webcamGranted && micGranted && screenGranted;

  return (
    <div className="app-layout" style={{ minHeight: '100vh', background: '#F7F9FA', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ background: '#1A2B3C', padding: '14px 32px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img
          src={globussoftLogo}
          alt="Globussoft Technology"
          style={{ height: 38, width: 'auto', objectFit: 'contain', display: 'block' }}
        />
      </div>

      <div style={{ flex: 1, padding: 32, maxWidth: 960, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 24 }}>
          <span className="badge badge-teal" style={{ marginBottom: 8 }}>
            {joinData.test.testType}
          </span>
          <h1 style={{ fontSize: '1.8rem', color: '#1A2B3C', marginBottom: 8 }}>{joinData.test.title}</h1>
          <div style={{ display: 'flex', gap: 24, color: '#6b7280', fontSize: '0.875rem' }}>
            <span>
              ⏱️ Duration: <strong>{joinData.test.durationMinutes} minutes</strong>
            </span>
            <span>
              📋 Questions: <strong>{joinData.test.totalQuestions}</strong>
            </span>
            <span>
              🏠 Room: <strong>{joinData.room.roomName}</strong>
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 24 }}>
          {/* Instructions */}
          <div className="card">
            <div className="card-header">
              <h2 className="card-title">📋 Test Instructions</h2>
            </div>
            <div
              style={{ lineHeight: 1.7, color: '#374151', whiteSpace: 'pre-wrap', fontSize: '0.875rem' }}
              dangerouslySetInnerHTML={{ __html: joinData.instructions }}
            />

            <div style={{ marginTop: 24 }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#1A2B3C', marginBottom: 12 }}>
                ⚠️ Mandatory Proctoring Rules
              </h3>
              <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8, paddingLeft: 0 }}>
                {[
                  'Stay in fullscreen mode throughout the test. Exiting fullscreen will be logged as a violation.',
                  'Do not switch tabs or minimize the browser window. Tab switches are logged with proof.',
                  'Do not use your mobile phone. Automated AI phone detection is active.',
                  'Copy-paste and context menus are disabled.',
                  'Your webcam and microphone must remain active and unobstructed at all times.',
                  'The test will automatically submit when your countdown timer expires.',
                ].map((rule, i) => (
                  <li key={i} style={{ display: 'flex', gap: 10, fontSize: '0.85rem', color: '#374151' }}>
                    <span style={{ color: '#E74C3C', flexShrink: 0 }}>✗</span>
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Media Permission Verification & Start Panel */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <div className="card-header">
                <h3 className="card-title">📸 Device Permissions (FR-5.2)</h3>
              </div>
              <div
                style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  background: '#1A2B3C',
                  borderRadius: 8,
                  overflow: 'hidden',
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {webcamGranted ? (
                  <video
                    ref={handleVideoRef}
                    autoPlay
                    muted
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                ) : (
                  <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>📷</div>
                    <div style={{ fontSize: '0.8rem' }}>Webcam &amp; Mic Not Connected</div>
                  </div>
                )}
                {webcamGranted && (
                  <div
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      background: '#2ECC71',
                      borderRadius: 4,
                      padding: '2px 8px',
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      color: 'white',
                    }}
                  >
                    ● LIVE PREVIEW
                  </div>
                )}
              </div>

              {/* Status Indicators for Webcam, Mic & Screen */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Webcam:</span>
                  <span style={{ fontWeight: 600, color: webcamGranted ? '#2ECC71' : '#E74C3C' }}>
                    {webcamGranted ? '✓ Granted' : '✗ Not Granted'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Microphone:</span>
                  <span style={{ fontWeight: 600, color: micGranted ? '#2ECC71' : '#E74C3C' }}>
                    {micGranted ? '✓ Granted' : '✗ Not Granted'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                  <span style={{ color: '#4b5563' }}>Screen Share:</span>
                  <span style={{ fontWeight: 600, color: screenGranted ? '#2ECC71' : '#E74C3C' }}>
                    {screenGranted ? '✓ Granted' : '✗ Not Granted'}
                  </span>
                </div>
              </div>

              <div style={{ fontSize: '0.74rem', color: '#64748b', marginBottom: 12, lineHeight: 1.4, background: '#f8fafc', padding: '8px 10px', borderRadius: 6, border: '1px solid #e2e8f0' }}>
                ℹ️ <strong>Screen sharing is required</strong> so violations like tab-switching and exiting fullscreen can be verified.
              </div>

              {!isPermissionsComplete ? (
                <button
                  id="grant-media-btn"
                  className="btn btn-secondary"
                  style={{
                    width: '100%',
                    fontWeight: 600,
                    fontSize: '0.8rem',
                    padding: '10px 8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    whiteSpace: 'normal',
                    lineHeight: 1.3,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                  onClick={requestMediaPermissions}
                  disabled={requestingPermissions}
                >
                  {requestingPermissions ? (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                      <span className="spinner spinner-dark" style={{ width: 14, height: 14 }} />
                      <span>Requesting Permissions...</span>
                    </span>
                  ) : (
                    <>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          flexShrink: 0,
                          fontSize: '0.95rem',
                          lineHeight: 1,
                        }}
                      >
                        <span>📷</span>
                        <span>🖥️</span>
                      </span>
                      <span style={{ display: 'inline', textAlign: 'center' }}>
                        Grant Camera, Mic &amp; Screen Access
                      </span>
                    </>
                  )}
                </button>
              ) : (
                <div className="alert alert-success" style={{ margin: 0, fontSize: '0.8rem' }}>
                  ✅ Devices &amp; Screen verified — ready to begin!
                </div>
              )}
            </div>

            {error && <div className="alert alert-danger" style={{ fontSize: '0.8rem' }}>{error}</div>}

            <div className="card" style={{ background: '#1A2B3C', borderColor: '#1A2B3C' }}>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem', marginBottom: 12 }}>
                Clicking Start will initiate your timer and lock the browser in full-screen mode.
              </div>
              <button
                id="start-test-btn"
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleStartTest}
                disabled={loading || !isPermissionsComplete}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Starting test...
                  </>
                ) : (
                  '🚀 Start Test — Enter Fullscreen'
                )}
              </button>
              {!isPermissionsComplete && (
                <p style={{ color: '#f87171', fontSize: '0.75rem', textAlign: 'center', marginTop: 8 }}>
                  🔒 Camera, Mic &amp; Screen access must be granted to start
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
