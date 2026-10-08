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
    background-color: var(--bg-14);
    color: var(--fg-1);
    border: 2px solid var(--border-color);
    border-radius: 8px;
    padding: 1em;
    box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 0.15);
    font-size: 0.88em;
    line-height: 1.5;
}
.studio-card-container {
    max-width: 620px;
    margin: 2em auto;
    text-align: left;
}
.studio-card {
    background: var(--bg-14);
    border: 2px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 4px 4px 0px 0px rgba(0, 0, 0, 0.12);
    padding: 2.2em;
}
.studio-card-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 1.8em;
    padding-bottom: 1.2em;
    border-bottom: 1px solid var(--border-color);
}
.studio-card-title {
    font-size: 1.6em;
    font-weight: 700;
    color: var(--fg-1);
    margin: 0;
    letter-spacing: -0.02em;
}
.studio-card-subtitle {
    font-size: 0.88em;
    color: var(--fg-2);
    margin-top: 0.25em;
    margin-bottom: 0;
}
.studio-card-badge {
    background: var(--bg-15);
    border: 1px solid var(--border-color);
    border-radius: 50%;
    width: 38px;
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--fg-2);
}
.studio-form-group {
    margin-bottom: 1.4em;
}
.studio-form-label-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.4em;
}
.studio-form-label {
    font-weight: 600;
    font-size: 0.9em;
    color: var(--fg-1);
}
.studio-tag-required {
    font-family: 'Space Mono', monospace;
    font-size: 0.72em;
    background: var(--bg-15);
    border: 1px solid var(--border-color);
    padding: 2px 6px;
    border-radius: 4px;
    color: var(--fg-2);
}
.studio-checkbox-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75em 1em;
    background: var(--bg-15);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    margin-bottom: 0.75em;
    cursor: pointer;
}
.studio-checkbox-left {
    display: flex;
    align-items: center;
    gap: 0.75em;
}
.studio-checkbox-left input[type="checkbox"] {
    margin: 0;
    cursor: pointer;
}
.studio-checkbox-label {
    font-weight: 500;
    font-size: 0.92em;
    color: var(--fg-1);
    margin: 0;
    cursor: pointer;
}
.studio-help-link {
    color: var(--fg-4);
    font-size: 1.1em;
}
.studio-help-link:hover {
    color: var(--fg-1);
}
.studio-section-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: transparent;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 0.75em 1em;
    margin-top: 1.2em;
    margin-bottom: 0.75em;
    cursor: pointer;
    font-size: 0.85em;
    font-weight: 700;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--fg-2);
}
.studio-section-toggle:hover {
    background: var(--bg-15);
    color: var(--fg-1);
}
.studio-create-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5em;
    width: 100%;
    margin-top: 1.5em;
    padding: 0.9em 1.5em;
    background-color: var(--bg-7) !important;
    color: #ffffff !important;
    border: 2px solid #23342d !important;
    border-radius: 8px !important;
    font-weight: 700 !important;
    font-size: 1.05em !important;
    box-shadow: 3px 3px 0px 0px rgba(0, 0, 0, 0.25) !important;
    cursor: pointer;
    text-decoration: none;
    transition: transform 0.05s ease, box-shadow 0.05s ease;
}
.studio-create-btn:hover {
    background-color: #2e3e36 !important;
}
.studio-create-btn:active {
    transform: translate(2px, 2px);
    box-shadow: 1px 1px 0px 0px rgba(0, 0, 0, 0.25) !important;
}
.studio-footer-shortcuts {
    display: flex;
    justify-content: center;
    gap: 1em;
    margin-top: 1.5em;
}
.studio-shortcut-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.4em;
    background: var(--bg-15);
    border: 1px solid var(--border-color);
    border-radius: 20px;
    padding: 6px 14px;
    font-size: 0.85em;
    font-weight: 500;
    color: var(--fg-2);
    text-decoration: none;
}
.studio-shortcut-pill:hover {
    border-color: var(--fg-2);
    color: var(--fg-1);
}
</style>

