const express = require('express');
const fs = require('fs');
const path = require('path');
const { authMiddleware } = require('../middleware/auth');
const crypto = require('crypto');

const router = express.Router();
const configPath = process.env.CONFIG_FILE || path.join(process.env.DATA_DIR || path.join(__dirname, '../../../data'), "config.json");

router.get('/', authMiddleware, (req, res) => {
    try {
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        // Strip sensitive data before sending
        delete configData.adminPasswordHash;
        res.json(configData);
    } catch(e) {
        res.status(500).json({ error: 'Failed to read config' });
    }
});

router.post('/', authMiddleware, (req, res) => {
    try {
        let currentConfig = {};
        if (fs.existsSync(configPath)) {
            currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        }

        const newConfig = { ...currentConfig, ...req.body };

        // Handle password update if provided
        if (req.body.newPassword) {
            const salt = crypto.randomBytes(16).toString('hex');
            const derivedKey = crypto.pbkdf2Sync(req.body.newPassword, salt, 100000, 64, 'sha512');
            newConfig.adminPasswordHash = `pbkdf2:${salt}:${derivedKey.toString('hex')}`;
            delete newConfig.newPassword; // Do not save plaintext
        }

        fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 4));

        // Return without sensitive data
        delete newConfig.adminPasswordHash;
        res.json({ success: true, config: newConfig });
    } catch(e) {
        res.status(500).json({ error: 'Failed to update config' });
    }
});

module.exports = router;
