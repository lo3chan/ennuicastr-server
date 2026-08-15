const fs = require('fs');
let content = fs.readFileSync('client/src/master.ts', 'utf8');
content = content.replace(/import globalConfig from "\.\.\/config\/config.json";\n/, '');
content = content.replace(/import \* as util from "\.\.\/config\/config.json";\n/, '');
fs.writeFileSync('client/src/master.ts', content);
