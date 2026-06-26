#!/bin/bash
set -e

echo "Starting Ennuicastr..."

# --- Defaults ---
DOMAIN="${DOMAIN:-testbed.ecastr.com}"
SHORT_DOMAIN="${SHORT_DOMAIN:-$DOMAIN}"
CLIENT_REPO_PATH="/app/ennuicastr"
SERVER_REPO_PATH="/app/ennuicastr-server"
PROTOCOL="https" # Even if local port 80, tunnel provides https

# --- Data Persistence & Configuration ---
DATA_DIR="/data"
CONFIG_FILE="${SERVER_REPO_PATH}/config.json"

if [ -d "$DATA_DIR" ]; then
    echo "Persistent /data volume found. Setting up symlinks..."
    mkdir -p "${DATA_DIR}/db" "${DATA_DIR}/rec" "${DATA_DIR}/sounds"
    chown -R ennuicastr:ennuicastr "${DATA_DIR}"

    # Remove default directories to replace them with symlinks
    rm -rf "${SERVER_REPO_PATH}/db" "${SERVER_REPO_PATH}/rec" "${SERVER_REPO_PATH}/sounds"

    ln -sfn "${DATA_DIR}/db" "${SERVER_REPO_PATH}/db"
    ln -sfn "${DATA_DIR}/rec" "${SERVER_REPO_PATH}/rec"
    ln -sfn "${DATA_DIR}/sounds" "${SERVER_REPO_PATH}/sounds"

    CONFIG_FILE="${DATA_DIR}/config.json"
fi

# Ensure necessary directories exist
mkdir -p ${SERVER_REPO_PATH}/rec ${SERVER_REPO_PATH}/sounds ${SERVER_REPO_PATH}/db

# Initialize database schemas if tables are missing
DB_DIR="${SERVER_REPO_PATH}/db"
ENNUICASTR_DB="$DB_DIR/ennuicastr.db"
LOG_DB="$DB_DIR/log.db"

# Check if users table exists, if not assume empty and initialize
if ! sqlite3 "$ENNUICASTR_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='users';" | grep -q "users"; then
    echo "Database ennuicastr.db is missing tables. Initializing schema..."
    sqlite3 "$ENNUICASTR_DB" < "${SERVER_REPO_PATH}/db-schema/ennuicastr.schema"
fi

if ! sqlite3 "$LOG_DB" "SELECT name FROM sqlite_master WHERE type='table' AND name='log';" | grep -q "log"; then
    echo "Database log.db is missing tables. Initializing schema..."
    sqlite3 "$LOG_DB" < "${SERVER_REPO_PATH}/db-schema/log.schema"
fi

chown -R ennuicastr:ennuicastr "$DB_DIR"

if [ ! -f "$CONFIG_FILE" ]; then
    echo "Generating config.json at $CONFIG_FILE..."
    cat > "$CONFIG_FILE" << CONFIG_EOF
{
    "//urls": "URLs and paths for Ennuicastr and associated tools",
    "site": "${PROTOCOL}://${DOMAIN}/",
    "panel": "${PROTOCOL}://${DOMAIN}/panel/",
    "clientShort": "${PROTOCOL}://${SHORT_DOMAIN}/",
    "client": "${PROTOCOL}://${DOMAIN}/r/",
    "ennuizel": "${PROTOCOL}://ez.${DOMAIN}/",
    "clientRepo": "${CLIENT_REPO_PATH}",
    "repo": "${SERVER_REPO_PATH}",
    "db": "${SERVER_REPO_PATH}/db",
    "rec": "${SERVER_REPO_PATH}/rec",
    "sounds": "${SERVER_REPO_PATH}/sounds",
    "cert": "",
    "sock": "/tmp/ennuicastr-server.sock",
    "lobbysock": "/tmp/ennuicastr-lobby-server.sock",

    "limits": {
        "simultaneous": 4,
        "lobbies": 64,
        "tracksFree": 8,
        "tracksPaid": 64,
        "recNameLength": 512,
        "recUsernameLength": 32,
        "lobbyNameLength": 512,
        "soundNameLength": 512,
        "soundSize": 1073741824,
        "soundDurationTotal": 7200
    }
}
CONFIG_EOF
    chown ennuicastr:ennuicastr "$CONFIG_FILE"
fi

