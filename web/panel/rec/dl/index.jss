<?JS
/*
 * Copyright (c) 2020-2024 Yahweasel
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

// Get all the info and make sure it's correct
const uid = await include("../../uid.jss");
if (!uid) return;

if (!request.query.i)
    return writeHead(302, {"location": "/panel/rec/"});

const rid = Number.parseInt(request.query.i, 36);

const noRedirect = !!request.query.noredirect;

const cp = require("child_process");
const fs = require("fs");

const config = require("../config.js");
const edb = require("../db.js");
const db = edb.db;
const log = edb.log;

const reclib = await include("../lib.jss");
const recM = require("../rec.js");



const recInfo = await recM.get(rid, uid);
if (!recInfo)
    return writeHead(302, {"location": "/panel/rec/"});
let recInfoExtra = null;
try {
    recInfoExtra = JSON.parse(recInfo.extra);
} catch (ex) {}

let hasCaptionsFile = false;
try {
    fs.accessSync(config.rec + "/" + rid + ".ogg.captions", fs.constants.R_OK);
    hasCaptionsFile = true;
} catch (ex) {}





// If they requested captioning, perform it
if (request.query.captionImprover &&
    (!recInfoExtra || !recInfoExtra.captionImprover)) {
    // Start the process
    const p = cp.spawn("./caption-improver-runpod-whisper.js", [
        `${config.rec}/${rid}.ogg.captions`, `${rid}`
    ], {
        cwd: `${config.repo}/cook`,
        stdio: "ignore",
        detached: true
    });
    recInfoExtra = recInfoExtra || {};
    recInfoExtra.captionImprover = p.pid || true;

    // And mark it as in progress
    while (true) {
        try {
            await db.runP("BEGIN TRANSACTION;");

            // Get the current status
            let row = await db.getP("SELECT extra FROM recordings WHERE uid=@UID AND rid=@RID;", {
                "@UID": recInfo.uid,
                "@RID": rid
            });
            if (!row) {
                await db.runP("ROLLBACK;");
                break;
            }

            // Add the captionImprover pid
            let extra = {};
            try {
                extra = JSON.parse(row.extra);
            } catch (ex) {}
            extra.captionImprover = p.pid || true;
            extra = JSON.stringify(extra);

            // And put it back
            await db.runP("UPDATE recordings SET extra=@EXTRA WHERE uid=@UID AND rid=@RID;", {
                "@EXTRA": extra,
                "@UID": uid,
                "@RID": rid
            });

            await db.runP("COMMIT;");

            break;

        } catch (ex) {
            await db.runP("ROLLBACK;");
        }
    }

    // Redirect to the normal download site
    writeHead(302, {"location": "?i=" + recInfo.rid.toString(36)});
    return;
}

const dlName = (function() {
    if (recInfo.name)
        return recInfo.name;
    else
        return rid.toString(36);
})();

const uriName = encodeURIComponent(dlName);
const safeName = dlName.replace(/[^A-Za-z0-9]/g, "_");

// Maybe do an actual download
if (request.query.f) {
    await include("./dl.jss", {rid, recInfo, uriName, safeName});
    return;
}

// Since we show the download header at different points, a function to generate it
function dlHeader() {
    ?><header><h2>Download <?JS= recInfo.name.replace(/[<>]/g, "") || "(Anonymous)" ?></h2></header><?JS
}

// Show the downloader
await include("../../head.jss", {title: "Download"});

// Check for captioning in progress
if (recInfoExtra && recInfoExtra.captionImprover) {
    if (!hasCaptionsFile) {
?>
        <section class="wrapper special style1" id="captions-dialog">
            <header><h2>Note</h2></header>

            <p>Transcription is currently in progress. The transcript is not yet available.</p>

            <?JS if (recInfo.transcription) { ?>
                <p>The captions generated live while recording are available until the improved captions have been generated.</p>
            <?JS } ?>
        </section>
<?JS
    }
}
?>

<link rel="stylesheet" href="ennuicastr-download-chooser.css" />

<section class="wrapper special">
    <?JS
    const {showDLHeader, showMainDLs, showOtherDLs, showDL} =
        await include("./dl-interface.jss", {rid, recInfo, dlHeader});

    showDLHeader();

    let useDLX = (!request.query.nox);
    if (useDLX) {
        await include("./dlx-interface.jss", {rid, recInfo, safeName, noRedirect});
    } else {
        showMainDLs();
        await include("./video-interface.jss", {rid, recInfo});
    }


    if (true) {
        await include("./transcript-interface.jss", {
            rid, recInfo, recInfoExtra, hasCaptionsFile, showDL
        });
    }

    if (!useDLX)
        showOtherDLs();
    ?>
</section>

<?JS
await include("../../../tail.jss");
?>
