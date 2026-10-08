<?JS
/*
 * Copyright (c) 2020-2024 Yahweasel
 * Gettysburg Beacon Studio Edition
 */

const uid = await include("../../uid.jss");
if (!uid) return;

if (!request.query.i)
    return writeHead(302, {"location": "/panel/rec/"});

const rid = Number.parseInt(request.query.i, 36);
const fs = require("fs");
const config = require("../config.js");
const reclib = await include("../lib.jss");
const recM = require("../rec.js");

const recInfo = await recM.get(rid, uid);
if (!recInfo)
    return writeHead(302, {"location": "/panel/rec/"});

// All recordings are fully unlocked for private studio use
recInfo.purchased = "1";
recInfo.cost = 0;

let hasCaptionsFile = false;
try {
    fs.accessSync(config.rec + "/" + rid + ".ogg.captions", fs.constants.R_OK);
    hasCaptionsFile = true;
} catch (ex) {}

const dlName = (recInfo.name || rid.toString(36));
const uriName = encodeURIComponent(dlName);
const safeName = dlName.replace(/[^A-Za-z0-9]/g, "_");

// Handle actual file download requests
if (request.query.f) {
    await include("./dl.jss", {rid, recInfo, uriName, safeName});
    return;
}

await include("../../head.jss", {title: "Download — " + (recInfo.name || "Recording")});
?>

<style type="text/css">
.dl-card-container {
    max-width: 760px;
    margin: 32px auto;
    padding: 0 16px;
    text-align: left;
}
.dl-card {
    background: var(--bg-panel);
    border: 1px solid var(--border-strong);
    border-radius: 2px;
    padding: 24px;
}
.dl-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 16px;
    margin-bottom: 20px;
    border-bottom: 1px solid var(--border-subtle);
}
.dl-section-title {
    font-family: var(--font-mono);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--text-muted);
    margin: 20px 0 10px 0;
}
.dl-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 10px;
    margin-bottom: 16px;
}
.dl-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: var(--bg-panel-alt) !important;
    color: var(--text-title) !important;
    border: 1px solid var(--border-strong) !important;
    border-radius: 2px !important;
    font-family: var(--font-mono) !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.03em !important;
    text-decoration: none !important;
    transition: all 0.12s ease;
}
.dl-btn:hover {
    background: #ffffff !important;
    color: #000000 !important;
    border-color: #ffffff !important;
}
.dl-meta-row {
    display: flex;
    gap: 24px;
    font-family: var(--font-mono);
    font-size: 11px;
    color: var(--text-muted);
    margin-bottom: 16px;
}
.dl-meta-row strong {
    color: var(--text-title);
}
</style>

<div class="dl-card-container">
    <div style="margin-bottom: 14px;">
        <a href="/panel/rec/" class="button" style="padding: 4px 10px; font-size: 11px;">
            <i class="bx bx-arrow-back"></i> Back to Recordings
        </a>
    </div>

    <div class="dl-card">
        <div class="dl-card-header">
            <div>
                <h1 class="brand-title" style="margin: 0;"><?JS= recInfo.name || "(Anonymous)" ?></h1>
            </div>
            <div>
                <span class="status-badge status-ready">SAVED ON JELLY</span>
            </div>
        </div>

        <div class="dl-meta-row">
            <div>INIT: <strong><?JS= recInfo.init || "-" ?></strong></div>
            <?JS if (recInfo.end && recInfo.start) {
                const dur = new Date(recInfo.end).getTime() - new Date(recInfo.start).getTime();
                const m = Math.round(dur / 60000);
            ?>
            <div>DURATION: <strong><?JS= m ?> min</strong></div>
            <?JS } ?>
        </div>

        <div class="dl-section-title">Master Production Formats</div>
        <div class="dl-grid">
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=flac" class="dl-btn">
                <i class="bx bxs-music"></i> FLAC (Lossless)
            </a>
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=aup" class="dl-btn">
                <i class="bx bxs-folder-open"></i> Audacity Project
            </a>
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=wav" class="dl-btn">
                <i class="bx bxs-file"></i> WAV (PCM Uncompressed)
            </a>
        </div>

        <div class="dl-section-title">Compressed Formats</div>
        <div class="dl-grid">
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=opus" class="dl-btn">
                <i class="bx bxs-volume-full"></i> Opus
            </a>
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=aac" class="dl-btn">
                <i class="bx bxs-volume-low"></i> AAC
            </a>
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=vorbis" class="dl-btn">
                <i class="bx bxs-disc"></i> Ogg Vorbis
            </a>
        </div>

        <?JS if (hasCaptionsFile) { ?>
        <div class="dl-section-title">Subtitles &amp; Captions</div>
        <div class="dl-grid">
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=vtt" class="dl-btn">
                <i class="bx bxs-captions"></i> WebVTT Captions
            </a>
        </div>
        <?JS } ?>

        <div class="dl-section-title">Raw Bitstream Backup</div>
        <div class="dl-grid">
            <a href="?i=<?JS= recInfo.rid.toString(36) ?>&amp;f=raw" class="dl-btn">
                <i class="bx bxs-data"></i> Raw Session Audio
            </a>
        </div>
    </div>
</div>

<?JS
await include("../../../tail.jss");
?>
