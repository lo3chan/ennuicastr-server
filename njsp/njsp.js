#!/usr/bin/env node
const config = require("../config.js");
const njsp = require("nodejs-server-pages");

let root = {
    "default": "../ws/default"
};

const path = require("path");
const dbPath = path.join(__dirname, "nodejs-server-pages.db");
const errDbPath = path.join(__dirname, "nodejs-server-pages-error.db");

// Implement proactive memory scaling
setInterval(() => {
    const memoryUsage = process.memoryUsage();
    if (memoryUsage.rss > 500 * 1024 * 1024) { // 500 MB limit
        console.error("Memory limit exceeded! RSS:", memoryUsage.rss, "Terminating process...");
        process.exit(1);
    }
}, 5000);

njsp.createServer({errDB: errDbPath, db: dbPath});
njsp.createWSServer({root, errDB: errDbPath, db: dbPath});
