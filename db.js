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

/* Database access functions */

const util = require("util");
const sqlite3 = require("sqlite3");
const fs = require("fs");
const config = require("./config.js");

if (!global.__DB_CACHE) {
    const isTestMode = process.env.NODE_ENV === 'test';
    const dbPath = isTestMode ? ':memory:' : (config.db + "/ennuicastr.db");
    const logDbPath = isTestMode ? ':memory:' : (config.db + "/log.db");

    global.__DB_CACHE = {
        db: new sqlite3.Database(dbPath),
        logdb: new sqlite3.Database(logDbPath)
    };

    // Initialize schema for in-memory databases synchronously to avoid race conditions
    if (isTestMode) {
        try {
            const schemaDb = fs.readFileSync(__dirname + '/db-schema/ennuicastr.schema', 'utf8');
            const schemaLog = fs.readFileSync(__dirname + '/db-schema/log.schema', 'utf8');
            global.__DB_CACHE.db.exec(schemaDb);
            global.__DB_CACHE.logdb.exec(schemaLog);
        } catch(e) {
            console.error("Failed to initialize in-memory schema", e);
        }
    }
}
const db = global.__DB_CACHE.db;
const logdb = global.__DB_CACHE.logdb;

function wrapWithRetry(obj, meth) {
    const raw = util.promisify(obj[meth].bind(obj));
    return async function(...args) {
        let retries = 0;
        while (retries < 20) {
            try {
                return await raw(...args);
            } catch (ex) {
                if (ex && ex.code === "SQLITE_BUSY") {
                    await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 10));
                    retries++;
                    continue;
                }
                throw ex;
            }
        }
        throw new Error(`Database operation failed after 20 retries due to SQLITE_BUSY: ${meth}`);
    };
}

["run", "get", "all"].forEach((x) => {
    db[x + "P"] = wrapWithRetry(db, x);
    logdb[x + "P"] = wrapWithRetry(logdb, x);
});

if (process.env.NODE_ENV !== 'test') {
    db.runP("PRAGMA journal_mode=WAL;").catch(console.error);
    logdb.runP("PRAGMA journal_mode=WAL;").catch(console.error);
}

if (!global.__DB_CACHE.logStmtA) {
    global.__DB_CACHE.logStmtA = logdb.prepare(
        "INSERT INTO log (time, type, uid, rid, details) " +
        "VALUES (strftime('%Y-%m-%d %H:%M:%f', @TIME), @TYPE, @UID, @RID, @DETAILS);"
    );
    global.__DB_CACHE.logStmt = util.promisify(global.__DB_CACHE.logStmtA.run.bind(global.__DB_CACHE.logStmtA));
}
const logStmt = global.__DB_CACHE.logStmt;

/**
 * Log this interaction.
 * @param {string} type         The basic type of interaction
 * @param {string} details      Details on the interaction, not in any specific format
 * @param {Object} extra        Extra details, such as the uid and rid
 */
async function log(type, details, extra) {
    var vals = {
        "@TIME": new Date().toISOString(),
        "@TYPE": type,
        "@DETAILS": details
    };

    if (typeof extra === "undefined")
        extra = {};

    extra.uid = (extra.uid || "");
    extra.rid = (extra.rid || -1);

    vals["@UID"] = extra.uid;
    vals["@RID"] = extra.rid;

    // Insert
    let retries = 0;
    while (retries < 20) {
        try {
            await logStmt(vals);
            break;
        } catch (ex) {
            if (ex && ex.code === "SQLITE_BUSY") {
                await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 10));
            } else {
                await new Promise(r => setTimeout(r, 100)); // Default backoff
            }
            retries++;
        }
    }
}

module.exports = {db, logdb, log};
