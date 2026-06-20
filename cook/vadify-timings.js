#!/usr/bin/env node
/*
 * Copyright (c) 2020-2023 Yahweasel
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

const cproc = require("child_process");
const fs = require("fs");

const VADReq = require("@ozymandiasthegreat/vad");

const trackNo = +process.argv[2];
const trackFile  = process.argv[3];

// Helpful blanks
const blank1ms = Buffer.alloc(32);
const blank2s = Buffer.alloc(32000);

async function main() {
    const VADCls = await VADReq.default();
    const VADEvent = VADReq.VADEvent;

    // Prepare the VADs at different aggressiveness levels
    const vads = [
        new VADCls(VADReq.VADMode.NORMAL, 16000),
        new VADCls(VADReq.VADMode.AGGRESSIVE, 16000),
        new VADCls(VADReq.VADMode.VERY_AGGRESSIVE, 16000)
    ];

    // Helper function to run the VAD over a chunk of audio
    async function runVAD(curChunks, max, acceptNoise = false) {
        for (const vad of vads) {
            let firstIn = 1/0;
            let lastOut = max;
            let vadTime = 0;

            // Reset the VAD with some blank audio
            // processBuffer requires specific buffer lengths: 10, 20 or 30ms.
            // Using 30ms chunks for resetting. 30ms of 16kHz 16-bit = 480 samples = 960 bytes.
            const blank30ms = Buffer.alloc(960);
            for (let i = 0; i < 32000 / 960; i++) {
                const vres = vad.processBuffer(blank30ms);
                if (vres === VADEvent.SILENCE || vres === VADEvent.ERROR)
                    break;
            }
            vad.processBuffer(blank30ms);

            // Go through each chunk
            for (const chunk of curChunks) { // chunk is Int16Array
                // To use @ozymandiasthegreat/vad, we need to process in 10, 20 or 30ms frames.
                // We'll use 10ms (160 samples, 320 bytes) for fine granularity.
                for (let si = 0; si < chunk.length; si += 160) {
                    let sub = chunk.subarray(si, si + 160);

                    // Pad if necessary to make it exactly 160 samples
                    if (sub.length < 160) {
                        const padded = new Int16Array(160);
                        padded.set(sub);
                        sub = padded;
                    }

                    // Create a Buffer from the underlying 16-bit integer array.
                    // Important: create a new Buffer based on the typed array elements, not the
                    // underlying shared pool chunk.buffer.
                    const buffer = Buffer.alloc(320);
                    for (let i = 0; i < 160; i++) {
                        buffer.writeInt16LE(sub[i], i * 2);
                    }

                    // Process this chunk
                    const vres = vad.processBuffer(buffer);

                    // Because we process in 10ms blocks, we check every 10ms instead of 1ms.
                    // Note: vadTime is in samples (since we increment by 160 for 10ms * 16 kHz),
                    // so we compute the offset in samples. ms runs 0..9 and each ms is 16 samples.
                    for (let ms = 0; ms < 10; ms++) {
                        // The old library used NOISE and VOICE. @ozymandiasthegreat/vad only emits VOICE, SILENCE, ERROR
                        // It does not emit NOISE. Therefore, if acceptNoise is true and it's not SILENCE (or ERROR), we can consider it VOICE.
                        if (vres === VADEvent.VOICE || (acceptNoise && vres !== VADEvent.SILENCE && vres !== VADEvent.ERROR)) {
                            if (vadTime + (ms * 16) < firstIn)
                                firstIn = vadTime + (ms * 16);
                        } else if (vres === VADEvent.SILENCE || (!acceptNoise && vres !== VADEvent.VOICE)) {
                            lastOut = Math.min(vadTime + (ms * 16) + 16, max);
                        }
                    }
                    vadTime += 160; // 160 samples (10ms * 16 samples/ms)
                    if (vadTime >= max)
                        break;
                }
                if (vadTime >= max)
                    break;
            }

            if (lastOut > firstIn) {
                // VAD found something
                return [firstIn, lastOut];
            }
        }

        // None of the VADs hit
        return [1/0, -1];
    }
    // Read the Whisper caption data from stdin
    let captions = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", chunk => captions += chunk);
    await new Promise(res => process.stdin.on("end", res));
    captions = captions.trim().split("\n").map(JSON.parse);

    // Convert to mono 16kHz
    const p = cproc.spawn("/bin/sh", ["-c",
        `ffmpeg -i ${trackFile} -f s16le -ac 1 -ar 16000 -`], {
        stdio: ["ignore", "pipe", "ignore"]
    });

    // Prepare to read
    let stdoutEnded = false;
    p.stdout.on("end", () => stdoutEnded = true);
    let curChunks = [];
    let curStart = 0;
    let curEnd = 0;
    async function readChunk() {
        let chunk = p.stdout.read();
        while (!chunk && !stdoutEnded) {
            await new Promise(res => p.stdout.once("readable", res));
            chunk = p.stdout.read();
        }
        if (!chunk)
            return;
        chunk = new Int16Array(chunk.buffer);
        curEnd += chunk.length;
        curChunks.push(chunk);
    }

    // Go caption-by-caption
    for (let ci = 0; ci < captions.length; ci++) {
        const data = captions[ci];
        if (data.d.c !== "caption")
            continue;
        if (data.d.id !== trackNo)
            continue;
        let caption = data.d.caption;
        if (!caption.length)
            continue;

        process.stderr.write(`${Math.floor(ci / captions.length * 100)}%\r`);

        for (let wi = 0; wi < caption.length; wi++) {
            const word = caption[wi];

            // Check for nonsensical timing
            let start = word.start;
            let end = word.end;
            if (end < start) {
                const tmp = end;
                end = start;
                start = tmp;
            }
            if (end < start + 50) {
                let start = word.start;
                let end = word.end;
                if (wi > 0)
                    start = Math.min(start, caption[wi-1].end);
                if (wi < caption.length - 1)
                    end = Math.max(end, caption[wi+1].start);
                if (end < start + 50) {
                    if (caption.length === 1) {
                        start -= 50;
                        end += 50;
                    } else if (wi === 0) {
                        start -= 100;
                    } else if (wi === caption.length - 1) {
                        end += 100;
                    }
                }
            }

            // Times of this caption, in 16kHz (from milliseconds)
            let capStart = start * 16;
            let capEnd = end * 16;

            // Get to the start time
            while (curStart < capStart) {
                if (curEnd <= curStart || !curChunks.length) {
                    // Need more data
                    await readChunk();
                }

                if (stdoutEnded && (!curChunks || !curChunks.length))
                    break;

                if (curChunks && curChunks.length) {
                    if (curStart + curChunks[0].length <= capStart) {
                        // This chunk is too early, skip it
                        curStart += curChunks[0].length;
                        curChunks.shift();

                    } else {
                        // This chunk includes the time we need
                        curChunks[0] = curChunks[0].subarray(capStart - curStart);
                        curStart = capStart;

                    }
                }
            }

            // Get to the end time
            while (curEnd < capEnd) {
                await readChunk();
                if (stdoutEnded)
                    break;
            }

            // Pass this data through the VAD
            let [firstIn, lastOut] =
                await runVAD(curChunks, capEnd - curStart);

            if (lastOut <= firstIn) {
                if (word.probability < 0.6) {
                    // Probably just not a word
                    word.remove = true;
                } else {
                    /* Whisper is confident that there's a word, but the VAD
                     * failed. try looking for any noise. */
                    [firstIn, lastOut] =
                        await runVAD(curChunks, capEnd - curStart, true);
                }
            }

            if (lastOut > firstIn) {
                word.start = Math.round((curStart + firstIn) / 16);
                word.end = Math.round((curStart + lastOut) / 16);
            }
        }
        data.d.caption = caption = caption.filter(x => !x.remove);
    }
    process.stderr.write("100%\n");

    // Skip any remaining audio
    while (!stdoutEnded) {
        await readChunk();
        while (curChunks.length)
            curChunks.shift();
    }

    // Split captions with long pauses
    const splitCaptions = [];
    for (const data of captions) {
        if (data.d.c !== "caption" || data.d.id !== trackNo) {
            splitCaptions.push(data);
            continue;
        }
        const caption = data.d.caption;
        if (!caption.length)
            continue;

        let lastWord = caption[0];
        let splitCaption = [lastWord];
        for (let wi = 1; wi < caption.length; wi++) {
            const word = caption[wi];
            if (word.start >= lastWord.end + 2000) {
                // Split it here
                splitCaptions.push({
                    t: splitCaption[0].start * 48,
                    d: {
                        c: "caption",
                        id: trackNo,
                        caption: splitCaption
                    }
                });
                splitCaption = [];
            }
            splitCaption.push(word);
            lastWord = word;
        }
        splitCaptions.push({
            t: splitCaption[0].start * 48,
            d: {
                c: "caption",
                id: trackNo,
                caption: splitCaption
            }
        });
    }
    captions = splitCaptions;

    // Timing has changed, so sort the result
    captions = captions.sort((l, r) => {
        return l.d.caption[0].start - r.d.caption[0].start;
    });

    // Give the result
    for (const caption of captions)
        process.stdout.write(JSON.stringify(caption) + "\n");
}

main();
