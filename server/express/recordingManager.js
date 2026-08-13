const cproc = require("child_process");
const fs = require("fs");
const path = require("path");
const { db } = require("../../db");
const recM = require("../../rec");
const config = require("../../config.js");

function startRecording(msg, socketCallback) {
    const p = cproc.fork(path.join(__dirname, "../ennuicastr.js"), {
        detached: true
    });

    p.send({c:"info",r:msg.r});

    p.on("message", async function(pmsg) {
        if (socketCallback) {
            socketCallback(pmsg);
        }
    });

    return p;
}

async function checkExpiry() {
    try {
        let expired = await db.allP("SELECT * FROM recordings WHERE expiry <= datetime('now');");
        for (let ei = 0; ei < expired.length; ei++) {
            let rec = expired[ei];
            await recM.del(rec.rid, rec.uid);
        }
    } catch (ex) {
        console.error("checkExpiry error:", ex);
    }
    setTimeout(checkExpiry, 1000*60*60);
}

if (process.env.NODE_ENV !== 'test') {
    checkExpiry();
}

module.exports = {
    startRecording,
    checkExpiry
};
