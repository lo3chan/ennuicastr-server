<?JS!
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

const uid = await include("../uid.jss");
if (!uid) return;

const config = require("../config.js");
const db = require("../db.js").db;
const creditsj = await include("../credits.jss");

const accountCredits = await creditsj.accountCredits(uid);

// Check that this user isn't over the simultaneous recording limit (note: 0x30 == finished)
var recordings = await db.allP("SELECT rid FROM recordings WHERE uid=@UID AND status<0x30;", {"@UID": uid});
if (recordings.length >= config.limits.simultaneous)
    return;

const defaults = await (async function() {
    var row = await db.getP("SELECT * FROM defaults WHERE uid=@UID;", {"@UID": uid});
    if (!row)
        row = {
            name: "",
            format: "flac",
            continuous: true,
            rtc: true,
            recordOnly: false,
            videoRec: false,
            transcription: false,
            universal_monitor: true,
            extra: "{}"
        };
    row.universal_monitor = !!row.universal_monitor;
    try {
        row.extra = JSON.parse(row.extra);
        if (!row.extra)
            row.extra = {};
    } catch (ex) {
        row.extra = {};
    }
    row.jitsiAudio = row.extra.jitsiAudio;
    row.jitsiVideo = row.extra.jitsiVideo;
    row.noDualEC = row.extra.noDualEC;
    return row;
})();
?>

<style type="text/css">
.explainer {
    position: absolute;
    z-index: 10;
    max-width: 28em;
    background-color: var(--bg-panel-alt);
    color: var(--text-body);
    border: 1px solid var(--border-strong);
    border-radius: 2px;
    padding: 10px 14px;
    font-family: var(--font-mono);
    font-size: 11px;
    line-height: 1.5;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}
.studio-card-container {
    max-width: 680px;
    margin: 24px auto;
    text-align: left;
}
.studio-card {
    background: var(--bg-panel);
    border: 1px solid var(--border-strong);
    border-radius: 2px;
    padding: 24px;
    box-shadow: none;
}
.studio-card:hover {
    border-color: var(--border-highlight);
}
.studio-card-header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    margin-bottom: 20px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--border-subtle);
}
.studio-card-title {
    font-size: 14px;
    font-weight: 700;
    color: var(--text-title);
    font-family: var(--font-mono);
    text-transform: uppercase;
    letter-spacing: -0.01em;
    margin: 0;
}
.studio-card-subtitle {
    font-size: 12px;
    color: var(--text-muted);
    font-family: var(--font-sans);
    margin-top: 4px;
    margin-bottom: 0;
}
.studio-form-group {
    margin-bottom: 14px;
}
.studio-form-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 6px;
}
.studio-form-label {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
}
.studio-tag-required {
    font-family: var(--font-mono);
    font-size: 10px;
    font-weight: 600;
    color: var(--text-title);
    background: #202024;
    border: 1px solid #303036;
    padding: 1px 6px;
    border-radius: 2px;
    text-transform: uppercase;
    letter-spacing: 0.03em;
}
.studio-text-input, .studio-select-input {
    width: 100%;
    box-sizing: border-box;
    padding: 8px 12px;
    background: var(--bg-panel-alt) !important;
    border: 1px solid var(--border-strong) !important;
    border-radius: 2px !important;
    color: var(--text-title) !important;
    font-size: 12px !important;
    font-family: var(--font-mono) !important;
    box-shadow: none !important;
    transition: border-color 0.12s ease;
}
.studio-text-input:focus, .studio-select-input:focus {
    outline: none;
    border-color: #ffffff !important;
    box-shadow: none !important;
}
.studio-checkbox-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 8px 12px;
    background: var(--bg-panel-alt);
    border: 1px solid var(--border-subtle);
    border-radius: 2px;
    margin-bottom: 6px;
    cursor: pointer;
    transition: border-color 0.12s ease, background 0.12s ease;
}
.studio-checkbox-row:hover {
    border-color: var(--border-strong);
    background: #202025;
}
.studio-checkbox-left {
    display: flex;
    align-items: center;
    gap: 10px;
}
.studio-checkbox-left input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
    accent-color: #ffffff;
}
.studio-checkbox-label {
    font-weight: 500;
    font-size: 12px;
    color: var(--text-body);
    font-family: var(--font-sans);
    margin: 0;
    cursor: pointer;
}
.studio-help-link {
    color: var(--text-dim);
    font-size: 13px;
}
.studio-help-link:hover {
    color: var(--text-title);
}
.studio-create-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    width: 100%;
    margin-top: 18px;
    padding: 10px 16px;
    background: #1e1e22 !important;
    color: #ffffff !important;
    border: 1px solid var(--border-strong) !important;
    border-radius: 2px !important;
    font-family: var(--font-mono) !important;
    font-weight: 600 !important;
    font-size: 11px !important;
    text-transform: uppercase !important;
    letter-spacing: 0.04em !important;
    box-shadow: none !important;
    cursor: pointer;
    text-decoration: none;
    transition: all 0.12s ease;
}
.studio-create-btn:hover {
    background: #ffffff !important;
    color: #000000 !important;
    border-color: #ffffff !important;
}
.studio-create-btn:active {
    transform: none !important;
}
</style>

