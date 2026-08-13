const { WebSocketServer } = require('ws');
const url = require('url');

function attachWebSockets(server) {
    const wss = new WebSocketServer({ noServer: true });

    wss.on('connection', function connection(ws, req) {
        // Implement ws signaling logic here, migrating from ws/default.js
        ws.on('message', function message(data) {
            console.log('received: %s', data);
        });

        ws.send(JSON.stringify({ c: 'connected' }));
    });

    server.on('upgrade', function upgrade(request, socket, head) {
        const pathname = url.parse(request.url).pathname;

        if (pathname === '/ws') {
            wss.handleUpgrade(request, socket, head, function done(ws) {
                wss.emit('connection', ws, request);
            });
        }
    });
}

module.exports = attachWebSockets;
