// Room routes — Section 9.3 (exact endpoint paths)
const express = require('express');
const router = express.Router();
const { createRoom, getRooms, deleteRoom, getRoomCandidates, getLiveCandidates } = require('../controllers/roomController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const adminAuth = [verifyToken, requireAdmin];

router.post('/tests/:testId/rooms', adminAuth, createRoom);
router.get('/tests/:testId/rooms', adminAuth, getRooms);
router.get('/tests/:testId/live-candidates', adminAuth, getLiveCandidates);
router.delete('/rooms/:roomId', adminAuth, deleteRoom);
router.get('/rooms/:roomId/candidates', adminAuth, getRoomCandidates);

module.exports = router;
