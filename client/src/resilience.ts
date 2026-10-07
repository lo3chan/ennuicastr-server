/*
 * Beacon Studio - Audio & Device Resilience Engine
 * Provides persistent background keep-alive, wake locks, audio context auto-recovery,
 * and navigation protection across desktop and mobile devices.
 */

import * as log from "./log";
import * as util from "./util";

// Screen WakeLock sentinel
let wakeLockSentinel: any = null;

// iOS Audio Keepalive element
let keepaliveAudio: HTMLAudioElement | null = null;

// Track active recording state for navigation protection
let isRecordingActive = false;
let pendingBufferCount = 0;

/**
 * Initialize all resilience and hardware keep-alive hooks.
 */
export function initResilience(getAudioContext: () => AudioContext | null): void {
    initWakeLock();
    initIOSAudioKeepalive();
    initAudioContextWatcher(getAudioContext);
    initNavigationGuard();
    initHeadphoneCheck();
}

/**
 * Inform the resilience engine that recording state has changed.
 */
export function setRecordingActive(active: boolean): void {
    isRecordingActive = active;
    if (active) {
        requestWakeLock();
        startIOSKeepalive();
    } else {
        stopIOSKeepalive();
    }
}

/**
 * Update the pending local buffer count (for beforeunload protection).
 */
export function setPendingBufferCount(count: number): void {
    pendingBufferCount = count;
}

/**
 * 1. Screen WakeLock API
 * Keeps the mobile / laptop screen active and prevents aggressive sleep states.
 */
function initWakeLock(): void {
    if (!("wakeLock" in navigator)) return;

    // Re-acquire lock whenever visibility changes to visible
    document.addEventListener("visibilitychange", async () => {
        if (document.visibilityState === "visible" && (isRecordingActive || wakeLockSentinel === null)) {
            await requestWakeLock();
        }
    });
}

async function requestWakeLock(): Promise<void> {
    if (!("wakeLock" in navigator)) return;
    try {
        if (wakeLockSentinel && !wakeLockSentinel.released) return;
        wakeLockSentinel = await (navigator as any).wakeLock.request("screen");
        wakeLockSentinel.addEventListener("release", () => {
            wakeLockSentinel = null;
        });
    } catch (ex) {
        // WakeLock request can fail if battery saver is strict or window is backgrounded
    }
}

/**
 * 2. iOS Audio Keep-Alive
 * iOS Safari kills WebAudio and microphone capture when the screen locks or tabs blur
 * unless an inaudible audio stream is actively playing in an HTML5 <audio> tag.
 */
function initIOSAudioKeepalive(): void {
    const ua = navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    if (!isIOS) return;

    // Create a 1-second silent WAV base64 loop
    // 44.1kHz mono 16-bit PCM silence
    const silentWavBase64 = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQQAAAAAAP8A/w==";

    keepaliveAudio = document.createElement("audio");
    keepaliveAudio.setAttribute("playsinline", "true");
    keepaliveAudio.setAttribute("webkit-playsinline", "true");
    keepaliveAudio.loop = true;
    keepaliveAudio.volume = 0.0001; // Inaudible
    keepaliveAudio.src = silentWavBase64;
    keepaliveAudio.style.display = "none";
    document.body.appendChild(keepaliveAudio);
}

function startIOSKeepalive(): void {
    if (keepaliveAudio) {
        keepaliveAudio.play().catch(() => {
            // Will play upon first user interaction
            const resumeOnTouch = () => {
                if (keepaliveAudio) keepaliveAudio.play().catch(() => {});
                window.removeEventListener("touchstart", resumeOnTouch);
                window.removeEventListener("click", resumeOnTouch);
            };
            window.addEventListener("touchstart", resumeOnTouch, { once: true });
            window.addEventListener("click", resumeOnTouch, { once: true });
        });
    }
}

function stopIOSKeepalive(): void {
    if (keepaliveAudio) {
        keepaliveAudio.pause();
    }
}

