import fs from 'fs';
import path from 'fs';
import { fileURLToPath } from 'url';

const walkSync = (dir: string, filelist: string[] = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = dir + '/' + file;
    const dirent = fs.statSync(dirFile);
    if (dirent.isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.ts') || dirFile.endsWith('.tsx')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const files = walkSync('./src');
files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  const newContent = content.replace(/.*console\.(log|warn|error|info|debug)\(.*?\);\n?/g, '');
  if (content !== newContent) {
    fs.writeFileSync(file, newContent);
    console.log(`Cleaned ${file}`);
  }
});
