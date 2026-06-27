<?JS
/*
 * Copyright (c) 2020-2022 Yahweasel
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

await session.init();

const crypto = require("crypto");
const fs = require("fs");
const config = require("../../config.js");
const login = await include("./login.jss");

let errorMsg = null;
let isSetup = !config.adminPasswordHash;

function updateConfig(newConfig) {
    const configPath = require.resolve("../../config.json");
    let currentConfig = {};
    try {
        currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    } catch (ex) {}

    Object.assign(currentConfig, newConfig);
    fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4));
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    if (!storedHash) return false;
    const [salt, key] = storedHash.split(":");
    if (!salt || !key) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return key === hash;
}

if (request.method === "POST") {
    const submittedPassword = request.body.password;

    if (isSetup) {
        // Setup flow
        if (submittedPassword && submittedPassword.length >= 8) {
            const hashed = hashPassword(submittedPassword);
            updateConfig({ adminPasswordHash: hashed });
            // Reload config for the current process
            config.adminPasswordHash = hashed;
            await login.login("local:admin", {name: "Admin", email: "admin@localhost"});
            writeHead(302, {"location": "/panel/"});
            return;
        } else {
            errorMsg = "Password must be at least 8 characters long.";
        }
    } else {
        // Login flow
        if (verifyPassword(submittedPassword, config.adminPasswordHash)) {
            await login.login("local:admin", {name: "Admin", email: "admin@localhost"});
            writeHead(302, {"location": "/panel/"});
            return;
        } else {
            errorMsg = "Incorrect password.";
        }
    }
}

await include("../../head.jss", {menu: false, title: isSetup ? "Setup Admin" : "Log in"});
?>

<style type="text/css">
    .loginblock {
        display: inline-block;
        vertical-align: middle;
        margin: 0.5em;
    }

    .loginb {
        display: inline-block;
        border-radius: 4px;
        min-width: 247px;
        min-height: 40px;
        padding: 0.5em 1em 0.5em 1em;
        text-decoration: none;
        text-align: center;
        vertical-align: middle;
    }

    .login-form input[type="password"] {
        padding: 0.5em;
        border-radius: 4px;
        border: 1px solid #ccc;
        margin-right: 0.5em;
    }

    .login-form button {
        padding: 0.5em 1em;
        border-radius: 4px;
        cursor: pointer;
    }

    .error-msg {
        color: #ff4d4d;
        margin-bottom: 1em;
        font-weight: bold;
    }
</style>

<section class="wrapper special">
    <?JS if (isSetup) { ?>
        <h2>Welcome to Ennuicastr</h2>
        <p>This appears to be your first time logging in. Please set an admin password.</p>
        <form method="POST" action="?" class="login-form">
            <?JS if (errorMsg) { ?>
                <p class="error-msg"><?JS= errorMsg ?></p>
            <?JS } ?>
            <input type="password" name="password" placeholder="New Password" required autofocus minlength="8" />
            <button type="submit" class="button">Set Password & Log in</button>
        </form>
    <?JS } else { ?>
        <h2>Admin Login</h2>
        <form method="POST" action="?" class="login-form">
            <?JS if (errorMsg) { ?>
                <p class="error-msg"><?JS= errorMsg ?></p>
            <?JS } ?>
            <p>Please enter your admin password:</p>
            <input type="password" name="password" placeholder="Password" required autofocus />
            <button type="submit" class="button">Log in</button>
        </form>
    <?JS } ?>

    <p><br/><a href="/">Return to home page</a></p>
</section>

<?JS
await include("../../tail.jss");
?>
