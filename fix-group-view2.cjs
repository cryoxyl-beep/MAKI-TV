const fs = require('fs');
let content = fs.readFileSync('src/boxd/BoxdGroupView.tsx', 'utf-8');

// The titles map is currently:
// </div>
// ))}
// we need it to be
// </motion.div>
// ))}
content = content.replace(
  /                  <\/div>\n                \}\)\}\n              <\/div>/,
  `                  </motion.div>\n                ))}\n              </div>`
);

// The members map is currently:
// </div>
// ))}
// which is correct for members (they are divs)

// The root closing is currently:
// </div>
// );
// }
// we need it to be
// </motion.div>
// );
// }
content = content.replace(
  /    <\/div>\n  \);\n\}/,
  `    </motion.div>\n  );\n}`
);

fs.writeFileSync('src/boxd/BoxdGroupView.tsx', content);
