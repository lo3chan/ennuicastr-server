# Docker Deployment for Ennuicastr

This repository includes a `Dockerfile` that packages the complete Ennuicastr stack, including the backend server (`ennuicastr-server`), the web client application (`ennuicastr`), an Nginx proxy, SQLite databases, and `cloudflared` for easy tunneling.

It is designed to simplify deployment by combining all components into a single container image. Configuration is primarily done through simple environment variables injected at startup.

## Prerequisites

- Docker installed on your host.
- A Cloudflare account and a generated Tunnel Token (if using Cloudflare tunnels).

## Building the Docker Image

You can build the image locally. The Dockerfile handles installing all dependencies, compiling the server, and building the web client.

```bash
docker build -t ennuicastr .
```

*Note: The build process downloads pre-compiled WebAssembly libraries (libav.js) for the client application to avoid complex and lengthy C++ builds.*

## Running the Server

### With Cloudflare Tunnel (Recommended)
You can deploy Ennuicastr easily by utilizing Cloudflare Tunnels (`cloudflared` is bundled inside the container). This removes the need for configuring SSL certificates or port forwarding.

```bash
docker run -d \
  -e TUNNEL_TOKEN="your_cloudflare_tunnel_token_here" \
  -e DOMAIN="yourdomain.com" \
  --name ennuicastr \
  ennuicastr
```
**Environment Variables:**
- `TUNNEL_TOKEN`: Your Cloudflare Tunnel token. The container will automatically launch `cloudflared` to route traffic securely.
- `DOMAIN`: The primary domain where the application will be hosted (e.g. `testbed.ecastr.com`).
- `SHORT_DOMAIN` (Optional): A secondary domain primarily used for shorter invite links (defaults to `DOMAIN`).

### Local Testing / Without Tunnel
If you want to run the container locally without a tunnel, you can expose port 80 and access it via your IP or localhost:

```bash
docker run -d \
  -p 8080:80 \
  -e DOMAIN="localhost:8080" \
  -e PROTOCOL="http" \
  --name ennuicastr \
  ennuicastr
```

## How It Works

1. The `entrypoint.sh` script dynamically generates the `config.json` for the backend using your specified domains.
2. It sets up an Nginx configuration specifically designed to handle Ennuicastr's strict requirements, including routing WebSocket paths (`/ws`), handling the Node-Server-Pages CGI sockets, and setting mandatory Cross-Origin headers for `SharedArrayBuffer` processing.
3. It launches the Nginx web server, Node.js applications, and `cloudflared` tunnel securely.
