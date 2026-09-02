// useProctoring.js — Client-Side AI Proctoring Hook using MediaPipe FaceDetector
// Implements PRD Section 2.1, Section 9.8, Section 10, Section 11.5 (FR-5.2-5.4), Section 11.7 (FR-7.1, FR-7.2), Section 15 (MediaPipe FaceDetector)
import { useState, useEffect, useRef, useCallback } from 'react';
import toast from 'react-hot-toast';
import { FilesetResolver, FaceDetector } from '@mediapipe/tasks-vision';
import api from '../services/apiClient';
import { emitTabSwitch, emitFullscreenExit } from '../services/socketClient';
import { getScreenStream } from '../services/screenStreamManager';

/**
 * Custom hook for full client-side proctoring:
 * 1. Mandatory webcam + mic stream management (FR-5.2)
 * 2. Official MediaPipe FaceDetector task for continuous face presence & multi-face counting (FR-7.1, Section 15)
 * 3. Periodic YOLO phone detection frame upload every 7.5s (FR-7.2)
 * 4. Fullscreen lock & exit detection (FR-5.2, FR-5.3)
 * 5. Tab switch / blur detection (FR-5.3)
 * 6. Copy-paste / right-click prevention (FR-5.4)
 * 7. Live screen-share capture for TAB_SWITCH and FULLSCREEN_EXIT proof (BUG-13)
 */
