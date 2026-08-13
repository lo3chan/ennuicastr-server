const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const router = express.Router();
const configPath = process.env.CONFIG_FILE || path.join(process.env.DATA_DIR || path.join(__dirname, '../../../data'), "config.json");
const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const soundsDir = configData.sounds || path.join(process.env.DATA_DIR || path.join(__dirname, '../../../data'), 'sounds');

if (!fs.existsSync(soundsDir)){
    fs.mkdirSync(soundsDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, soundsDir)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
    }
});
const upload = multer({ storage: storage });

router.get('/', authMiddleware, (req, res) => {
    try {
        const files = fs.readdirSync(soundsDir);
        const sounds = files.map(file => ({
            id: file,
            name: file,
            url: `/r/sounds/${file}`
        }));
        res.json({ sounds });
    } catch(e) {
        res.status(500).json({ error: 'Failed to read sounds directory' });
    }
});

router.post('/', authMiddleware, upload.single('sound'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    res.json({ success: true, file: req.file.filename });
});

router.delete('/:id', authMiddleware, (req, res) => {
    const { id } = req.params;
    try {
        const filePath = path.join(soundsDir, id);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
            res.json({ success: true, message: 'Sound deleted' });
        } else {
            res.status(404).json({ error: 'Sound not found' });
        }
    } catch(e) {
        res.status(500).json({ error: 'Failed to delete sound' });
    }
});

module.exports = router;
