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

const configPath = path.join(__dirname, "config.json");
let configData = {};
let lastMtime = 0;

function loadConfig() {
    try {
        const stat = fs.statSync(configPath);
        if (stat.mtimeMs > lastMtime) {
            const raw = fs.readFileSync(configPath, "utf8");
            const newConfig = JSON.parse(raw);

            // Handle ~'s in paths
            ["repo", "db", "rec", "sounds", "cert", "clientRepo"].forEach((p) => {
                if (newConfig[p]) {
                    newConfig[p] = newConfig[p].replace(/~/g, process.env.HOME);
                }
            });

            configData = newConfig;
            lastMtime = stat.mtimeMs;
        }
    } catch (ex) {
        // Fallback to existing configData if parsing fails or file is temporarily missing
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
