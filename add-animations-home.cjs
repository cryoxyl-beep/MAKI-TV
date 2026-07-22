const fs = require('fs');
let content = fs.readFileSync('src/boxd/BoxdHome.tsx', 'utf-8');

content = content.replace(
  /import \{ Users, Plus, ArrowRight, Loader2, X \} from "lucide-react";/,
  `import { Users, Plus, ArrowRight, Loader2, X } from "lucide-react";\nimport { motion, AnimatePresence } from "framer-motion";`
);

content = content.replace(
  /<div className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12 animate-fade-in">/,
  `<motion.div \n      initial={{ opacity: 0, y: 20 }}\n      animate={{ opacity: 1, y: 0 }}\n      transition={{ duration: 0.5 }}\n      className="w-full max-w-7xl mx-auto px-4 md:px-8 py-8 md:py-12">\n`
);

// Close motion.div instead of div for the root element of return
const lastDivRegex = /<\/div>\s*\n\s*\);\s*\n\}/;
content = content.replace(lastDivRegex, `</motion.div>\n  );\n}`);

// Modals
content = content.replace(
  /\{\(showCreate \|\| showJoin\) && \(\s*<div className="fixed inset-0 z-\[100\] flex items-center justify-center p-4 bg-black\/60 backdrop-blur-md animate-fade-in">/,
  `<AnimatePresence>\n      {(showCreate || showJoin) && (\n        <motion.div \n          initial={{ opacity: 0 }}\n          animate={{ opacity: 1 }}\n          exit={{ opacity: 0 }}\n          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">\n          `
);

content = content.replace(
  /<div className="w-full max-w-md bg-\[#0a0a0c\]\/90 border border-white\/10 p-6 md:p-8 rounded-3xl shadow-2xl relative">/,
  `<motion.div \n            initial={{ scale: 0.95, opacity: 0, y: 10 }}\n            animate={{ scale: 1, opacity: 1, y: 0 }}\n            exit={{ scale: 0.95, opacity: 0, y: 10 }}\n            className="w-full max-w-md bg-[#0a0a0c]/90 border border-white/10 p-6 md:p-8 rounded-3xl shadow-2xl relative"\n          >`
);

content = content.replace(
  /<\/form>\s*<\/div>\s*<\/div>\s*\)}/g,
  `</form>\n          </motion.div>\n        </motion.div>\n      )}\n      </AnimatePresence>`
);

fs.writeFileSync('src/boxd/BoxdHome.tsx', content);
