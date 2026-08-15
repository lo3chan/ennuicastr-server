const fs = require('fs');
let content = fs.readFileSync('client/src/master.ts', 'utf8');
content = content.replace(/globalConfig\.invite\n            \? globalConfig\.invite\n            : /g, '');
fs.writeFileSync('client/src/master.ts', content);
