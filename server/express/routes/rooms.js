const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const { db } = require('../../../db');
const uidX = require('../../../web/panel/uid'); // May need refactoring or mocking
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const rooms = await db.allP("SELECT * FROM rooms;");
        res.json({ rooms });
    } catch(e) {
        res.status(500).json({ error: 'Database error' });
    }
});

router.post('/', authMiddleware, async (req, res) => {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        const id = uuidv4();
        const key = Math.random().toString(36).substring(2, 10);
        await db.runP("INSERT INTO rooms (id, name, key) VALUES (?, ?, ?)", [id, name, key]);
        res.json({ success: true, room: { id, name, key } });
    } catch(e) {
        res.status(500).json({ error: 'Failed to create room' });
    }
});

router.put('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    try {
        await db.runP("UPDATE rooms SET name = ? WHERE id = ?", [name, id]);
        res.json({ success: true, message: 'Room updated' });
    } catch(e) {
        res.status(500).json({ error: 'Failed to update room' });
    }
});

router.delete('/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        await db.runP("DELETE FROM rooms WHERE id = ?", [id]);
        res.json({ success: true, message: 'Room deleted' });
    } catch(e) {
        res.status(500).json({ error: 'Failed to delete room' });
    }
});

module.exports = router;
