const fs = require('fs');
let text = fs.readFileSync('src/components/WatchPage.tsx', 'utf-8');
const lines = text.split('\n');
text = lines.slice(0, 978).join('\n') + '\n      </div>\n    </div>\n  );\n}';
fs.writeFileSync('src/components/WatchPage.tsx', text);
