#!/usr/bin/env node
const config = require("../config.js");
const njsp = require("nodejs-server-pages");

let root = {
    "default": "../ws/default"
};

const path = require("path");
const dbPath = path.join(__dirname, "nodejs-server-pages.db");
const errDbPath = path.join(__dirname, "nodejs-server-pages-error.db");
njsp.createServer({errDB: errDbPath, db: dbPath});
njsp.createWSServer({root, errDB: errDbPath, db: dbPath});
