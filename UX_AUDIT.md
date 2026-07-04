# Ennuicastr UX Audit

## Goal
Perform a comprehensive UX audit of the interface and standard deployment flow, particularly validating the `/panel/` FastCGI behavior.

## Methodology
The audit was carried out programmatically using Playwright.

## Findings
1. **Initial Setup Flow:**
    - Upon clean deployment with an empty or unconfigured database, visiting `/` correctly redirects to `/panel/`.
    - The `/panel/` landing page detects that `adminPasswordHash` is missing from `config.json`.
    - The UI presents the user with the prompt: `This appears to be your first time logging in. Please set an admin password.`

2. **Login/Session Flow Blockers:**
    - The deployment flow expects the user to set a password and immediately gain access to the dashboard (`Create a recording room`).
    - During automated UX tests (and manual cURL tests), submitting the initial POST password form successfully returns an `NJSPSESSID` cookie.
    - However, the `session.js` login framework fails to correctly persist the setup login or subsequent logins when the fastcgi parameters execute sequentially without delays or perhaps due to FastCGI/Nginx socket buffering on first run.
    - Subsequent navigation requests immediately load the "Login" prompt again instead of the authenticated dashboard. This indicates a potential race condition or flaw in how `log.db` or `sqlite3` commits sessions immediately after setup in the Docker environment.

## Recommendations for Next Iteration
- The current `.jss` Native Fix ensures the backend correctly evaluates module requests (avoiding 502 Bad Gateway errors).
- To complete the UX journey, the login logic (`web/panel/login/index.jss` -> `web/panel/login/login.jss` -> `db.js`) should be investigated for session cookie synchronization issues or SQLite write-ahead logging (WAL) race conditions under high concurrency.
