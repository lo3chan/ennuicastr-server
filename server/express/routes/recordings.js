const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { db } = require('../../../db');
const recM = require('../../../rec');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const recordings = await db.allP("SELECT * FROM recordings ORDER BY init DESC;");
        res.json({ recordings });
    } catch(e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.delete('/:rid', authMiddleware, async (req, res) => {
    const { rid } = req.params;
    try {
        const rec = await db.getP("SELECT uid FROM recordings WHERE rid = ?", [rid]);
        if (!rec) return res.status(404).json({ error: 'Recording not found' });

        await recM.del(rid, rec.uid);
        res.json({ success: true, message: 'Recording deleted' });
    } catch(e) {
        res.status(500).json({ error: 'Failed to delete recording' });
    }
});

module.exports = router;