<div class="studio-card-container">
    <div class="studio-card">
        <div class="studio-card-header">
            <div>
                <h1 class="studio-card-title">Create a new recording</h1>
                <p class="studio-card-subtitle">Configure session acoustics and ingestion parameters</p>
            </div>
            <div class="studio-card-badge">
                <i class="bx bx-microphone" style="font-size: 1.25em;"></i>
            </div>
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
                  '<input id="r-' + id + '" type="text" style="width: 100%; box-sizing: border-box;"' +
                  (limit ? (' maxlength=' + limit) : '') +
                  ' />' +
                  '<script type="text/javascript"><!--\n' +
                  '$("#r-' + id + '")[0].value = ' + JSON.stringify(defaults[id]) + ';\n' +
                  '//--></script></div>');
            els.push([id, q]);
        }

        function sel(id, q, opts) {
            write('<div class="studio-form-group">' +
                  '<select id="r-' + id + '" style="width: 100%; box-sizing: border-box;">');
            opts.forEach((opt) => {
                write('<option value="' + opt[0] + '"' +
                      (defaults[id]===opt[0]?' selected':'') +
                      '>' + opt[1] + '</option>');
            });
            write('</select></div>');

            els.push([id, q]);
        }

        function chk(id, q) {
            // Note: chk is called right after l() in the existing code, but let's make it render nicely
            write('<input id="r-' + id + '" type="checkbox"' +
                  (defaults[id]?' checked':'') +
                  ' style="margin-left: 0.5em;" /><br/>');

            els.push([id, q]);
        }

        function alt(id, text) {
            write('<div id="alt-' + id + '" class="explainer" style="display: none" role="alert">' + text + '</div>');
        }

        l("name", "Recording name");
        txt("name", "n", config.limits.recNameLength);

        l("persist", "Persistent room", true);
        chk("persist", "persist");
        alt("persist", "If checked, the link to join the recording will be persistent, and new recordings will be created by that link on demand. If unchecked, the link to join the recording is temporary, and is only valid for the duration of a single recording session.");

        l("videoRec", "Record video", true);
        chk("videoRec", "v");
        alt("videoRec", "If checked, participants who enable their camera or share their screen will also have their video recorded by default, and sent to the host. This can be changed within the Studio recording application.");

        const showQual = true;
        const showAdvanced = (defaults.jitsiAudio ||
                              defaults.jitsiVideo ||
                              !defaults.rtc ||
                              defaults.recordOnly ||
                              defaults.transcription ||
                              defaults.noDualEC);

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

        l("continuous", "Continuous recording", true);
        chk("continuous", "c");
        alt("continuous", "By default, the recorder uses voice activity detection (VAD) to conserve space. Check this to disable VAD and record a continuous, gap-free master track.");

        ?></div><br/><?JS

        // Advanced options button
        ?>
        <div style="text-align: center">
        <a id="advanced-b" class="button<?JS= showAdvanced ? " disabled" : "" ?>" href="javascript:showAdvanced();">
        <i class="bx bx-slider"></i> Advanced options
        </a></div>

        <div id="advanced"<?JS= showAdvanced ? "" : ' style="display: none"' ?>>
        <?JS

        l("transcription", "Live captions", true);
        chk("transcription", "t");
        alt("transcription", "Enable live captions. Currently only English is supported.");

        l("jitsiVideo", "Use Jitsi for video", true);
        chk("jitsiVideo", "xjv");
        alt("jitsiVideo", "Disable Ennuicastr's native live video chat system, and use Jitsi Meet for live chat. Use this only if you're having technical issues with live chat. If you're having issues with both video and audio, you can enable Jitsi for audio after enabling Jitsi for video.");
        ?>

        <div id="jitsi-audio-hider" style="display: none">
            <?JS
            l("jitsiAudio", "Use Jitsi for audio", true);
            chk("jitsiAudio", "xja");
            alt("jitsiAudio", "Use Jitsi Meet for both video and audio.");
            ?>
        </div>
        <?JS

        l("noDualEC", "Disable post hoc EC", true);
        chk("noDualEC", "xndec");
        alt("noDualEC", "By default, Ennuicastr allows you to enable or disable (or both) echo cancellation when downloading, so that you can decide post hoc which sounds better. That is, Ennuicastr supports “post hoc echo cancellation”. However, this feature doubles the bandwidth requirement while recording. Disabling it will save bandwidth, but limit your audio versatility.");

        l("recordOnly", "Mute live voice chat", true);
        chk("recordOnly", "x");
        alt("recordOnly", "Ennuicastr's primary function is to record, but you probably want to <em>hear</em> who you're recording! If you're going to use some other software to actually chat with your guests, check this so that you don't hear them in both. This only <em>mutes</em> live voice chat by default, so that you can still use it for monitoring. To disable live voice chat entirely (and thus disable monitoring), disable WebRTC (the option will appear when you enable this).");
        ?>

        <div id="rtc-hider" style="display: none">
            <?JS
            l("rtc", "Enable WebRTC");
            chk("rtc", "r");
            alt("rtc", "WebRTC is the technology used by Ennuicastr for live voice chat. Normally, even if you don't need live voice chat, WebRTC is still enabled so that you can use it to monitor the recording. If you really wish to disable WebRTC entirely, uncheck this. The only reason to do so is if it causes undue strain on your bandwidth.");
            ?>
        </div>

        </div><br/>

        <a id="launch-b" class="studio-create-btn" href="javascript:launchRecording();">
            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background-color: #c88265; margin-right: 4px;"></span> Create Recording &rarr;
        </a>
    </span>

    <p id="no-rtc-warn" class="warning" style="margin-top: 1em">WARNING: Ennuicastr will record, but you will not be able to actually hear any other users! Only disable voice chat if you're using some other program for voice communication.</p>
