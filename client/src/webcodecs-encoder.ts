/*
 * Beacon Studio - Native WebCodecs Audio Encoder
 * Hardware-accelerated Opus encoding with progressive capability detection.
 */

declare let AudioEncoder: any;
declare let AudioData: any;

import * as ifEnc from "./iface/encoder";

export class WebCodecsAudioEncoder {
    private encoder: any = null;
    private seq = 0;
    private port: MessagePort | null = null;
    private isConfigured = false;
    public reversePort: MessagePort;
    public outputChannel: MessageChannel;
    public onpackets?: (
        ts: number, trackNo: number, seq: number,
        packets: Uint8Array[]
    ) => unknown;

    constructor(public capture?: any) {
        const mc = new MessageChannel();
        this.reversePort = mc.port1;
        this.outputChannel = new MessageChannel();
    }

    /**
     * Check if WebCodecs AudioEncoder is supported in this browser for the given configuration.
     */
    static async isSupported(format: string, sampleRate: number, numberOfChannels: number): Promise<boolean> {
        if (typeof AudioEncoder === "undefined" || typeof AudioData === "undefined") {
            return false;
        }
        if (format !== "opus") {
            return false; // FLAC uses the dedicated bit-identical Wasm master encoder
        }
        try {
            const config = {
                codec: "opus",
                sampleRate,
                numberOfChannels,
                bitrate: 128000
            };
            const support = await AudioEncoder.isConfigSupported(config);
            return !!(support && support.supported);
        } catch (ex) {
            return false;
        }
    }

    /**
     * Initialize the native encoder.
     */
    async init(opts: ifEnc.EncoderOpts): Promise<void> {
        const sampleRate = opts.outSampleRate || 48000;
        const numberOfChannels = (opts.channel === -1 && opts.channelLayout > 1) ? 2 : 1;

        this.encoder = new AudioEncoder({
            output: (chunk: any) => {
                const buffer = new Uint8Array(chunk.byteLength);
                chunk.copyTo(buffer);
                const ts = Math.round(chunk.timestamp / 1000); // microsecond to millisecond
                if (this.onpackets) {
                    this.onpackets(ts, 0, this.seq, [buffer]);
                }
                this.seq++;
            },
            error: (err: any) => {
                // If WebCodecs fails, error is reported
                console.error("WebCodecs AudioEncoder error:", err);
            }
        });

        this.encoder.configure({
            codec: "opus",
            sampleRate,
            numberOfChannels,
            bitrate: 128000
        });

        this.isConfigured = true;
    }

    /**
     * Pipe raw audio frames from the capture port into the native encoder.
     */
    async encode(port: MessagePort, trackNo: number): Promise<void> {
        this.port = port;
        port.onmessage = (ev) => {
            if (!this.isConfigured || !this.encoder || this.encoder.state !== "configured") return;
            const data = ev.data;
            if (!data) return;

            // Handle RTEnnui audio packet structure
            let pcmData: Float32Array | null = null;
            if (data.d && data.d[0]) {
                pcmData = data.d[0];
            } else if (data instanceof Float32Array) {
                pcmData = data;
            }

            if (pcmData && pcmData.length > 0) {
                try {
                    const audioData = new AudioData({
                        format: "f32",
                        sampleRate: 48000,
                        numberOfFrames: pcmData.length,
                        numberOfChannels: 1,
                        timestamp: Math.round(performance.now() * 1000), // microseconds
                        data: pcmData
                    });
                    this.encoder.encode(audioData);
                    audioData.close();
                } catch (ex) {
                    // Frame dropped or encoder busy
                }
            }
        };
    }

    /**
     * Flush and close encoder.
     */
    async close(): Promise<void> {
        if (this.encoder) {
            try {
                if (this.encoder.state === "configured") {
                    await this.encoder.flush();
                }
                this.encoder.close();
            } catch (ex) {}
            this.encoder = null;
        }
    }
}
