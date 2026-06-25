<?JS
/*
 * Configuration Editor
 */

const uidX = await include("../uid.jss", {verbose: true});
if (!uidX) return;

const fs = require("fs");
const crypto = require("crypto");
const configPath = require.resolve("../../config.json");
const appConfig = require("../../config.js");
let errorMsg = null;
let successMsg = null;

if (request.method === "POST") {
    try {
        let currentConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));

        if (request.body.action === "updateConfig") {
            const newConfigStr = request.body.configJson;
            try {
                const parsed = JSON.parse(newConfigStr);
                // Keep adminPasswordHash safe
                if (currentConfig.adminPasswordHash) {
                    parsed.adminPasswordHash = currentConfig.adminPasswordHash;
                }
                fs.writeFileSync(configPath, JSON.stringify(parsed, null, 4));
                // Reload in memory
                Object.assign(appConfig, parsed);
                successMsg = "Configuration updated successfully!";
                currentConfig = parsed;
            } catch (ex) {
                errorMsg = "Invalid JSON syntax. Please check and try again.";
            }
        } else if (request.body.action === "updatePassword") {
            const newPassword = request.body.newPassword;
            if (newPassword && newPassword.length >= 8) {
                const salt = crypto.randomBytes(16).toString("hex");
                const hash = crypto.scryptSync(newPassword, salt, 64).toString("hex");
                currentConfig.adminPasswordHash = `${salt}:${hash}`;
                fs.writeFileSync(configPath, JSON.stringify(currentConfig, null, 4));
                appConfig.adminPasswordHash = currentConfig.adminPasswordHash;
                successMsg = "Password updated successfully!";
            } else {
                errorMsg = "Password must be at least 8 characters long.";
            }
        }
    } catch (ex) {
        errorMsg = "Failed to update configuration: " + ex.message;
    }
}

// Prepare current config for display (without the hash)
let displayConfig = {};
try {
    displayConfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
    delete displayConfig.adminPasswordHash;
} catch (ex) {}
const configString = JSON.stringify(displayConfig, null, 4);

await include("../../head.jss", {title: "Configuration"});
?>

<section class="wrapper special">
    <h2>Configuration Editor</h2>

    <?JS if (errorMsg) { ?>
        <div style="background-color: #f8d7da; color: #721c24; padding: 10px; border-radius: 5px; margin-bottom: 1em;">
            <?JS= errorMsg ?>
        </div>
    <?JS } ?>

    <?JS if (successMsg) { ?>
        <div style="background-color: #d4edda; color: #155724; padding: 10px; border-radius: 5px; margin-bottom: 1em;">
            <?JS= successMsg ?>
        </div>
    <?JS } ?>

    <div style="text-align: left; max-width: 800px; margin: 0 auto;">
        <h3>Change Password</h3>
        <form method="POST" action="?">
            <input type="hidden" name="action" value="updatePassword" />
            <input type="password" name="newPassword" placeholder="New Password" required minlength="8" style="margin-bottom: 10px;" />
            <button type="submit" class="button">Update Password</button>
        </form>

        <hr style="margin: 2em 0;"/>

        <h3>Edit config.json</h3>
        <p>Edit the raw configuration file. The password hash is hidden for security.</p>
        <form method="POST" action="?">
            <input type="hidden" name="action" value="updateConfig" />
            <textarea name="configJson" rows="20" style="font-family: monospace; width: 100%; margin-bottom: 10px;"><?JS= configString ?></textarea>
            <button type="submit" class="button">Save Configuration</button>
        </form>
    </div>
</section>

<?JS await include("../../tail.jss"); ?>