</div>
</div>

<div class="studio-footer-shortcuts">
    <a href="/panel/rec/" class="studio-shortcut-pill">
        <i class="bx bx-microphone"></i> Recordings
    </a>
    <span style="color: var(--fg-4);">&bull;</span>
    <a href="/panel/sounds/" class="studio-shortcut-pill">
        <i class="bx bx-music"></i> Soundboard
    </a>
</div>
</div>

<script type="text/javascript">
var clientUrl, clientWindow;

function updateJitsiVideo() {
    var v = $("#r-jitsiVideo")[0].checked;
    $("#jitsi-audio-hider")[0].style.display = v ? "" : "none";
}

$("#r-jitsiVideo")[0].onchange = updateJitsiVideo;
updateJitsiVideo();

function updateRecordOnly() {
    var v = $("#r-recordOnly")[0].checked;
    $("#rtc-hider")[0].style.display = v ? "" : "none";
    if (!v)
        $("#r-rtc")[0].checked = true;
    $("#no-rtc-warn")[0].style.display =
        (v ? "block" : "none");
}

$("#r-recordOnly")[0].onchange = updateRecordOnly;
$("#r-rtc")[0].onchange = updateRecordOnly;
updateRecordOnly();

function createRecording() {
    $("#create-recording-b")[0].classList.add("disabled");
    $("#create-recording")[0].style.display = "block";
    $("#r-name")[0].select();
}

function showQuality() {
    $("#quality-b")[0].classList.add("disabled");
    $("#quality")[0].style.display = "block";
}

function showAdvanced() {
    $("#advanced-b")[0].classList.add("disabled");
    $("#advanced")[0].style.display = "block";
}

function launchRecording() {
    $("#launch-b")[0].classList.add("disabled");
    try {
        $("#quality-b")[0].classList.add("disabled");
    } catch (ex) {}
    try {
        $("#advanced-b")[0].classList.add("disabled");
    } catch (ex) {}

    clientWindow = window.open("/panel/rec/loading.jss", "",
        "width=800,height=600,menubar=0,toolbar=0,location=0,personalbar=0,status=0");

    var els = <?JS= JSON.stringify(els) ?>;
    var q = {};
    els.forEach(function(el) {
        var h = $("#r-"+el[0])[0];
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
