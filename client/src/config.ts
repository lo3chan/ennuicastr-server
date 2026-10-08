/*
 * Copyright (c) 2018-2025 Yahweasel
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

/*
 * This file is part of Ennuicastr.
 *
 * Configuration and initial loading.
 */

import * as fileStorage from "./file-storage";
import { prot } from "./protocol";
import { dce, gebi, escape } from "./util";

/* These are the features selectable in the URL, not (necessarily) the
 * protocol */
export const features = {
    "continuous": 0x1,
    "rtc": 0x2,
    "videorec": 0x4,
    "transcription": 0x8,
    "recordOnly": 0x100,
    "rtennuiAudio": 0x200,
    "rtennuiVideo": 0x400,
    "jitsiAudio": 0x800,
    "jitsiVideo": 0x1000,
    "nonDualEC": 0x2000
};

// Base URL from which to load things when an absolute path is needed
export const baseURL = new URL(window.location.href);
baseURL.hash = "";
baseURL.search = "";
baseURL.pathname = baseURL.pathname.replace(/\/[^\/]*$/, "");

// Configuration parameters come out of the URL search query
export const url = new URL(window.location.href);
const params = new URLSearchParams(url.search);

// Configuration information
export let config: any = null;

// Configuration information for invite links
export let iconfig: any = null;

// Our username
export let username: string = null;

// The Jitsi URL
export let jitsiUrl: string = null;

// The RTEnnui URL
export let rtennuiUrl: string = null;

// Should we be creating FLAC?
export let useFlac = false;

// Which features to use
export let useContinuous = false;
export let useRTC = false;
export const useJitsi = {
    audio: false,
    video: false
};
export const useRTEnnui = {
    audio: false,
    video: false
};
export let useVideoRec = false;
export let useTranscription = false;
export let useRecordOnly = false;
export let useDualECDefault = true;
export let useDebug = false;

/**
 * Load configuration information.
 */