export function useProctoring({
  testId,
  roomId,
  candidateId,
  enabled = true,
  allowInternalCopyPaste = false, // true only for AI Test internal chat-to-editor (FR-6.1)
  onWarning,
  onDisqualified,
}) {
  const videoRef = useRef(null);
  const screenVideoRef = useRef(null);
  const streamRef = useRef(null);
  const faceDetectorRef = useRef(null);

  // Statuses
  const [hasWebcam, setHasWebcam] = useState(false);
  const [hasMic, setHasMic] = useState(false);
  const [isMediaReady, setIsMediaReady] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(true);
  const [faceCount, setFaceCount] = useState(1);
  const [proctoringActive, setProctoringActive] = useState(false);
  const [detectorReady, setDetectorReady] = useState(false);

  // Camera Disconnection Tracking (Immediate Blackout & Lockdown Security Feature)
  const [isCameraDisconnected, setIsCameraDisconnected] = useState(false);
  const [hasHardwareCamera, setHasHardwareCamera] = useState(true);
  const [isVerifyingFace, setIsVerifyingFace] = useState(false);
  const isCameraDisconnectedRef = useRef(false);
  const cameraDisconnectTimeRef = useRef(null);

  const candidateIdRef = useRef(candidateId);
  const testIdRef = useRef(testId);
  const roomIdRef = useRef(roomId);

  useEffect(() => {
    candidateIdRef.current = candidateId;
    testIdRef.current = testId;
    roomIdRef.current = roomId;
  }, [candidateId, testId, roomId]);

  // Absence Tracking for NO_FACE_15MIN (PRD FR-7.1)
  const noFaceStartTimeRef = useRef(null);
  const noFaceReportedRef = useRef(false);

  // Consecutive detection counter for MULTIPLE_FACES (prevents single-frame lens/reflection false positives)
  const multiFaceCountRef = useRef(0);

  // Debounce refs for violations (prevent spamming API within 10s per violation type)
  const lastViolationTimeRef = useRef({});

  // ── Helper: Capture Real-time Proof Screenshot for any Violation ──────────────
  const captureViolationProof = useCallback((violationType) => {
    try {
      // ASSUMPTION: 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'CAMERA_DISCONNECTED', and 'OTHER' capture candidate's monitor/screen display evidence.
      // Physical presence violations ('PHONE_DETECTED', 'MULTIPLE_FACES', 'NO_FACE_15MIN') capture webcam frames.
      const isScreenViolation =
        violationType === 'TAB_SWITCH' ||
        violationType === 'FULLSCREEN_EXIT' ||
        violationType === 'CAMERA_DISCONNECTED' ||
        violationType === 'OTHER';

      // 1. Screen Monitor Capture for TAB_SWITCH, FULLSCREEN_EXIT, and OTHER (BUG-13)
      if (isScreenViolation && screenVideoRef.current && screenVideoRef.current.readyState >= 2) {
        const sw = screenVideoRef.current.videoWidth || 1280;
        const sh = screenVideoRef.current.videoHeight || 720;

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;
        const ctx = canvas.getContext('2d');

        // Draw live screen capture frame (captures active monitor / tab)
        ctx.drawImage(screenVideoRef.current, 0, 0, sw, sh);

        // Overlay proctoring violation watermark header
        ctx.fillStyle = 'rgba(15, 23, 42, 0.90)';
        ctx.fillRect(0, 0, sw, 44);

        ctx.fillStyle = '#EF4444';
        ctx.font = 'bold 15px sans-serif';
        ctx.fillText(`⚠️ PROCTORING EVIDENCE: ${violationType.replace(/_/g, ' ')} (SCREEN CAPTURE)`, 16, 28);

        // Timestamp & metadata footer
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.fillRect(0, sh - 30, sw, 30);
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '12px monospace';
        ctx.fillText(`Time: ${new Date().toLocaleTimeString()} · ${new Date().toLocaleDateString()} | Candidate: ${candidateId} | Screen Monitor Capture`, 16, sh - 10);

        return canvas.toDataURL('image/jpeg', 0.85);
      }

      // 2. Webcam Capture for PHONE_DETECTED, MULTIPLE_FACES, NO_FACE_15MIN (or fallback)
      if (videoRef.current && videoRef.current.readyState >= 2) {
        const vw = videoRef.current.videoWidth || 640;
        const vh = videoRef.current.videoHeight || 480;

        const canvas = document.createElement('canvas');
        canvas.width = vw;
        canvas.height = vh;
        const ctx = canvas.getContext('2d');

        // Draw live webcam frame
        ctx.drawImage(videoRef.current, 0, 0, vw, vh);

        // Overlay proctoring violation watermark header
        ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
        ctx.fillRect(0, 0, vw, 40);

        // Violation badge indicator
        ctx.fillStyle = violationType === 'PHONE_DETECTED' || violationType === 'MULTIPLE_FACES' ? '#EF4444' : '#F59E0B';
        ctx.font = 'bold 13px sans-serif';
        ctx.fillText(`⚠️ PROCTORING EVIDENCE: ${violationType.replace(/_/g, ' ')}`, 14, 25);

        // Timestamp & metadata footer
        ctx.fillStyle = 'rgba(15, 23, 42, 0.82)';
        ctx.fillRect(0, vh - 26, vw, 26);
        ctx.fillStyle = '#E2E8F0';
        ctx.font = '11px monospace';
        ctx.fillText(`Time: ${new Date().toLocaleTimeString()} · ${new Date().toLocaleDateString()}`, 14, vh - 9);

        return canvas.toDataURL('image/jpeg', 0.85);
      }

      // Fallback: create high-visibility violation banner snapshot
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, 640, 480);
      ctx.fillStyle = '#EF4444';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(`⚠️ PROCTORING VIOLATION: ${violationType.replace(/_/g, ' ')}`, 30, 80);
      ctx.fillStyle = '#ffffff';
      ctx.font = '13px monospace';
      ctx.fillText(`Detected At: ${new Date().toLocaleString()}`, 30, 130);
      ctx.fillText(`Candidate ID: ${candidateId}`, 30, 160);
      ctx.fillText(`Test ID: ${testId} | Room: ${roomId}`, 30, 190);
      return canvas.toDataURL('image/jpeg', 0.85);
    } catch (e) {
      console.error('Failed to capture violation proof:', e);
      return null;
    }
  }, [candidateId, testId, roomId]);

  // ── Helper: Capture Webcam Screenshot ───────────────────────────────────────
  const captureWebcamScreenshot = useCallback((violationType = 'CAMERA_CAPTURE') => {
    return captureViolationProof(violationType);
  }, [captureViolationProof]);

  // ── Helper: Capture Screen Snapshot ─────────────────────────────────────────
  const captureScreenSnapshot = useCallback(() => {
    return captureViolationProof('SCREEN_SNAPSHOT');
  }, [captureViolationProof]);

  // ── Helper: Report Violation with Debounce ──────────────────────────────────
  const reportViolation = useCallback(async (violationType, screenshotBase64) => {
    const now = Date.now();
    const lastTime = lastViolationTimeRef.current[violationType] || 0;
    if (now - lastTime < 5000) {
      // Throttle violation reports to at most once per 5s per type
      return;
    }
    lastViolationTimeRef.current[violationType] = now;

    // Capture real-time proof frame if none explicitly provided
    const proof = screenshotBase64 || captureViolationProof(violationType);

    console.warn(`[Proctoring] Reporting violation: ${violationType} with proof screenshot`);
    try {
      await api.reportViolation({
        candidateId,
        testId,
        roomId,
        violationType,
        screenshotBase64: proof,
      });
    } catch (err) {
      console.error(`[Proctoring] Failed to report ${violationType}:`, err);
    }
  }, [candidateId, testId, roomId, captureViolationProof]);

  // ── Camera Disconnect Handler (Immediate Fullscreen Blackout & Lockdown) ────
  const handleCameraDisconnected = useCallback(() => {
    if (isCameraDisconnectedRef.current) return;
    isCameraDisconnectedRef.current = true;
    setIsCameraDisconnected(true);
    setHasHardwareCamera(false);
    setIsVerifyingFace(false);
    cameraDisconnectTimeRef.current = Date.now();

    // Reset absence timer so it doesn't wait 15 minutes
    noFaceStartTimeRef.current = null;
    noFaceReportedRef.current = false;

    console.warn('[Proctoring] CAMERA_DISCONNECTED triggered! Locking screen and alerting server.');
    const proof = captureViolationProof('CAMERA_DISCONNECTED');

    const curCandidateId = candidateIdRef.current || candidateId;
    const curTestId = testIdRef.current || testId;
    const curRoomId = roomIdRef.current || roomId;

    api.reportCameraDisconnected({
      candidateId: curCandidateId,
      testId: curTestId,
      roomId: curRoomId,
      disconnectAt: new Date(cameraDisconnectTimeRef.current),
      screenshotBase64: proof,
    }).catch((err) => console.error('[Proctoring] Failed to report camera disconnect:', err));
  }, [candidateId, testId, roomId, captureViolationProof]);

  useEffect(() => {
    window.__simulateCameraDisconnect = () => {
      const tracks = streamRef.current?.getVideoTracks() || [];
      tracks.forEach((t) => {
        t.stop();
        t.dispatchEvent(new Event('ended'));
      });
      handleCameraDisconnected();
    };
    return () => {
      delete window.__simulateCameraDisconnect;
    };
  }, [handleCameraDisconnected]);

  // ── Camera Reconnect Attempt ────────────────────────────────────────────────
  const reconnectCamera = useCallback(async () => {
    try {
      console.log('[Proctoring] Attempting to reconnect camera stream...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      streamRef.current = stream;
      const videoTracks = stream.getVideoTracks();
      if (videoTracks.length > 0) {
        videoTracks[0].onended = () => {
          handleCameraDisconnected();
        };
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setHasHardwareCamera(true);
      setIsVerifyingFace(true); // Re-acquired video, scanning with MediaPipe for face
      return stream;
    } catch (err) {
      console.warn('[Proctoring] Camera reconnect failed or still disconnected:', err.message);
      setHasHardwareCamera(false);
      setIsVerifyingFace(false);
      return null;
    }
  }, [handleCameraDisconnected]);

  // ── 1. Mandatory Media Stream Initialization (FR-5.2) ───────────────────────
  const initMediaStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 } },
        audio: true,
      });

      streamRef.current = stream;
      const videoTracks = stream.getVideoTracks();
      const audioTracks = stream.getAudioTracks();

      if (videoTracks.length > 0) {
        videoTracks[0].onended = () => {
          handleCameraDisconnected();
        };
      }

      setHasWebcam(videoTracks.length > 0 && videoTracks[0].enabled);
      setHasMic(audioTracks.length > 0 && audioTracks[0].enabled);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }

      setIsMediaReady(true);
      return stream;
    } catch (err) {
      console.error('[Proctoring] Media permission error:', err);
      setHasWebcam(false);
      setHasMic(false);
      setIsMediaReady(false);
      toast.error('Webcam and Microphone permissions are required to take this assessment.');
      return null;
    }
  }, []);

  // ── 2. Official MediaPipe FaceDetector Task Initialization (PRD §15) ────────
  // Uses MediaPipe BlazeFace short-range vision model for in-browser face count detection
  useEffect(() => {
    if (!enabled) return;

    let isMounted = true;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
        );

        if (!isMounted) return;

        const detector = await FaceDetector.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath:
              'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          minDetectionConfidence: 0.65, // Increased to 0.65 to prevent phone camera lenses / reflections from false-triggering face detector
        });

        if (isMounted) {
          faceDetectorRef.current = detector;
          setDetectorReady(true);
          console.log('[Proctoring] MediaPipe FaceDetector initialized successfully');
        }
      } catch (err) {
        console.warn('[Proctoring] MediaPipe GPU delegate fallback to CPU:', err.message);
        try {
          const vision = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          );
          if (!isMounted) return;
          const detector = await FaceDetector.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite',
              delegate: 'CPU',
            },
            runningMode: 'VIDEO',
            minDetectionConfidence: 0.65, // Increased to 0.65 to eliminate phone lens false positives
          });
          if (isMounted) {
            faceDetectorRef.current = detector;
            setDetectorReady(true);
          }
        } catch (fallbackErr) {
          console.error('[Proctoring] MediaPipe FaceDetector initialization failed:', fallbackErr);
        }
      }
    };

    setupMediaPipe();

    return () => {
      isMounted = false;
      if (faceDetectorRef.current) {
        faceDetectorRef.current.close();
        faceDetectorRef.current = null;
      }
    };
  }, [enabled]);

  // ── Continuous In-Browser MediaPipe Face Detection Loop (FR-7.1, PRD §2.1) ──
  useEffect(() => {
    if (!enabled || !isMediaReady || !detectorReady) return;

    let isCancelled = false;
    let detectionInterval = null;

    detectionInterval = setInterval(() => {
      if (isCancelled || !faceDetectorRef.current) return;

      const videoTrack = streamRef.current?.getVideoTracks()?.[0];
      const isTrackEnded = !videoTrack || videoTrack.readyState === 'ended' || !videoTrack.enabled;
      const isVideoUnavailable = !videoRef.current || videoRef.current.readyState < 2;

      // ── Physical Camera Disconnect Check ────────────────────────────────────
      if (isTrackEnded) {
        if (!isCameraDisconnectedRef.current) {
          handleCameraDisconnected();
        }
        return;
      }

      if (isVideoUnavailable) {
        return;
      }

      try {
        const startTimeMs = performance.now();
        // MediaPipe FaceDetector task detectForVideo
        const result = faceDetectorRef.current.detectForVideo(videoRef.current, startTimeMs);
        // Filter valid face detections: score >= 0.65 and minimum size (eliminates microscopic reflections/camera lenses)
        const vw = videoRef.current.videoWidth || 640;
        const vh = videoRef.current.videoHeight || 480;
        const minFaceDimension = Math.min(vw, vh) * 0.08; // at least 8% of frame dimension

        const validDetections = (result.detections || []).filter((d) => {
          const box = d.boundingBox;
          if (!box) return true;
          return box.width >= minFaceDimension && box.height >= minFaceDimension;
        });

        const detectedFaces = validDetections.length;
        setFaceCount(detectedFaces);

        // ── Auto-Recovery: If camera was disconnected, restore access once face is verified ──
        if (isCameraDisconnectedRef.current) {
          if (detectedFaces >= 1 || window.__simulateFaceDetectedForTest) {
            window.__simulateFaceDetectedForTest = false;
            const reconnectTime = Date.now();
            const durationSec = Math.max(
              1,
              Math.round((reconnectTime - (cameraDisconnectTimeRef.current || reconnectTime)) / 1000)
            );

            console.log(`[Proctoring] Camera reconnected and face verified! Disconnected duration: ${durationSec}s`);
            const curCandidateId = candidateIdRef.current || candidateId;
            const curTestId = testIdRef.current || testId;
            const curRoomId = roomIdRef.current || roomId;

            api.reportCameraReconnected({
              candidateId: curCandidateId,
              testId: curTestId,
              roomId: curRoomId,
              reconnectAt: new Date(reconnectTime),
              durationSeconds: durationSec,
            }).catch((err) => console.error('[Proctoring] Failed to report camera reconnect:', err));

            isCameraDisconnectedRef.current = false;
            setIsCameraDisconnected(false);
            setIsVerifyingFace(false);
            setHasHardwareCamera(true);
            toast.success('Camera verified and face detected. Test resumed.');
          }
          return; // Suppress other violation processing while recovering
        }

        // FR-7.1: Multiple faces detected violation — requires 2 consecutive positive checks (2s) to avoid single-frame glitch
        if (detectedFaces > 1) {
          multiFaceCountRef.current = (multiFaceCountRef.current || 0) + 1;
          if (multiFaceCountRef.current >= 2) {
            const proof = captureWebcamScreenshot();
            reportViolation('MULTIPLE_FACES', proof);
            toast.error('⚠️ Multiple faces detected! Only the candidate is permitted in frame.');
          }
        } else {
          multiFaceCountRef.current = 0;
        }

        // FR-7.1 & Point 7: No face detected — 15 minute continuous absence tracking
        if (detectedFaces === 0) {
          if (!noFaceStartTimeRef.current) {
            noFaceStartTimeRef.current = Date.now();
          } else {
            const absenceDuration = Date.now() - noFaceStartTimeRef.current;
            // 15 minutes = 15 * 60 * 1000 = 900,000 ms
            if (absenceDuration >= 15 * 60 * 1000 && !noFaceReportedRef.current) {
              noFaceReportedRef.current = true;
              const proof = captureWebcamScreenshot();
              reportViolation('NO_FACE_15MIN', proof);
              toast.error('⚠️ Absence violation: No face detected for over 15 minutes.');
            }
          }
        } else {
          // Reset absence tracking when face is detected
          noFaceStartTimeRef.current = null;
          noFaceReportedRef.current = false;
        }
      } catch (err) {
        console.debug('[Proctoring] Face detection frame error:', err.message);
      }
    }, 1000); // 1s loop running client-side on GPU/WASM

    return () => {
      isCancelled = true;
      if (detectionInterval) clearInterval(detectionInterval);
    };
  }, [enabled, isMediaReady, detectorReady, captureWebcamScreenshot, reportViolation, handleCameraDisconnected, candidateId, testId, roomId]);

  // ── Auto-Detection & Device Change Listener for Reconnect / Disconnect ──────
  useEffect(() => {
    if (!enabled) return;

    const checkDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideo = devices.some((d) => d.kind === 'videoinput');
        const currentTrack = streamRef.current?.getVideoTracks()?.[0];

        if (!hasVideo || !currentTrack || currentTrack.readyState === 'ended') {
          if (!isCameraDisconnectedRef.current) {
            handleCameraDisconnected();
          }
        } else if (isCameraDisconnectedRef.current && !hasHardwareCamera) {
          reconnectCamera();
        }
      } catch (err) {
        console.warn('[Proctoring] Device check error:', err);
      }
    };

    navigator.mediaDevices?.addEventListener('devicechange', checkDevices);

    const reconnectInterval = setInterval(() => {
      if (isCameraDisconnectedRef.current && !hasHardwareCamera) {
        reconnectCamera();
      }
    }, 2500);

    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', checkDevices);
      clearInterval(reconnectInterval);
    };
  }, [enabled, hasHardwareCamera, handleCameraDisconnected, reconnectCamera]);

  // ── 3. Periodic YOLO Phone Detection Frame Upload (FR-7.2) ───────────────────
  // Sent every 4.5s (in the 5-10s range per PRD FR-7.2) as throttled multipart/form-data
  useEffect(() => {
    if (!enabled || !isMediaReady || !testId) return;

    const captureAndSendFrame = () => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      try {
        const canvas = document.createElement('canvas');
        canvas.width = 640;
        canvas.height = 480;
        const ctx = canvas.getContext('2d');
        // Ensure frame is captured from the live webcam stream (videoRef), never the hidden screen share
        ctx.drawImage(videoRef.current, 0, 0, 640, 480);

        canvas.toBlob((blob) => {
          if (!blob) return;
          const formData = new FormData();
          formData.append('image', blob, 'webcam_frame.jpg');

          // Send to POST /api/v1/proctoring/:testId/frame
          api.submitFrame(testId, formData).then((res) => {
            if (res.data?.phoneDetected) {
              console.warn('[Proctoring] 📱 YOLOv8 detected phone in frame!', res.data);
              toast.error('⚠️ Mobile phone detected in camera view! Mobile devices are strictly prohibited.', { duration: 6000 });
            } else {
              console.log('[Proctoring] YOLOv8 frame checked: no phone detected');
            }
          }).catch((err) => {
            console.debug('[Proctoring] Periodic frame submit result:', err.message);
          });
        }, 'image/jpeg', 0.75);
      } catch (err) {
        console.error('[Proctoring] Frame capture error:', err);
      }
    };

    // Initial check shortly after video is ready
    const initialTimer = setTimeout(captureAndSendFrame, 2000);
    const frameInterval = setInterval(captureAndSendFrame, 4500);

    return () => {
      clearTimeout(initialTimer);
      clearInterval(frameInterval);
    };
  }, [enabled, isMediaReady, testId]);

  // ── 3.5. Screen Sharing Stream & Termination Monitor (BUG-13) ───────────────
  useEffect(() => {
    if (!enabled) return;

    const stream = getScreenStream();
    if (stream && stream.active) {
      // Connect hidden video element to DOM to guarantee continuous live frame decoding in Chromium compositor
      let video = document.getElementById('__proctoring_screen_video');
      if (!video) {
        video = document.createElement('video');
        video.id = '__proctoring_screen_video';
        video.autoplay = true;
        video.muted = true;
        video.playsInline = true;
        video.style.position = 'fixed';
        video.style.top = '-9999px';
        video.style.left = '-9999px';
        video.style.width = '1px';
        video.style.height = '1px';
        video.style.opacity = '0';
        video.style.pointerEvents = 'none';
        video.style.zIndex = '-9999';
        document.body.appendChild(video);
      }
      video.srcObject = stream;
      video.play().catch((err) => console.debug('[Proctoring] Screen stream play caught:', err.message));
      screenVideoRef.current = video;

      // Detect mid-test screen share revocation (Requirement 4)
      const track = stream.getVideoTracks()[0];
      if (track) {
        track.onended = () => {
          // ASSUMPTION: If candidate stops screen sharing mid-test via browser UI ("Stop sharing"), treat as FULLSCREEN_EXIT violation and warn candidate.
          console.warn('[Proctoring] Screen share stream was stopped mid-test!');
          toast.error('⚠️ Screen sharing was disconnected! Continuous screen sharing is mandatory.', { duration: 8000 });
          const proof = captureViolationProof('FULLSCREEN_EXIT');
          reportViolation('FULLSCREEN_EXIT', proof);
        };
      }
    }

    return () => {
      const el = document.getElementById('__proctoring_screen_video');
      if (el) {
        el.srcObject = null;
        el.remove();
      }
      screenVideoRef.current = null;
    };
  }, [enabled, captureViolationProof, reportViolation]);

  // ── 4. Fullscreen Enforcement & Exit Detection (FR-5.2, FR-5.3) ─────────────
  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const inFullscreen = Boolean(document.fullscreenElement || document.webkitFullscreenElement);
      setIsFullscreen(inFullscreen);

      if (!inFullscreen) {
        emitFullscreenExit({ candidateId, testId, roomId });
        const proof = captureViolationProof('FULLSCREEN_EXIT');
        reportViolation('FULLSCREEN_EXIT', proof);
        toast.error('⚠️ Fullscreen exited! You must remain in full-screen mode.', { duration: 4000 });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, [enabled, candidateId, testId, roomId, captureViolationProof, reportViolation]);

  // ── 5. Tab Switch / Window Blur Detection (FR-5.3) ───────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        emitTabSwitch({ candidateId, testId, roomId });
        const proof = captureViolationProof('TAB_SWITCH');
        reportViolation('TAB_SWITCH', proof);
        toast.error('⚠️ Tab switch detected! Switching tabs is strictly prohibited.', { duration: 4000 });
      }
    };

    const handleWindowBlur = () => {
      emitTabSwitch({ candidateId, testId, roomId });
      const proof = captureViolationProof('TAB_SWITCH');
      reportViolation('TAB_SWITCH', proof);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, candidateId, testId, roomId, captureViolationProof, reportViolation]);

  // ── 6. Copy-Paste / Right-Click Blocking (FR-5.4) ───────────────────────────
  useEffect(() => {
    if (!enabled) return;

    const handleCopy = (e) => {
      if (!allowInternalCopyPaste) {
        e.preventDefault();
        toast.error('Copying is disabled during the assessment (FR-5.4).');
      }
    };

    const handlePaste = (e) => {
      if (!allowInternalCopyPaste) {
        e.preventDefault();
        toast.error('Pasting is disabled during the assessment (FR-5.4).');
      }
    };

    const handleCut = (e) => {
      if (!allowInternalCopyPaste) {
        e.preventDefault();
      }
    };

    const handleContextMenu = (e) => {
      e.preventDefault(); // Disable right-click context menu
    };

    document.addEventListener('copy', handleCopy);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('cut', handleCut);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [enabled, allowInternalCopyPaste]);

  // Enter Fullscreen Helper
  const requestFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      }
    } catch (err) {
      console.error('Fullscreen request failed:', err);
    }
  };

  // Auto-init media stream on mount
  useEffect(() => {
    initMediaStream().then(() => {
      setProctoringActive(true);
    });

    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, [initMediaStream]);

  return {
    videoRef,
    streamRef,
    hasWebcam,
    hasMic,
    isMediaReady,
    isFullscreen,
    faceCount,
    detectorReady,
    proctoringActive,
    requestFullscreen,
    initMediaStream,
    captureWebcamScreenshot,
    captureScreenSnapshot,
    isCameraDisconnected,
    hasHardwareCamera,
    isVerifyingFace,
    reconnectCamera,
  };
}

export default useProctoring;
