const fs = require('fs');
let content = fs.readFileSync('client/src/file-storage.ts', 'utf8');
content = content.replace(/    forcePrompt\?\: boolean\nexport async function/, '    forcePrompt?: boolean\n}\n\nexport async function');
fs.writeFileSync('client/src/file-storage.ts', content);