/**
 * 3. AudioContext Interruption Auto-Recovery
 * Watches for iOS interruptions (phone calls, alarms, Siri, headphones unplugged)
 * and automatically restores the context as soon as possible.
 */
function initAudioContextWatcher(getAudioContext: () => AudioContext | null): void {
    const tryResume = async () => {
        const ac = getAudioContext();
        if (ac && (ac.state === "suspended" || (ac.state as string) === "interrupted")) {
            try {
                await ac.resume();
                log.pushStatus("audiocontext", "Audio context resumed successfully.");
                setTimeout(() => log.popStatus("audiocontext"), 2000);
            } catch (ex) {
                // Requires touch gesture
            }
        }
    };

    // Watch visibility change
    document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") {
            tryResume();
        }
    });

    // Watch focus and user clicks
    window.addEventListener("focus", tryResume);
    window.addEventListener("click", tryResume);
    window.addEventListener("touchstart", tryResume);

    // Watch audio context state if supported
    const checkState = () => {
        const ac = getAudioContext();
        if (ac) {
            ac.onstatechange = () => {
                if (ac.state === "suspended" || (ac.state as string) === "interrupted") {
                    tryResume();
                }
            };
        }
    };
    setTimeout(checkState, 1000);
}

/**
 * 4. Navigation & Unload Guard
 * Prevents accidental loss of audio data if a guest attempts to close or reload the tab.
 */
function initNavigationGuard(): void {
    window.addEventListener("beforeunload", (ev) => {
        if (isRecordingActive || pendingBufferCount > 0) {
            const message = "Recording is still active or syncing audio chunks. If you leave now, recent audio may be lost.";
            ev.preventDefault();
            ev.returnValue = message;
            return message;
        }
    });
}

/**
 * 5. Headphone Detection & Quality Advisory
 * Advises mobile users to wear headphones to prevent acoustic echo cancellation
 * from ducking their master recording.
 */
function initHeadphoneCheck(): void {
    const isMobile = /android|iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase()) || (navigator.maxTouchPoints > 1);
    if (!isMobile) return;

    const checkDevices = async () => {
        if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const hasHeadphones = devices.some(d => {
                const label = (d.label || "").toLowerCase();
                return label.includes("headphone") || label.includes("headset") || label.includes("airpod") || label.includes("buds") || label.includes("bluetooth");
            });

            if (!hasHeadphones) {
                showToast("🎧 Tip: Use headphones or earbuds for the cleanest studio audio without echo.", 8000);
            }
        } catch (ex) {}
    };

    setTimeout(checkDevices, 4000);
    if (navigator.mediaDevices) {
        navigator.mediaDevices.addEventListener("devicechange", checkDevices);
    }
}

/**
 * Toast notification utility for clean, accessible studio tips.
 */
export function showToast(message: string, durationMs = 5000): void {
    const existing = document.getElementById("beacon-studio-toast");
    if (existing) existing.remove();

    const toast = document.createElement("div");
    toast.id = "beacon-studio-toast";
    toast.style.position = "fixed";
    toast.style.bottom = "80px";
    toast.style.left = "50%";
    toast.style.transform = "translateX(-50%)";
    toast.style.backgroundColor = "rgba(20, 24, 33, 0.95)";
    toast.style.color = "#ffffff";
    toast.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    toast.style.borderRadius = "24px";
    toast.style.padding = "10px 20px";
    toast.style.fontSize = "14px";
    toast.style.fontWeight = "500";
    toast.style.boxShadow = "0 8px 24px rgba(0, 0, 0, 0.5)";
    toast.style.zIndex = "99999";
    toast.style.display = "flex";
    toast.style.alignItems = "center";
    toast.style.gap = "10px";
    toast.style.transition = "opacity 0.3s ease";
    toast.innerText = message;

    document.body.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = "0";
        setTimeout(() => toast.remove(), 300);
    }, durationMs);
}
