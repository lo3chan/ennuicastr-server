FROM ubuntu:22.04

ENV DEBIAN_FRONTEND=noninteractive

# Install dependencies
RUN apt-get update && apt-get install -y python3-distutils \
    curl gnupg build-essential zip unzip sqlite3 \
    git ffmpeg flac vorbis-tools fdkaac opus-tools \
    python3 ca-certificates jq nginx \
    && rm -rf /var/lib/apt/lists/*

# Install Node.js 24.x (Current LTS)
RUN curl -fsSL https://deb.nodesource.com/setup_24.x | bash - \
    && apt-get install -y nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install cloudflared
RUN curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb -o cloudflared.deb \
    && dpkg -i cloudflared.deb \
    && rm cloudflared.deb

# Setup user and directories
RUN useradd -m -s /bin/bash ennuicastr \
    && mkdir -p /app/ennuicastr-server /app/ennuicastr /var/www/html /var/www/rec \
    && chown -R ennuicastr:ennuicastr /app /var/www/html /var/www/rec

WORKDIR /app

# --- Build Server ---
# We copy the server code into the image. We assume the context is the ennuicastr-server repo root.
COPY --chown=ennuicastr:ennuicastr . /app/ennuicastr-server

# Build the server
USER ennuicastr
WORKDIR /app/ennuicastr-server

# Patch package.json dependencies to be compatible with modern Node versions
RUN node -e " \
  const fs = require('fs'); \
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8')); \
  pkg.dependencies.sqlite3 = '^5.1.7'; \
  pkg.dependencies.typescript = '^5.2.0'; \
  pkg.dependencies.wrtc = 'npm:@roamhq/wrtc@^0.10.0'; \
  pkg.overrides = { 'wrtc': 'npm:@roamhq/wrtc@^0.10.0' }; \
  fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2)); \
" && \
    rm -rf node_modules package-lock.json && \
    npm install node-pre-gyp && \
    npm install

RUN make

# Generate schemas
WORKDIR /app/ennuicastr-server/db
RUN sqlite3 ennuicastr.db < ennuicastr.schema && \
    sqlite3 log.db < log.schema

# --- Build Client ---
USER ennuicastr
WORKDIR /app
# Clone the user's client repo
RUN git clone https://github.com/lo3chan/ennuicastr.git /app/ennuicastr

WORKDIR /app/ennuicastr
# Create configs
RUN cp config/config.json.example config/config.json && \
    cp config/dropbox.json.example config/dropbox.json && \
    cp config/google-drive.json.example config/google-drive.json

# Install libav.js dependencies for the client
RUN cd libav && \
    curl -L https://github.com/Yahweasel/libav.js/releases/download/v5.4.6.1.1/libav.js-5.4.6.1.1.zip -o libav.zip && \
    unzip libav.zip && \
    cp libav.js-5.4.6.1.1/dist/libav-5.4.6.1.1-default.js libav-5.4.6.1.1-ennuicastr.js && \
    cp libav.js-5.4.6.1.1/dist/libav-5.4.6.1.1-default.wasm.js libav-5.4.6.1.1-ennuicastr.wasm.js && \
    cp libav.js-5.4.6.1.1/dist/libav-5.4.6.1.1-default.wasm.wasm libav-5.4.6.1.1-ennuicastr.wasm.wasm && \
    cp libav.js-5.4.6.1.1/dist/libav-5.4.6.1.1-default.asm.js libav-5.4.6.1.1-ennuicastr.asm.js || true

# Build the client
RUN npm install
# Client makefile expects bx in DATA but rule dist/bx creates bx.
RUN make dist/bx || true
# Ensure dist/fs exists because Makefile creates it inconsistently
RUN mkdir -p dist/fs
RUN make
# Install client to /var/www/rec (the default web location for the client)
USER root
RUN make install PREFIX=/var/www/rec
RUN chown -R ennuicastr:ennuicastr /var/www/rec

# Copy server web panel rather than symlinking to avoid Nginx 403 Forbidden traversing permission issues
RUN cp -R /app/ennuicastr-server/web /var/www/html/panel && \
    chown -R ennuicastr:ennuicastr /var/www/html/panel

# Copy entrypoint script
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Web server port
EXPOSE 80

# Cloudflared doesn't strictly need exposed ports since it connects outward,
# but we expose 80 for Nginx if running locally without tunnel.

ENTRYPOINT ["/app/entrypoint.sh"]
