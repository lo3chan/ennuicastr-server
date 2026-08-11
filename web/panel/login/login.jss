<?JS!
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

const util = require("util");

const edb = require("/app/ennuicastr-server/db.js");
const db = edb.db;
const log = edb.log;
const id36 = require("/app/ennuicastr-server/id36.js");

function genUID() {
    return id36.genID(32);
}

async function getUID(login) {
    var uid, newUID = false;
    while (true) {
        try {
            await db.runP("BEGIN IMMEDIATE TRANSACTION;");
            var row = await db.getP("SELECT uid FROM users WHERE login=@LOGIN;", {"@LOGIN": login});
            if (row) {
                // Already registered
                uid = row.uid;
                await db.runP("COMMIT;");
        await db.runP("PRAGMA wal_checkpoint(PASSIVE);");
                break;
            }

            // Not already registered
            uid = genUID();
            await db.runP("INSERT INTO users (uid, login) VALUES (@UID, @LOGIN);", {"@UID": uid, "@LOGIN": login});
            newUID = true;


            await db.runP("COMMIT;");
        await db.runP("PRAGMA wal_checkpoint(PASSIVE);");
            break;
        } catch (ex) {
            try { await db.runP("ROLLBACK;"); } catch (e) {}
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 10));
        }
    }

    if (newUID) {
        // Log it
        await log("new-account", login, {uid});
    }

    return uid;
}

async function setEmail(uid, email) {
    var newEmail = false;
    while (true) {
        try {
            await db.runP("BEGIN IMMEDIATE TRANSACTION;");
            var row = await db.getP("SELECT email FROM emails WHERE uid=@UID;", {"@UID": uid});
            if (row && row.email === email) {
                // Email already set
                await db.runP("COMMIT;");
        await db.runP("PRAGMA wal_checkpoint(PASSIVE);");
                break;
            }

            // Add or replace what's there
            await db.runP("DELETE FROM emails WHERE uid=@UID;", {"@UID": uid});
            await db.runP("INSERT INTO emails (uid, email) VALUES (@UID, @EMAIL);", {
                "@UID": uid,
                "@EMAIL": email
            });
            await db.runP("COMMIT;");
        await db.runP("PRAGMA wal_checkpoint(PASSIVE);");
            newEmail = true;
            break;
        } catch (ex) {
            try { await db.runP("ROLLBACK;"); } catch(e) {}
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 10));
        }
    }

    if (newEmail) {
        // Log it
        await log("new-email", email, {uid});
    }
}

async function setName(uid, name) {
    var newName = false;
    while (true) {
        try {
            await db.runP("BEGIN IMMEDIATE TRANSACTION;");
            var row = await db.getP("SELECT name FROM names WHERE uid=@UID;", {"@UID": uid});
            if (row && row.name === name) {
                await db.runP("COMMIT;");
        await db.runP("PRAGMA wal_checkpoint(PASSIVE);");
                break;
            }

            await db.runP("DELETE FROM names WHERE uid=@UID;", {"@UID": uid});
            await db.runP("INSERT INTO names (uid, name) VALUES (@UID, @NAME);", {
                "@UID": uid,
                "@NAME": name
            });
            await db.runP("COMMIT;");
        await db.runP("PRAGMA wal_checkpoint(PASSIVE);");
            newName = true;
            break;
        } catch (ex) {
            try { await db.runP("ROLLBACK;"); } catch(e) {}
            await new Promise(r => setTimeout(r, Math.floor(Math.random() * 50) + 10));
        }
    }

    if (newName) {
        // Log it
        await log("new-name", name, {uid});
    }
}

async function login(login, ex) {
    var uid = await getUID(login);
    await session.set("uid", uid);
    await session.set("login", login);

    if (ex && ex.email)
        await setEmail(uid, ex.email);
    if (ex && ex.name)
        await setName(uid, ex.name);

    return uid;
}

module.exports = {getUID, setEmail, setName, login};
?>