<div class="studio-card-container">
    <div class="studio-card">
        <div class="studio-card-header">
            <h1 class="studio-card-title">Create a new recording</h1>
        </div>

        <div id="create-recording" style="display: block;">
            <span style="display: block; text-align: left">
        <?JS
        var els = [];

        function l(forr, txt, alt) {
            write('<div class="studio-form-label-row"><label class="studio-form-label" for="r-' + forr + '">' + txt + '</label>' +
                (forr === "name" ? '<span class="studio-tag-required">Required</span>' : '') +
                (alt ? '<a class="studio-help-link" href="javascript:toggle(\'' + forr + '\')" aria-label="Help on this feature"><i class="bx bx-help-circle"></i></a>' : '') +
                '</div>');
        }

        function txt(id, q, limit) {
            write('<div class="studio-form-group">' +
                  '<input id="r-' + id + '" type="text" class="studio-text-input"' +
                  (limit ? (' maxlength=' + limit) : '') +
                  ' />' +
                  '<script type="text/javascript"><!--\n' +
                  '$("#r-' + id + '")[0].value = ' + JSON.stringify(defaults[id]) + ';\n' +
                  '//--></script></div>');
            els.push([id, q]);
        }

        function sel(id, q, opts) {
            write('<div class="studio-form-group">' +
                  '<select id="r-' + id + '" class="studio-select-input">');
            opts.forEach((opt) => {
                write('<option value="' + opt[0] + '"' +
                      (defaults[id]===opt[0]?' selected':'') +
                      '>' + opt[1] + '</option>');
            });
            write('</select></div>');

            els.push([id, q]);
        }

        function chkRow(id, q, labelText, altText) {
            write('<div class="studio-checkbox-row" onclick="var c=$(\'#r-' + id + '\')[0]; if(event.target!==c) c.click();">' +
                  '  <div class="studio-checkbox-left">' +
                  '    <input id="r-' + id + '" type="checkbox"' + (defaults[id]?' checked':'') + ' onclick="event.stopPropagation();" />' +
                  '    <label class="studio-checkbox-label" for="r-' + id + '">' + labelText + '</label>' +
                  '  </div>' +
                  (altText ? '  <a class="studio-help-link" href="javascript:void(0)" onclick="event.stopPropagation(); toggle(\'' + id + '\')" aria-label="Help"><i class="bx bx-help-circle"></i></a>' : '') +
                  '</div>');
            if (altText) {
                write('<div id="alt-' + id + '" class="explainer" style="display: none" role="alert">' + altText + '</div>');
            }
            els.push([id, q]);
        }

        function alt(id, text) {
            write('<div id="alt-' + id + '" class="explainer" style="display: none" role="alert">' + text + '</div>');
        }

        l("name", "Recording name");
        txt("name", "n", config.limits.recNameLength);

        chkRow("persist", "persist", "Persistent room", "If checked, the link to join the recording will be persistent, and new recordings will be created by that link on demand. If unchecked, the link to join the recording is temporary, and is only valid for the duration of a single recording session.");

        chkRow("videoRec", "v", "Record video", "If checked, participants who enable their camera or share their screen will also have their video recorded by default, and sent to the host. This can be changed within the Studio recording application.");

        const showQual = true;

        // Quality option button
        ?>
        <br/>
        <div style="text-align: center">
        <a id="quality-b" class="button<?JS= showQual ? " disabled" : "" ?>" href="javascript:showQuality();">
        <i class="bx bxs-volume-full"></i> Quality options
        </a></div>

        <div id="quality"<?JS= showQual ? "" : ' style="display: none"' ?>>
        <?JS

        l("format", "Recording format", true);
        sel("format", "f", [["flac", "Ultra quality (Lossless FLAC)"], ["opus", "High quality (Opus)"]]);
        alt("format", "Format that guests will use to record locally. Lossless FLAC captures bit-perfect studio master audio. Opus offers high-efficiency compressed audio.");

        chkRow("continuous", "c", "Continuous recording", "By default, the recorder uses voice activity detection (VAD) to conserve space. Check this to disable VAD and record a continuous, gap-free master track.");

        ?></div><br/>

        <a id="launch-b" class="studio-create-btn" href="javascript:launchRecording();">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #c88265; margin-right: 4px;"></span> Create Recording &rarr;
        </a>
    </span>
