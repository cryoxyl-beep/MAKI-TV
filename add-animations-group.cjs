const fs = require('fs');
let content = fs.readFileSync('src/boxd/BoxdGroupView.tsx', 'utf-8');

content = content.replace(
  /import \{ Users, Plus, ArrowLeft, Star, Film, MonitorPlay, Ghost \} from "lucide-react";/,
  `import { Users, Plus, ArrowLeft, Star, Film, MonitorPlay, Ghost } from "lucide-react";\nimport { motion } from "framer-motion";`
);

content = content.replace(
  /<div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 animate-fade-in">/,
  `<motion.div \n      initial={{ opacity: 0, y: 15 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.5 }}\n      className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">`
);

content = content.replace(
  /<div key=\{title\.id\} onClick=\{/g,
  `<motion.div\n                    initial={{ opacity: 0, scale: 0.95 }}\n                    animate={{ opacity: 1, scale: 1 }}\n                    transition={{ duration: 0.4 }}\n                    key={title.id}\n                    onClick={`
);

// Close motion.div instead of div for the root element of return
const lastDivRegex = /<\/div>\s*\n\s*\);\s*\n\}/;
content = content.replace(lastDivRegex, `</motion.div>\n  );\n}`);

// Close the inner mapped item motion.div
content = content.replace(
  /<\/div>\s*<\/div>\s*\)\)\}\s*<\/div>\s*\)\}\s*<\/div>/g,
  `</div>\n                  </motion.div>\n                ))}\n              </div>\n            )}\n          </div>`
);

fs.writeFileSync('src/boxd/BoxdGroupView.tsx', content);