if [ -d "$DATA_DIR" ]; then
    if [ ! -f "${SERVER_REPO_PATH}/config.json" ] || [ "$(realpath ${SERVER_REPO_PATH}/config.json)" != "$CONFIG_FILE" ]; then
        ln -sfn "$CONFIG_FILE" "${SERVER_REPO_PATH}/config.json"
    fi
fi

# --- Nginx Configuration ---
echo "Configuring Nginx..."
cat > /etc/nginx/sites-available/default << NGINX_EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name _;

    root /app/ennuicastr-server/web;
    index index.jss index.html;

    # Basic limits
    client_max_body_size 1024M;

    # SharedArrayBuffer headers needed globally or on paths
    add_header 'Cross-Origin-Opener-Policy' 'same-origin';
    add_header 'Cross-Origin-Embedder-Policy' 'require-corp';

    # The Ennuicastr client itself
    location /r/ {
        alias /var/www/rec/;
        try_files \$uri \$uri/ =404;

        # Needed for libav.js shared memory
        add_header 'Cross-Origin-Opener-Policy' 'same-origin';
        add_header 'Cross-Origin-Embedder-Policy' 'require-corp';

        location ~ \.jss$ {
            fastcgi_index index.jss;
            fastcgi_pass unix:/tmp/nodejs-server-pages.sock;
            include fastcgi_params;
            fastcgi_buffering off;
            fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
        }

        location ~ /ws$ {
            proxy_pass http://unix:/tmp/nodejs-server-pages-ws.sock;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "Upgrade";
            proxy_set_header Host \$host;
            proxy_read_timeout 86400;
            proxy_send_timeout 86400;
            send_timeout 86400;
        }
    }

    # Redirect root domain to the main panel
    location = / {
        return 302 /panel/;
    }

    location / {
        try_files \$uri \$uri/ /index.jss;
    }

    # NJSP handlers for panel and main site
    location ~ \.jss$ {
        fastcgi_index index.jss;
        fastcgi_pass unix:/tmp/nodejs-server-pages.sock;
        include fastcgi_params;
        fastcgi_buffering off;
        fastcgi_param SCRIPT_FILENAME \$document_root\$fastcgi_script_name;
    }

    location ~ /ws$ {
        proxy_pass http://unix:/tmp/nodejs-server-pages-ws.sock;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "Upgrade";
        proxy_set_header Host \$host;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        send_timeout 86400;
    }
}
NGINX_EOF

# Set nginx user to ennuicastr
sed -i 's/user www-data;/user ennuicastr;/g' /etc/nginx/nginx.conf

# --- Ensure necessary directories ---
chown -R ennuicastr:ennuicastr ${SERVER_REPO_PATH}/rec ${SERVER_REPO_PATH}/sounds ${SERVER_REPO_PATH}/db
chown -R ennuicastr:ennuicastr /var/log/nginx /var/lib/nginx /run

# --- Start Nginx ---
echo "Starting Nginx..."
nginx

# --- Start Server Components ---
echo "Starting Ennuicastr Node.js servers..."
su - ennuicastr -c "cd ${SERVER_REPO_PATH}/njsp && ./njsp.sh > njsp.log 2>&1 &"
su - ennuicastr -c "cd ${SERVER_REPO_PATH}/server && ./main.sh > main.log 2>&1 &"

# Wait a moment for socks to be created
sleep 3

# --- Start Cloudflare Tunnel ---
if [ -n "$TUNNEL_TOKEN" ]; then
    echo "Starting cloudflared tunnel..."
    cloudflared tunnel --no-autoupdate run --token "$TUNNEL_TOKEN" > cloudflared.log 2>&1 &
else
    echo "No TUNNEL_TOKEN provided. Cloudflare tunnel not started. Running on port 80 locally."
    touch cloudflared.log
fi

# Keep container alive and output all logs as a diagnostic hose
echo "Ennuicastr is running! Starting diagnostic hose..."
touch /var/log/nginx/access.log /var/log/nginx/error.log ${SERVER_REPO_PATH}/njsp/njsp.log ${SERVER_REPO_PATH}/server/main.log cloudflared.log
tail -f /var/log/nginx/access.log /var/log/nginx/error.log ${SERVER_REPO_PATH}/njsp/njsp.log ${SERVER_REPO_PATH}/server/main.log cloudflared.log
