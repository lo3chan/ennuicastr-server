const fs = require('fs');
let content = fs.readFileSync('node_modules/nodejs-server-pages/session.js', 'utf8');
content = content.replace(/await this.run\("COMMIT;"\);/g, 'await this.run("COMMIT;");\n            await this.run("PRAGMA wal_checkpoint(PASSIVE);");');
fs.writeFileSync('node_modules/nodejs-server-pages/session.js', content);