export async function load(): Promise<boolean> {
    // Convert short-form configuration into long-form
    let shortForm: null|string = null;
    Array.from((<any> params).entries()).forEach(function(key: string) {
        key = key[0];
        if (/-/.test(key))
            shortForm = key;
    });

    if (shortForm) {
        const sfParts = shortForm.split("-");
        params.set("i", sfParts[0]);
        params.set("k", sfParts[1]);
        sfParts.slice(2).forEach(function(part) {
            params.set(part[0], part.slice(1));
        });
        params.delete(shortForm);
    }

    // Get our target for initial login
    const preEc = gebi("pre-ec");
    const loginTarget = gebi("login-ec") || document.body;

    // Read in our configuration
    config = {
        id: params.get("i"),
        key: params.get("k"),
        format: params.get("f")
    };
    iconfig = {}; // invite config
    const port = params.get("p");
    const master = params.get("m");
    const selector = params.get("s");
    const monitor = params.get("mon");
    username = params.get("nm");

    if (config.id === null) {
        // Redirect to the homepage
        window.location = <any> "/";
        return false;
    }

    // Normalize
    config.id = iconfig.id = Number.parseInt(config.id, 36);
    if (config.key === null) {
        const div = dce("div");
        div.className = "studio-login-overlay";
        div.innerHTML =
            '<div class="studio-login-card">' +
                '<div class="studio-login-icon" style="background:#c88265"><i class="bx bx-error"></i></div>' +
                '<h2 class="studio-login-title">Invalid Key</h2>' +
                '<p class="studio-login-subtitle">The recording invite key is missing or invalid.</p>' +
            '</div>';
        loginTarget.appendChild(div);
        if (preEc) preEc.style.display = "";
        return false;
    }
    config.key = iconfig.key = Number.parseInt(config.key, 36);
    if (master !== null)
        config.master = iconfig.master = Number.parseInt(master, 36);
    if (port !== null)
        config.port = iconfig.port = Number.parseInt(port, 36);
    if (config.format === null)
        config.format = "0";
    config.format = iconfig.format = Number.parseInt(config.format, 36);

    // If we're using the selector, just do that
    if (selector) {
        let div = dce("div");
        div.className = "studio-login-overlay";
        const sb = "?i=" + config.id.toString(36) + "&k=" + config.key.toString(36) + "&p=" + config.port.toString(36);
        let linksHtml = "";

        for (let opt = 0; opt <= config.format; opt++) {
            if ((opt&config.format)!==opt) continue;
            // We don't let the menu decide to just not use WebRTC communication
            if ((opt&features.rtc)!==(config.format&features.rtc)) continue;

            let optUrl = new URL(url.toString());
            if (opt === 0)
                optUrl.search = sb;
            else
                optUrl.search = sb + "&f=" + opt.toString(36);

            const optLabel = (((opt&prot.flags.dataTypeMask)===prot.flags.dataType.flac) ? "FLAC (Lossless Studio Master)" : "Opus (High Quality Audio)") +
                ((opt&features.continuous)?" [Continuous]":"");

            linksHtml += '<div style="margin: 8px 0;"><a href="' + optUrl.toString() + '" class="studio-login-submit" style="display:block; text-decoration:none; box-sizing:border-box;">' + optLabel + '</a></div>';
        }

        div.innerHTML =
            '<div class="studio-login-card">' +
                '<div class="studio-login-icon"><i class="bx bx-link"></i></div>' +
                '<h2 class="studio-login-title">Client Links</h2>' +
                '<p class="studio-login-subtitle">Select recording format to connect:</p>' +
                linksHtml +
            '</div>';

        loginTarget.appendChild(div);
        if (preEc) preEc.style.display = "";

        return false;
    }

    // If we're looking for the monitor, just do that
    if (monitor) {
        const scr = dce("script");
        scr.src = "ennuicastr-monitor.js?v=1";
        scr.async = true;
        loginTarget.appendChild(scr);
        if (preEc) preEc.style.display = "";
        return false;
    }

    // Hide the extraneous details
    url.search = "?i=" + config.id.toString(36);
    window.history.pushState({}, "Beacon Studio", url.toString());

    // If they were disconnected, just show them that message
    if (params.get("dc")) {
        const div = dce("div");
        div.className = "studio-login-overlay";
        let href = "?";
        for (const key in config)
            href += key[0] + "=" + (<any> config)[key].toString(36) + "&";
        href += "nm=" + encodeURIComponent(username);
        div.innerHTML =
            '<div class="studio-login-card">' +
                '<div class="studio-login-icon" style="background:#c88265"><i class="bx bx-wifi-off"></i></div>' +
                '<h2 class="studio-login-title">Disconnected</h2>' +
                '<p class="studio-login-subtitle">Connection to the broadcast session was lost.</p>' +
                '<a href="' + href + '" class="studio-login-submit" style="display:block; text-decoration:none; box-sizing:border-box; margin-top: 1.5rem;">Attempt Reconnection</a>' +
            '</div>';
        loginTarget.appendChild(div);
        if (preEc) preEc.style.display = "";
        return false;
    }

    // Next, check if we have a username
    if (username === null || username === "") {
        const div = dce("div");
        div.className = "studio-login-overlay";
        const quick = !!params.get("quick");

        let def = "";
        if (typeof localStorage !== "undefined")
            def = localStorage.getItem("username") || "";
        def = escape(def);

        let hiddenInputs = "";
        for (const key in config)
            hiddenInputs += "<input name=\"" + key[0] + "\" type=\"hidden\" value=\"" + config[key].toString(36) + "\" />";

        div.innerHTML =
            '<div class="studio-login-card">' +
                '<div class="studio-login-header">' +
                    '<div class="studio-login-icon"><i class="bx bx-broadcast"></i></div>' +
                    '<h2 class="studio-login-title">Beacon Studio</h2>' +
                    '<p class="studio-login-subtitle">' +
                        (quick ? 'Enter your name to connect.' : 'You have been invited to join this recording session.') +
                    '</p>' +
                '</div>' +
                '<form class="studio-login-form" action="?" method="GET">' +
                    '<div class="studio-input-group">' +
                        '<label for="nm" class="studio-input-label">DISPLAY NAME</label>' +
                        '<input name="nm" id="nm" type="text" class="studio-login-input" value="' + def + '" placeholder="e.g. Alex" autofocus required autocomplete="off" />' +
                    '</div>' +
                    hiddenInputs +
                    '<button type="submit" class="studio-login-submit">Join Studio &rarr;</button>' +
                '</form>' +
            '</div>';

        const form = div.querySelector("form");
        form.onsubmit = function(ev: Event) {
            const enteredName = (<HTMLInputElement> gebi("nm")).value.trim();
            if (typeof localStorage !== "undefined" && enteredName) {
                try { localStorage.setItem("username", enteredName); } catch (e) {}
            }

            // Quick mode = same window
            if (quick)
                return true;

            // Try to do this in a new window
            let target = "?";
            for (const key in config)
                target += key[0] + "=" + config[key].toString(36) + "&";
            target += "nm=" + encodeURIComponent(enteredName);
            if (params.get("debug"))
                target += "&debug=1";
            if (window.open(target, "", "width=800,height=600,menubar=0,toolbar=0,location=0,personalbar=0,status=0") === null) {
                // Just use the regular submit
                return true;
            }

            div.innerHTML =
                '<div class="studio-login-card">' +
                    '<div class="studio-login-icon" style="background:#4a7c68"><i class="bx bx-check"></i></div>' +
                    '<h2 class="studio-login-title">Connected</h2>' +
                    '<p class="studio-login-subtitle">Studio is active in a new window. You may close this tab.</p>' +
                '</div>';

            ev.preventDefault();
            return false;
        };

        loginTarget.appendChild(div);
        if (preEc) preEc.style.display = "";

        const nmBox = gebi("nm");
        if (nmBox) {
            nmBox.focus();
            nmBox.select();
        }

        return false;

    } else {
        // Remember the username
        if (typeof localStorage !== "undefined")
            localStorage.setItem("username", username);

    }

    // The Jitsi URL
    jitsiUrl =
        (url.protocol==="http:"?"ws:":"wss:") +
        "//jitsi." + url.hostname + "/xmpp-websocket";

    // The RTEnnui URL
    {
        const tmp = new URL(url);
        tmp.protocol = (tmp.protocol==="http:"?"ws:":"wss:");
        // eslint-disable-next-line no-useless-escape
        tmp.pathname = url.pathname.replace(/\/[^\/]*$/, "/rtennui/ws");
        tmp.search = "";
        tmp.hash = "";
        rtennuiUrl = tmp.toString();
    }

    // Should we be creating FLAC?
    useFlac = ((config.format&prot.flags.dataTypeMask) === prot.flags.dataType.flac);

    // Which features to use
    useContinuous = !!(config.format&features.continuous);
    useRTC = !!(config.format&features.rtc);
    useVideoRec = !!(config.format&features.videorec);
    useTranscription = !!(config.format&features.transcription);
    useRecordOnly = !!(config.format&features.recordOnly);
    useDualECDefault = !(config.format&features.nonDualEC);
    useJitsi.audio = !!(config.format&features.jitsiAudio);
    useJitsi.video = !!(config.format&features.jitsiVideo);
    useRTEnnui.audio = !useJitsi.audio;
    useRTEnnui.video = !useJitsi.video;
    useDebug = !!(params.get("debug"));

    // If we're a host and recording video, we need persistent storage
    if ("master" in config && useVideoRec) {
        let persistent = false;
        if (navigator.storage && navigator.storage.persist && navigator.storage.persisted) {
            persistent = await navigator.storage.persisted();
            if (!persistent)
                persistent = await navigator.storage.persist();
            if (!persistent && typeof Notification !== "undefined" &&
                Notification.requestPermission) {
                await Notification.requestPermission();
                persistent = await navigator.storage.persist();
            }
        }
    }

    // Clear anything expired
    (await fileStorage.getLocalFileStorage()).clearExpired();

    return true;
}

