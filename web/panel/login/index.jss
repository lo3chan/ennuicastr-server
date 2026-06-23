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

if (request.query.secret) {
    // Beta account. Maybe give them access
    await include("beta.jss");
    return;
}

const util = require("util");
const config = require("../../config.js");
const db = require("../db.js");
const login = require("./login.jss");

let errorMsg = null;

if (request.method === "POST") {
    if (!config.panelPassword) {
        errorMsg = "Panel password is not configured.";
    } else if (request.body.password === config.panelPassword) {
        await login.login("local:admin", {name: "Admin", email: "admin@localhost"});
        redirect("/panel/");
        return;
    } else {
        errorMsg = "Incorrect password.";
    }
}

await include("../../head.jss", {menu: false, title: "Log in"});
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
        color: red;
        margin-bottom: 1em;
    }
</style>

<section class="wrapper special">
    <?JS if (!config.panelPassword) { ?>
        <p class="error-msg">Panel password is not configured. Please set the PANEL_PASSWORD environment variable or configure it in config.json.</p>
    <?JS } else { ?>
        <form method="POST" action="?" class="login-form">
            <?JS if (errorMsg) { ?>
                <p class="error-msg"><?JS= errorMsg ?></p>
            <?JS } ?>
            <p>Please enter the panel password to log in:</p>
            <input type="password" name="password" placeholder="Password" required autofocus />
            <button type="submit" class="button">Log in</button>
        </form>
    <?JS } ?>

    <p><br/><a href="/">Return to home page</a></p>
</section>

<?JS
await include("../../tail.jss");
?>
