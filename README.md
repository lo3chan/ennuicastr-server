# Ennuicastr Unified Monorepo & Deployment Guide

Welcome to the **Ennuicastr Unified Monorepo** repository! This project contains the complete, self-contained multi-track synchronized WebRTC recording system, including:
1. **Recording Server Daemon** (`server/`) — Native Ogg/FLAC/Opus audio multiplexer and WebSocket worker backend.
2. **Web Client Application** (`client/`) — High-performance, browser-native SPA (TypeScript, WebAssembly `libav.js`, WebRTC, VAD).
3. **Web Administration Panel** (`web/`) — NodeJS Server Pages (NJSP) dashboard for managing recordings, persistent rooms, and soundboards.
4. **Unified Containerization** (`Dockerfile`, `entrypoint.sh`) — Complete production Docker packaging with Nginx reverse proxy and Cloudflare Tunnel (`cloudflared`).

---

## 🚀 Quick Start with Portainer / Docker Compose

You can deploy the entire stack immediately using Portainer or Docker Compose:

```yaml
version: '3.8'

services:
  ennuicastr:
    image: ghcr.io/lo3chan/ennuicastr-server/ennuicastr:latest
    container_name: ennuicastr
    restart: always
    environment:
      # Primary domain for your Ennuicastr instance
      - DOMAIN=ennui.gettysburgbeacon.com
      # (Optional) Cloudflare Tunnel Token for zero-config SSL and public access
      - TUNNEL_TOKEN=eyJhIjoiMjAwNDYyZTFiZTExOTAyNjJjMjYwNzQyNGQzYTFjMDIi...
    ports:
      # Expose port 80 if not using Cloudflare Tunnel or if testing locally
      - "8080:80"
    volumes:
      # Persistent volume for database, recordings, soundboards, and config.json
      - ennuicastr_data:/data

volumes:
  ennuicastr_data:
```

---

## 🌐 Site Map & Web Endpoint Navigation

Ennuicastr organizes its web interface into logical namespaces:

| Endpoint | Access Level | Description |
|---|---|---|
| `https://<domain>/panel/` | Admin | Main Dashboard (overview of system state, quick links) |
| `https://<domain>/panel/login/` | Public / Admin | Admin password authentication screen |
| `https://<domain>/panel/rec/` | Admin | Recording Management (Create new sessions, manage persistent rooms, view active recordings) |
| `https://<domain>/panel/config/` | Admin | System configuration (Limit tracks, update password, set API keys) |
| `https://<domain>/panel/sounds/` | Admin | Soundboard asset manager (Upload custom audio effects for real-time trigger) |
| `https://<domain>/r/` | Public / Web App | Real-time WebRTC Recording Client SPA |
| `https://<domain>/r/lobby/` | Public / API | Persistent room lobby startup endpoint |
| `https://<domain>/ws` | Internal | WebSocket signaling channel for live recording connections |

---

## 🔒 First-Time Setup & Admin Credentials

1. **Initial Login**: When accessing `/panel/` for the first time, you will be prompted to set an admin password.
2. **Default Password**: The default admin password for pre-configured deployments is `mjn22mjn22`.
3. **Password Security**: The password hash is securely stored in `/data/config.json` using PBKDF2/SHA512. You can update the password anytime via the **Configuration** menu inside the panel.

---

## 🛠 Monorepo Repository Structure

```
├── Dockerfile                  # Multi-stage Docker build file (Server + Client + Nginx)
├── entrypoint.sh               # Container startup script, config generator, Nginx setup
├── config.js                   # Node.js server configuration loader
├── db.js                       # SQLite database wrapper
├── rec.js                      # Session manager & hostUrl generator
├── client/                     # Web Client Source Code (TypeScript, WebAssembly, WebRTC)
├── server/                     # Recording Worker Daemon & Ogg Encoder
├── web/                        # Web Panel HTML/JSS Pages
├── db-schema/                  # SQLite DB creation scripts (ennuicastr.schema, log.schema)
├── docs/                       # Architectural documentation (docs/ARCHITECTURE.md)
└── cook/                       # Audio post-processing & Whisper transcription utilities
```

---

## ⚡ Technical Highlights & Fixes Applied

- **Unified Monorepo**: The `client/` frontend is fully integrated inside `lo3chan/ennuicastr-server`. Developers and AI assistants (e.g. Google Jules) can modify both backend and frontend in one location.
- **Pure Browser Operation**: Participants open an invite link (e.g. `https://<domain>/r/?<room-keys>`) and record directly in Chrome, Firefox, Safari, or Edge without installing software.
- **Absolute Require Resolution**: Solved NJSP sandboxing path issues by migrating all server-side template requires to deterministic absolute paths (`/app/ennuicastr-server/...`).
- **Nginx Query-String Routing**: Requests to the root domain containing room keys automatically route to `/r/` (web recording client) while standard requests route to `/panel/`.
- **SharedArrayBuffer Support**: Configured COOP (`same-origin`) and COEP (`require-corp`) headers to enable `libav.js` WebAssembly high-performance audio processing.

---

## 📖 Further Documentation

For detailed architectural specifications, database schemas, binary protocol specs, and WebAssembly pipeline details, see:
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — Technical Architecture Specification
- [README-Docker.md](README-Docker.md) — Production Container Deployment Guide
