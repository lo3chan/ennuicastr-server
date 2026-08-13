const express = require('express');
const crypto = require('crypto');
const { generateToken, authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const configPath = process.env.CONFIG_FILE || path.join(process.env.DATA_DIR || path.join(__dirname, '../../../data'), "config.json");

router.post('/login', async (req, res) => {
    const { password } = req.body;
    if (!password) {
        return res.status(400).json({ error: 'Password is required' });
    }

    let configData = {};
    try {
        configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch(e) {
        // Fallback for first time setup
    }

    if (configData.adminPasswordHash) {
        // Verify hash
        const parts = configData.adminPasswordHash.split(':');
        if (parts.length !== 3 || parts[0] !== 'pbkdf2') {
            return res.status(500).json({ error: 'Invalid stored password format' });
        }

        const salt = parts[1];
        const storedHash = parts[2];

        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });

            if (derivedKey.toString('hex') === storedHash) {
                const token = generateToken({ role: 'admin' });
                res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
                return res.json({ success: true, message: 'Logged in successfully' });
            } else {
                return res.status(401).json({ error: 'Invalid password' });
            }
        });
    } else {
        // First time setup - hash and store
        const salt = crypto.randomBytes(16).toString('hex');
        crypto.pbkdf2(password, salt, 100000, 64, 'sha512', (err, derivedKey) => {
            if (err) return res.status(500).json({ error: 'Internal server error' });

            const hash = `pbkdf2:${salt}:${derivedKey.toString('hex')}`;
            configData.adminPasswordHash = hash;

            fs.writeFileSync(configPath, JSON.stringify(configData, null, 4));

            const token = generateToken({ role: 'admin' });
            res.cookie('auth_token', token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
            return res.json({ success: true, message: 'Password set and logged in' });
        });
    }
});

router.post('/logout', (req, res) => {
    res.clearCookie('auth_token');
    res.json({ success: true, message: 'Logged out successfully' });
});

router.get('/me', authMiddleware, (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;
