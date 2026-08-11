# Ennuicastr Architecture & Technical Reference

This document provides an in-depth technical overview of the **Ennuicastr Monorepo** architecture, covering the server daemon, the NodeJS Server Pages (NJSP) web layer, database schemas, WebRTC signaling protocol, and client WebAssembly integration.

---

## 1. High-Level Architecture Overview

Ennuicastr is a high-reliability, low-latency multi-track web recording platform. It allows users distributed globally to record synchronized, uncompressed/high-quality audio (FLAC or Opus) directly inside standard web browsers without installing client desktop applications.

```
                         +-----------------------------------+
                         |    Cloudflare Tunnel (cloudflared)|
                         +-----------------+-----------------+
                                           | (Port 80)
                                           v
                         +-----------------+-----------------+
                         |          Nginx Proxy              |
                         |  - SharedArrayBuffer COOP/COEP    |
                         |  - /panel/ -> NJSP FastCGI        |
                         |  - /r/     -> /var/www/rec/ (SPA) |
                         +--------+------------------+------+
                                  |                  |
               (Unix Socket FastCGI)         (WebSockets / WebRTC)
                                  v                  v
                 +----------------+---+      +-------+------------------+
                 | NJSP Web Backend   |      | Ennuicastr Server Daemon |
                 | - web/panel/ (JSS) |----->| - server/main.js         |
                 | - SQLite db.js     |      | - server/ennuicastr.ts   |
                 +--------------------+      | - FLAC/Opus Ogg Storage  |
                                             +--------------------------+
```

---

## 2. Directory Structure & Monorepo Layout

The repository is structured as a unified monorepo containing both the web backend (`ennuicastr-server`) and the web frontend client (`client/`):

```
.
├── Dockerfile                  # Unified Docker multi-stage build manifest
├── entrypoint.sh               # Runtime initialization, Nginx config & service daemon
├── config.json.example         # Example configuration schema
├── db.js                       # SQLite database wrapper & transaction helpers
├── rec.js                      # Recording session launcher & hostUrl generator
├── id36.js                     # Base-36 ID & cryptographic key utilities
├── db-schema/
│   ├── ennuicastr.schema       # Core database tables (users, recordings, lobbies2, etc.)
│   └── log.schema              # System event logging database schema
├── server/
│   ├── main.js                 # Master recording daemon supervisor
│   ├── ennuicastr.ts           # Recording session worker (WebSocket & Ogg file writer)
│   └── ogg.js                  # Native Ogg bitstream multiplexer & FLAC/Opus header builder
├── web/
│   ├── head.jss                # Shared HTML header template & design system
│   ├── tail.jss                # Shared footer template
│   ├── panel/
│   │   ├── login/              # Admin authentication endpoints
│   │   ├── config/             # System configuration panel
│   │   ├── rec/                # Recording management dashboard (Index, Start, Join, Delete)
│   │   └── sounds/             # Soundboard audio asset manager
│   ├── r/
│   │   └── lobby/index.jss     # Persistent room (lobby) API endpoint
│   └── img/                    # PWA icons and web manifest assets
├── client/                     # WebRTC Client Application Frontend (SPA)
│   ├── Makefile                # Client build pipeline
│   ├── package.json            # Client dependencies (Rollup, TypeScript, Terser)
│   ├── src/                    # Web Client TypeScript source code
│   │   ├── main.ts             # Client entrypoint & UI state machine
│   │   ├── audio.ts            # Web Audio API capture, VAD & WebAssembly encoder
│   │   ├── net.ts              # WebSocket & WebRTC communication layer
│   │   └── ui.ts              # Browser DOM user interface
│   └── libav/                  # WebAssembly libav.js build hooks
└── cook/                       # Audio post-processing & RunPod Whisper transcription scripts
```

---

## 3. Web Layer: NodeJS Server Pages (NJSP)

The web administration panel is built on **NodeJS Server Pages (NJSP)**, an asynchronous template execution framework that evaluates `.jss` files into server-side rendered HTML.

### Path Resolution Scoping Rules
Inside NJSP AsyncFunction contexts, standard relative `require("./file.js")` calls resolve relative to the runner process rather than the template file location. To prevent module resolution failures:
1. **Absolute Require Paths**: All server-side template imports use absolute paths (`require("/app/ennuicastr-server/rec.js")` or `require("/app/ennuicastr-server/db.js")`).
2. **Global Request Scope**: NJSP injects `request`, `params`, `response`, and `db` into the global template scope. `request.body` automatically parses incoming JSON or URL-encoded POST parameters.

---

## 4. Web Client Architecture (`/client`)

The web client (`client/`) is an uncompressed, real-time WebRTC recording application that runs completely inside standard web browsers (Chrome, Firefox, Safari, Edge).

### Key Features
1. **Zero Client Installation**: Runs 100% in the web browser via WebRTC and WebAssembly.
2. **Local Multi-Track Recording**: Each participant's audio is encoded locally (Opus or FLAC) via WebAssembly and streamed in real-time to the server.
3. **SharedArrayBuffer COOP/COEP Isolation**: Nginx serves mandatory headers:
   ```nginx
   add_header 'Cross-Origin-Opener-Policy' 'same-origin';
   add_header 'Cross-Origin-Embedder-Policy' 'require-corp';
   ```
   This unlocks high-precision browser timers and shared memory for `libav.js` WebAssembly audio processing.
4. **VAD (Voice Activity Detection)**: Real-time client-side VAD marks active speech vs silence, allowing continuous low-bandwidth transmission.

---

## 5. Database Schemas (`db-schema/`)

Ennuicastr uses SQLite for persistent state (`db/ennuicastr.db` and `db/log.db`).

### Core Tables Summary
- **`users`**: User accounts, password hashes, admin access levels (`level >= 2` for admin).
- **`recordings`**: Active and archived recording sessions (`rid`, `uid`, `port`, `name`, `format`, `continuous`, `status`, `key`, `master`).
- **`lobbies2`**: Persistent rooms (`lid`, `uid`, `name`, `key`, `master`, `config`, `rid`). Persistent rooms allow reusable invite URLs.
- **`defaults`**: Per-user default recording configurations.
- **`sounds`**: Soundboard assets uploaded for real-time playback during sessions.

---

## 6. Binary Communication Protocol (`protocol.js`)

Communication between the web browser client and the recording server worker (`server/ennuicastr.ts`) uses custom binary WebSocket packets:

| Packet ID | Type | Description |
|---|---|---|
| `0x00` | `login` | Client authentication handshake (`rid`, `key`, `flags`, `nick`) |
| `0x01` | `ack` | Server handshake acknowledgement |
| `0x02` | `nack` | Connection rejection (e.g. track limit reached) |
| `0x10` | `data` | Encoded audio frame (`granulePos`, `track`, payload) |
| `0x11` | `datax` | Extended multi-track audio frame |
| `0x20` | `info` | Control signal (`id`, `mode`, `recName`, `peerInitial`, `peerLost`) |
| `0x30` | `ping` / `pong` | Latency measurement and keepalive |
| `0x40` | `text` | In-session chat message |
| `0x50` | `rtc` | WebRTC signaling pass-through frame |

---

## 7. Operational & Security Guardrails

1. **Authentication**: Admin panel access requires password authentication (default `mjn22mjn22` on initial setup, stored as PBKDF2/SHA512 hash in `config.json`).
2. **Drafts Only Rule**: External integrations draft emails to outboxes rather than sending directly.
3. **Data Persistence**: Map host volume to `/data` (`-v /path/to/host:/data`) to preserve database, configuration, recordings, and custom soundboard files across container updates.
