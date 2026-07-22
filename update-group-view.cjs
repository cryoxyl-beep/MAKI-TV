const fs = require('fs');
let content = fs.readFileSync('src/boxd/BoxdGroupView.tsx', 'utf-8');

if(!content.includes('import LazyImage')) {
  content = content.replace(
    /import \{ Users, Plus, ArrowLeft, Star, Film, MonitorPlay, Ghost \} from "lucide-react";/,
    `import { Users, Plus, ArrowLeft, Star, Film, MonitorPlay, Ghost } from "lucide-react";\nimport LazyImage from "../components/LazyImage";`
  );
  
  content = content.replace(
    /<img \s*src=\{title\.poster\} \s*alt=\{title\.title\} \s*className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" \s*\/>/m,
    `<LazyImage 
                          src={title.poster} 
                          alt={title.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                        />`
  );
  
  // also replace any other img that might be used for poster
  content = content.replace(
    /<img src=\{title\.poster\} alt=\{title\.title\} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" \/>/g,
    `<LazyImage src={title.poster} alt={title.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />`
  );
  
  fs.writeFileSync('src/boxd/BoxdGroupView.tsx', content);
}