</div>
</div>
</div>

<script type="text/javascript">
var clientUrl, clientWindow;

function createRecording() {
    $("#create-recording-b")[0].classList.add("disabled");
    $("#create-recording")[0].style.display = "block";
    $("#r-name")[0].select();
}

function showQuality() {
    $("#quality-b")[0].classList.add("disabled");
    $("#quality")[0].style.display = "block";
}

function launchRecording() {
    $("#launch-b")[0].classList.add("disabled");
    try {
        $("#quality-b")[0].classList.add("disabled");
    } catch (ex) {}

    clientWindow = window.open("/panel/rec/loading.jss", "",
        "width=800,height=600,menubar=0,toolbar=0,location=0,personalbar=0,status=0");

    var els = <?JS= JSON.stringify(els) ?>;
    var q = { r: 1 };
    els.forEach(function(el) {
        var h = $("#r-"+el[0])[0];
        if (!h) return;
        if (h.type === "checkbox")
            q[el[1]] = (h.checked?1:0);
        else
            q[el[1]] = h.value;
        h.disabled = true;
    });

    fetch("/panel/rec/start.jss", {
        method: "POST",
        headers: {"content-type": "application/json"},
        body: JSON.stringify(q)

    }).then(function(res) {
        return res.text();

    }).then(function(res) {
        res = JSON.parse(res);

        // Check for failure
        if (res.error) {
            clientWindow.document.body.innerText = "Recording failed!\n\n" + res.error;
            document.location = "/panel/rec/";
            return;
        }

        // Get the feature flags
        var features = 0;
        if (res.continuous)
            features |= 1;
        if (res.rtc)
            features |= 2;
        if (res.videoRec)
            features |= 4;
        if (res.transcription)
            features |= 8;
        if (res.recordOnly)
            features |= 0x100;
        if (res.extra && res.extra.jitsiAudio)
            features |= 0x800;
        if (res.extra && res.extra.jitsiVideo)
            features |= 0x1000;
        if (res.extra && res.extra.noDualEC)
            features |= 0x2000;
        if (res.format === "flac")
            features |= 0x10;

        // Make the URL
        var url = <?JS= JSON.stringify(config.clientShort) ?>;
        if (res.lid) {
            url +=
                "?" + res.lid.toString(36) +
                "-" + res.lkey.toString(36) +
                "-m" + res.lmaster.toString(36);
        } else {
            url +=
                "?" + res.rid.toString(36) +
                "-" + res.key.toString(36) +
                "-m" + res.master.toString(36) +
                "-p" + res.port.toString(36);
        }
        url +=
            "-f" + features.toString(36) +
            "&quick=1";

        // Wait for the window to change before redirecting ourselves
        var oldLoc = clientWindow.location.href;
        clientWindow.location.href = url;
        var maxWait = 20;
        var interval = setInterval(function() {
            let changed = false;
            try {
                changed = (clientWindow.location.href !== oldLoc);
            } catch (ex) {
                changed = true;
            }
            if (changed) {
                clearInterval(interval);
                document.location = "/panel/rec/";
            } else if (--maxWait <= 0) {
                clearInterval(interval);
                try {
                    clientWindow.close();
                } catch (ex) {}
                window.open(url, "",
                    "width=800,height=600,menubar=0,toolbar=0,location=0,personalbar=0,status=0");
                document.location = "/panel/rec/";
            }
        }, 250);

    }).catch(function(ex) {
        clientWindow.document.body.innerText = "Recording failed!\n\n" + ex + "\n\n" + ex.stack;
        document.location = "/panel/rec/";

    });
}

function toggle(feature) {
    var el = $("#alt-" + feature)[0];
    el.style.display = (el.style.display==="none")?"":"none";
}
</script>