// The WebSock URL
export function wsUrl(): string {
    const proto = (url.protocol === "http:" ? "ws" : "wss");
    // If running over HTTPS (such as Cloudflare Tunnel or standard 443),
    // route via the reverse-proxy endpoint /ws/?port=
    if (url.protocol === "https:" || !url.port || url.port === "80" || url.port === "443") {
        return proto + "://" + url.host + "/ws/?port=" + encodeURIComponent(config.port);
    }
    return proto + "://" + url.hostname + ":" + config.port;
}

// Call if we're disconnected, to forcibly close
export function disconnect(): void {
    try {
        let href = "?";
        for (const key in config)
            href += key[0] + "=" + (<any> config)[key].toString(36) + "&";
        href += "nm=" + encodeURIComponent(username) + "&dc=1";
        document.location.href = href;
    } catch (ex) {
        document.location.href = "?";
    }
}

/* Resolve the correct port (and ID and key) from the config parameters. If no
 * port is provided, we're connecting to a *lobby*, which creates *recordings*
 * on demand, so we need to figure out the current room. */
export function resolve(): Promise<unknown> {
    let p: Promise<unknown> = Promise.all([]);

    if (!config.port) {
        p = p.then(() => {
            const req: any = {
                lid: config.id,
                key: config.key
            };
            if ("master" in config)
                req.master = config.master;

            return fetch("lobby/", {
                method: "POST",
                headers: {"content-type": "application/json"},
                body: JSON.stringify(req)
            });

        }).then(res => {
            if (!res.ok)
                return disconnect();

            return res.json();

        }).then(res => {
            config.id = res.id;
            config.port = res.port;
            config.key = res.key;
            if ("master" in res)
                config.master = res.master;

        });
    }

    return p;
}

/* Color sets for wave vad colors
 * (s|r)(v|c):
 *   s means stopped (not recording)
 *   r means recording
 *   v means using VAD
 *   c means continuous mode
 * Each set is four colors: error, no, maybe, yes
 */
export const waveVADColorSets = {
    "sv": ["#000", "#333", "#666", "#999"],
    "sc": ["#000", "#666", "#666", "#999"],
    "rv": ["#000", "#031", "#061", "#094"],
    "rc": ["#000", "#061", "#061", "#094"],
};

