const fs = require('fs');
let content = fs.readFileSync('src/boxd/BoxdTitleView.tsx', 'utf-8');

content = `import LazyImage from "../components/LazyImage";\n` + content;

content = content.replace(
  /<img src=\{title\.backdrop\} alt=\{title\.title\} className="w-full h-full object-cover opacity-20" \/>/,
  `<LazyImage src={title.backdrop} alt={title.title} className="w-full h-full object-cover opacity-20" />`
);

content = content.replace(
  /<img src=\{title\.poster\} alt=\{title\.title\} className="w-full h-full object-cover" \/>/,
  `<LazyImage src={title.poster} alt={title.title} className="w-full h-full object-cover" />`
);

content = content.replace(
  /<img src=\{epImage\} alt=\{epTitle\} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" \/>/,
  `<LazyImage src={epImage} alt={epTitle} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />`
);

fs.writeFileSync('src/boxd/BoxdTitleView.tsx', content);
