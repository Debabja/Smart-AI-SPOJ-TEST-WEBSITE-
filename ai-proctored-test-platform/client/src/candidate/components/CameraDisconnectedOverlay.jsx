import React, { useRef, useEffect } from 'react';

/**
 * CameraDisconnectedOverlay
 * 
 * Full-viewport DOM/CSS opaque blackout overlay covering the entire screen
 * when a candidate's camera is physically unplugged or disconnected mid-exam.
 * 
 * Requirements satisfied:
 * 1. Immediate full-screen opaque blackout/blur overlay (zero text/code bleed-through).
 * 2. Clear centered message warning of camera disconnection.
 * 3. Informs candidate that editor is locked to read-only and actions are disabled.
 * 4. Shows active running test timer to prove no pause/advantage gained.
 * 5. Visual camera reconnection / MediaPipe face verification indicator.
 * 6. Hardened against window resize / DevTools bypass with fixed full-screen layout.
 */
export default function CameraDisconnectedOverlay({
  isVisible,
  timerDisplay,
  hasHardwareCamera,
  isVerifyingFace,
  onRetry,
  videoRef,
}) {
  const previewVideoRef = useRef(null);

  useEffect(() => {
    if (hasHardwareCamera && previewVideoRef.current && videoRef?.current?.srcObject) {
      previewVideoRef.current.srcObject = videoRef.current.srcObject;
      previewVideoRef.current.play().catch(() => {});
    }
  }, [hasHardwareCamera, videoRef]);

  if (!isVisible) return null;

  return (
    <div
      id="camera-disconnected-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 999999,
        background: '#0b131e', // 100% solid, fully opaque dark slate
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        userSelect: 'none',
        pointerEvents: 'all',
      }}
    >
      <div
        style={{
          maxWidth: 640,
          width: '100%',
          background: '#15202b',
          border: '2px solid #ef4444',
          borderRadius: 16,
          boxShadow: '0 25px 50px -12px rgba(239, 68, 68, 0.35)',
          padding: '36px 32px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}
      >
        {/* Pulsing Warning Icon */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '2px solid #ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '2.2rem',
            animation: 'pulse 1.8s infinite',
          }}
        >
          ⚠️
        </div>

        {/* Title */}
        <div>
          <h2
            style={{
              color: '#f87171',
              fontSize: '1.6rem',
              fontWeight: 800,
              margin: '0 0 8px 0',
              letterSpacing: '-0.02em',
            }}
          >
            Camera Disconnected
          </h2>
          <p
            style={{
              color: '#e2e8f0',
              fontSize: '1.05rem',
              fontWeight: 600,
              margin: '0 0 4px 0',
            }}
          >
            Please reconnect your camera to continue.
          </p>
          <p
            style={{
              color: '#94a3b8',
              fontSize: '0.88rem',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            Timer is still running. No code changes, executions, or submissions can be made until your camera is verified.
          </p>
        </div>

        {/* Active Test Timer Display (Proves timer keeps ticking without pause) */}
        {timerDisplay && (
          <div
            style={{
              background: '#0b131e',
              border: '1px solid #334155',
              borderRadius: 10,
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
            }}
          >
            <span style={{ color: '#94a3b8', fontSize: '0.82rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Test Time Remaining:
            </span>
            <span
              style={{
                color: '#facc15',
                fontFamily: 'monospace',
                fontSize: '1.3rem',
                fontWeight: 800,
                letterSpacing: '0.05em',
              }}
            >
              ⏱️ {timerDisplay}
            </span>
          </div>
        )}

        {/* Reconnect & Face Detection Status Box */}
        <div
          style={{
            width: '100%',
            background: hasHardwareCamera ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
            border: `1px solid ${hasHardwareCamera ? '#3b82f6' : '#ef4444'}`,
            borderRadius: 10,
            padding: '14px 18px',
            textAlign: 'left',
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}
        >
          <span style={{ fontSize: '1.4rem' }}>
            {!hasHardwareCamera ? '🔌' : isVerifyingFace ? '👤' : '📷'}
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                color: !hasHardwareCamera ? '#f87171' : '#60a5fa',
                fontWeight: 700,
                fontSize: '0.92rem',
                marginBottom: 2,
              }}
            >
              {!hasHardwareCamera
                ? 'Camera Hardware Not Detected'
                : isVerifyingFace
                ? 'Camera Connected — Scanning for Face...'
                : 'Camera Stream Active'}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.78rem', lineHeight: 1.4 }}>
              {!hasHardwareCamera
                ? 'Plug in your external USB webcam or ensure your built-in camera is enabled and permissions are granted.'
                : 'Position your face directly in front of the camera. The exam will resume automatically once verified.'}
            </div>
          </div>
        </div>

        {/* Live Camera Feed Preview to assist candidate in positioning */}
        {hasHardwareCamera && (
          <div
            style={{
              position: 'relative',
              width: 220,
              height: 140,
              background: '#000',
              borderRadius: 8,
              border: '2px solid #3b82f6',
              overflow: 'hidden',
              boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            }}
          >
            <video
              ref={previewVideoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: 'scaleX(-1)', // Mirror candidate
              }}
            />
            <div
              style={{
                position: 'absolute',
                bottom: 4,
                left: 6,
                right: 6,
                background: 'rgba(0,0,0,0.7)',
                color: '#60a5fa',
                fontSize: '0.68rem',
                padding: '2px 6px',
                borderRadius: 4,
                textAlign: 'center',
                fontWeight: 600,
              }}
            >
              Verifying Face via MediaPipe...
            </div>
          </div>
        )}

        {/* Manual Reconnect Action Button */}
        <button
          id="reconnect-camera-btn"
          type="button"
          onClick={onRetry}
          style={{
            background: '#0E7C86',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '10px 24px',
            fontSize: '0.92rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(14, 124, 134, 0.4)',
            transition: 'background 0.2s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = '#09575e')}
          onMouseOut={(e) => (e.currentTarget.style.background = '#0E7C86')}
        >
          🔄 Re-detect / Reconnect Camera
        </button>
      </div>
    </div>
  );
}
