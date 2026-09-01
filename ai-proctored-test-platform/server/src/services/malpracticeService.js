// Malpractice Service — YOLO phone detection proxy
// Calls the Python YOLO microservice (yolo-service/) for server-side phone detection
// Configured via YOLO_SERVICE_URL env var
const fetch = require('node-fetch');
const FormData = require('form-data');

const YOLO_SERVICE_URL = process.env.YOLO_SERVICE_URL || 'http://localhost:8001';

/**
 * Send a webcam frame to the YOLO service for phone detection.
 * @param {Buffer} imageBuffer - Raw image buffer from candidate webcam
 * @returns {{ phoneDetected: boolean, confidence?: number }}
 */
const detectPhone = async (imageBuffer) => {
  let baseUrl = (process.env.YOLO_SERVICE_URL || 'http://localhost:8001').replace(/\/detect\/?$/, '');

  const createForm = () => {
    const form = new FormData();
    form.append('image', imageBuffer, {
      filename: 'frame.jpg',
      contentType: 'image/jpeg',
    });
    return form;
  };

  try {
    let response;
    const primaryForm = createForm();
    try {
      response = await fetch(`${baseUrl}/detect`, {
        method: 'POST',
        body: primaryForm,
        headers: primaryForm.getHeaders(),
        timeout: 6000,
      });
    } catch (netErr) {
      // If primary failed (e.g. ENOTFOUND yolo-service when running outside docker), try localhost:8001
      if (!baseUrl.includes('localhost') && !baseUrl.includes('127.0.0.1')) {
        console.debug('[YOLO] Primary URL failed (' + netErr.message + '), trying localhost:8001 fallback...');
        const fallbackForm = createForm();
        response = await fetch('http://localhost:8001/detect', {
          method: 'POST',
          body: fallbackForm,
          headers: fallbackForm.getHeaders(),
          timeout: 6000,
        });
      } else {
        throw netErr;
      }
    }

    if (!response || !response.ok) {
      console.error('[YOLO] Service error:', response ? response.status : 'no response');
      return { phoneDetected: false };
    }

    const data = await response.json();
    return {
      phoneDetected: data.phoneDetected === true,
      confidence: data.confidence,
    };
  } catch (err) {
    console.error('[YOLO] Detection failed:', err.message);
    return { phoneDetected: false };
  }
};

module.exports = { detectPhone };
