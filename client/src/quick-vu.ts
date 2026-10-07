/*
 * Beacon Studio - Quick VU Meter
 * Ultra-low-overhead audio activity and VU peak meter for mobile & desktop HUD.
 */

import * as audio from "./audio";
import * as util from "./util";

let animFrame: number | null = null;
let analyser: AnalyserNode | null = null;
let sourceNode: MediaStreamAudioSourceNode | null = null;
let vuBar: HTMLElement | null = null;
let vuTrack: HTMLElement | null = null;
let vuIcon: HTMLElement | null = null;
let running = false;
let currentStream: MediaStream | null = null;

export function initQuickVU(): void {
    vuBar = document.getElementById("ec3-quick-vu-bar");
    vuTrack = document.getElementById("ec3-quick-vu-track");
    vuIcon = document.getElementById("ec3-quick-vu-icon");
    if (!vuBar || !vuTrack) return;

    util.events.addEventListener("usermediaready", onUserMediaReady);
    util.events.addEventListener("usermediastopped", onUserMediaStopped);
    util.events.addEventListener("audio.mute", onMuteChange);

    // If mic is already captured, start right away
    if (audio.inputs.length > 0 && audio.inputs[0].userMedia) {
        startMeter();
    }
}

function onUserMediaReady(): void {
    startMeter();
}

function onUserMediaStopped(): void {
    stopMeter();
}

function onMuteChange(): void {
    if (!vuBar || !vuIcon) return;
    const isMuted = audio.inputs.length > 0 && audio.inputs[0].getMute();
    if (isMuted) {
        vuBar.style.width = "0%";
        vuIcon.className = "bx bx-microphone-off";
        vuIcon.style.color = "#ef4444";
    } else {
        vuIcon.className = "bx bx-microphone";
        vuIcon.style.color = "var(--fg-dim)";
    }
}

function startMeter(): void {
    if (!audio.ac || audio.inputs.length === 0 || !audio.inputs[0].userMedia) return;

    const stream = audio.inputs[0].userMedia;
    if (stream === currentStream && running) return;

    stopMeter();

    try {
        if (!stream.getAudioTracks().length) return;

        analyser = audio.ac.createAnalyser();
        analyser.fftSize = 64; // minimal 32 frequency bins for microscopic CPU impact
        analyser.smoothingTimeConstant = 0.25;

        sourceNode = audio.ac.createMediaStreamSource(stream);
        sourceNode.connect(analyser);
        currentStream = stream;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        running = true;

        let lastUpdate = 0;
        const tick = (now: number) => {
            if (!running || !analyser) return;

            // Throttle to max 25 fps (~40ms) to preserve mobile battery
            if (now - lastUpdate >= 40) {
                lastUpdate = now;

                const isMuted = audio.inputs.length > 0 && audio.inputs[0].getMute();
                if (isMuted) {
                    if (vuBar) vuBar.style.width = "0%";
                } else {
                    analyser.getByteFrequencyData(dataArray);
                    let max = 0;
                    for (let i = 0; i < dataArray.length; i++) {
                        if (dataArray[i] > max) max = dataArray[i];
                    }

                    // Normalize to percentage (0..100)
                    const pct = Math.min(100, Math.round((max / 255) * 100));
                    if (vuBar) {
                        vuBar.style.width = pct + "%";
                        if (pct > 80) {
                            vuBar.style.backgroundColor = "#ef4444"; // clipping / hot
                        } else if (pct > 50) {
                            vuBar.style.backgroundColor = "#eab308"; // warm / good voice level
                        } else {
                            vuBar.style.backgroundColor = "#10b981"; // normal / ambient
                        }
                    }
                }
            }

            animFrame = requestAnimationFrame(tick);
        };

        animFrame = requestAnimationFrame(tick);
    } catch (e) {
        console.warn("Could not start quick VU meter:", e);
    }
}

function stopMeter(): void {
    running = false;
    currentStream = null;
    if (animFrame !== null) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
    }
    if (sourceNode) {
        try { sourceNode.disconnect(); } catch (e) {}
        sourceNode = null;
    }
    analyser = null;
    if (vuBar) {
        vuBar.style.width = "0%";
    }
}
