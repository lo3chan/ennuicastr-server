/*
 * Copyright (c) 2020-2022 Yahweasel
 *
 * Permission to use, copy, modify, and/or distribute this software for any
 * purpose with or without fee is hereby granted, provided that the above
 * copyright notice and this permission notice appear in all copies.
 *
 * THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
 * WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF
 * MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY
 * SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
 * WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION
 * OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN
 * CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
 */

/* Configuration */
const fs = require("fs");
const path = require("path");

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
const configPath = process.env.CONFIG_FILE || path.join(dataDir, "config.json");

let configData = {};
let lastMtime = 0;

function loadConfig() {
    try {
        const stat = fs.statSync(configPath);
        if (stat.mtimeMs > lastMtime) {
            const raw = fs.readFileSync(configPath, "utf8");
            const newConfig = JSON.parse(raw);

            // Dynamically resolve relative paths using environment variables or __dirname
            const repoPath = process.env.REPO_DIR || __dirname;

            // Override with relative paths instead of hardcoded absolute paths if not explicitly defined
            newConfig.repo = newConfig.repo || repoPath;
            newConfig.clientRepo = newConfig.clientRepo || path.join(repoPath, 'client');
            newConfig.db = newConfig.db || path.join(dataDir, 'db');
            newConfig.rec = newConfig.rec || path.join(dataDir, 'rec');
            newConfig.sounds = newConfig.sounds || path.join(dataDir, 'sounds');

            // Handle ~'s in paths
            ["repo", "db", "rec", "sounds", "cert", "clientRepo"].forEach((p) => {
                if (newConfig[p] && typeof newConfig[p] === 'string') {
                    newConfig[p] = newConfig[p].replace(/~/g, process.env.HOME || '');
                }
            });

            configData = newConfig;
            lastMtime = stat.mtimeMs;
        }
    } catch (ex) {
        // Fallback to existing configData if parsing fails or file is temporarily missing
        // If configData is empty, initialize defaults
        if (Object.keys(configData).length === 0) {
            const repoPath = process.env.REPO_DIR || __dirname;
            configData = {
                repo: repoPath,
                clientRepo: path.join(repoPath, 'client'),
                db: path.join(dataDir, 'db'),
                rec: path.join(dataDir, 'rec'),
                sounds: path.join(dataDir, 'sounds'),
                limits: {
                    simultaneous: 4,
                    lobbies: 64,
                    tracksFree: 8,
                    tracksPaid: 64,
                    recNameLength: 512,
                    recUsernameLength: 32,
                    lobbyNameLength: 512,
                    soundNameLength: 512,
                    soundSize: 1073741824,
                    soundDurationTotal: 7200
                }
            };
        }
    }
}

// Initial load
loadConfig();

// Create a Proxy to intercept property accesses and check mtime on every access
const configProxy = new Proxy(configData, {
    get: function(target, prop) {
        loadConfig();
        return Reflect.get(configData, prop);
    },
    set: function(target, prop, value) {
        // Disallow direct modification via proxy
        return false;
    }
});

module.exports = configProxy;
