This is the server component for Ennuicastr, a system for recording multiple
users distributed across the world in a well-synchronized way, without
significant loss, over the web. This is the server software that runs
https://ecastr.com/ , the main installation of Ennuicastr.

This software is divided into several subcomponents:

db:     The database

njsp:   The configuration for NodeJS-Server-Pages
        (`npm install nodejs-server-pages`), which is needed to run the
        templated web site component.

server: The server for Ennuicastr recordings itself.

web:    The web page

cook:   Tools used to process raw audio into usable formats.


# Running the Server

Ennuicastr provides a unified, bundled Docker deployment strategy, which significantly simplifies the installation process. The Dockerfile completely packages the server, the web client, Nginx, the required Node.js environments, SQLite databases, and `cloudflared` for easy remote tunneling.

## Deploying with Docker

This is the recommended and simplest way to run Ennuicastr. Configuration is done via environment variables at runtime.

### Prerequisites
- Docker installed on your host.
- (Optional but highly recommended) A Cloudflare account and a generated Tunnel Token to automatically route traffic securely without setting up port forwarding or LetsEncrypt/SSL manually.

### 1: Get the Image

The easiest way is to pull the pre-built image from the GitHub Container Registry (`ghcr.io`):

```bash
docker pull ghcr.io/<your-github-username>/ennuicastr:latest
```

*Alternatively, you can build the image locally from the included `Dockerfile` by running `docker build -t ennuicastr .` in the root of the repository.*

### 2: Run the Server

If you are using **Cloudflare Tunnels**, you can run the container by just providing your token and domain (be sure to use the correct image name, e.g., `ghcr.io/<your-github-username>/ennuicastr:latest` or `ennuicastr` if built locally):

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

If you must install Ennuicastr manually directly onto a server (without Docker), you can consult the historical configuration logic in [docs/INSTALL.md](docs/INSTALL.md).
