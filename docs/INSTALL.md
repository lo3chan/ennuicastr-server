# Installation

Ennuicastr provides a unified, bundled Docker deployment strategy, which significantly simplifies the installation process. The Dockerfile completely packages the server, the web client, Nginx, the required Node.js environments, SQLite databases, and `cloudflared` for easy remote tunneling.

## Deploying with Docker

This is the recommended and simplest way to run Ennuicastr. Configuration is done via environment variables at runtime.

### Prerequisites
- Docker installed on your host.
- (Optional but highly recommended) A Cloudflare account and a generated Tunnel Token to automatically route traffic securely without setting up port forwarding or LetsEncrypt/SSL manually.

### 1: Build the Image

The Dockerfile is included in the root of the repository. Running the build command will download all system dependencies, override legacy requirements safely, fetch the client code, extract precompiled WebAssembly components (`libav.js`), and compile both the server and the web interface.

```bash
docker build -t ennuicastr .
```

### 2: Run the Server

If you are using **Cloudflare Tunnels**, you can run the container by just providing your token and domain:

```bash
docker run -d \
  -e TUNNEL_TOKEN="your_cloudflare_tunnel_token_here" \
  -e DOMAIN="yourdomain.com" \
  --name ennuicastr \
  ennuicastr
```

Your `config.json` and Nginx configurations are dynamically generated at launch based on the provided `DOMAIN`. The tunnel securely exposes port `80` from Nginx directly to your Cloudflare domain.

**Local / Manual Configuration**
If you wish to test locally without a tunnel or manually manage your reverse proxy, omit the `TUNNEL_TOKEN` and expose the internal port 80:

```bash
docker run -d \
  -p 8080:80 \
  -e DOMAIN="localhost:8080" \
  -e PROTOCOL="http" \
  --name ennuicastr \
  ennuicastr
```

## Legacy / Manual Installation (Not Recommended)

If you must install Ennuicastr manually directly onto a server (without Docker), you can consult the historical configuration logic located in the Dockerfile which outlines the exact required package dependencies (like Node 18, `sqlite3`, `ffmpeg`, etc), compiling `njsp`, manually configuring `nginx.conf`, building the `ennuicastr` client natively with custom `libav.js` profiles, and running the `main.sh` components manually.
