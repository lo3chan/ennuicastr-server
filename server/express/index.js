const express = require('express');
const cookieParser = require('cookie-parser');
const path = require('path');
const config = require('../../config.js');
const http = require('http');
const attachWebSockets = require('./websocket');

const app = express();

app.use(express.json());
app.use(cookieParser());

app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});

const authRoutes = require('./routes/auth');
app.use('/api/v1/auth', authRoutes);

const configRoutes = require('./routes/config');
app.use('/api/v1/config', configRoutes);

const recordingsRoutes = require('./routes/recordings');
app.use('/api/v1/recordings', recordingsRoutes);

const roomsRoutes = require('./routes/rooms');
app.use('/api/v1/rooms', roomsRoutes);

const soundsRoutes = require('./routes/sounds');
app.use('/api/v1/sounds', soundsRoutes);

const lobbyRoutes = require('./routes/lobby');
app.use('/api/v1/lobby', lobbyRoutes);

const server = http.createServer(app);
attachWebSockets(server);

const port = process.env.PORT || 8080;
if (process.env.NODE_ENV !== 'test') {
    server.listen(port, () => {
        console.log(`Unified Express Server running on port ${port}`);
    });
}

module.exports = app;

// Serve the existing WebRTC client frontend
const clientPath = config.clientRepo || path.join(__dirname, '../../client');
app.use('/r', express.static(clientPath, {
    setHeaders: (res, path) => {
        res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
    }
}));

// Serve sounds alias
const fs = require('fs');
let soundsDir = '';
try {
    const configPath = process.env.CONFIG_FILE || path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), "config.json");
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    soundsDir = configData.sounds || path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'sounds');
} catch (e) {
    soundsDir = path.join(process.env.DATA_DIR || path.join(__dirname, '../../data'), 'sounds');
}

app.use('/r/sounds', express.static(soundsDir));
