// screenStreamManager.js — Singleton manager for candidate screen capture MediaStream (BUG-13)
// PRD FR-5.2, FR-5.3, Section 8.2: Screen capture MediaStream for TAB_SWITCH and FULLSCREEN_EXIT evidence.
// Manages the active screen-sharing stream across instructions and test screens without mid-test reprompting.

let activeScreenStream = null;

export const setScreenStream = (stream) => {
  activeScreenStream = stream;
  if (typeof window !== 'undefined') {
    window.__candidateScreenStream = stream;
  }
};

export const getScreenStream = () => {
  if (activeScreenStream && activeScreenStream.active) {
    return activeScreenStream;
  }
  if (typeof window !== 'undefined' && window.__candidateScreenStream && window.__candidateScreenStream.active) {
    activeScreenStream = window.__candidateScreenStream;
    return activeScreenStream;
  }
  return null;
};

export const stopScreenStream = () => {
  if (activeScreenStream) {
    try {
      activeScreenStream.getTracks().forEach((track) => track.stop());
    } catch (_) {}
    activeScreenStream = null;
  }
  if (typeof window !== 'undefined') {
    window.__candidateScreenStream = null;
  }
};
