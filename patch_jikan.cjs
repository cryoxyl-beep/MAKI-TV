const fs = require('fs');

const today = new Date().toISOString().split('T')[0];

function addEndDate(urlStr) {
  if (urlStr.includes('api.jikan.moe/v4/anime') || urlStr.includes('api.jikan.moe/v4/top/anime')) {
    if (!urlStr.includes('end_date=') && !urlStr.includes('/episodes')) {
      return urlStr.replace('`', `&end_date=${today}\``);
    }
  }
  return urlStr;
}

let content1 = fs.readFileSync('src/services/anilist.ts', 'utf8');
content1 = content1.replace(/const jikanUrl = `.*?`;/g, addEndDate);
content1 = content1.replace(/url = `.*?`;/g, addEndDate);
content1 = content1.replace(/const url = `.*?`;/g, addEndDate);
fs.writeFileSync('src/services/anilist.ts', content1);

let content2 = fs.readFileSync('src/services/api.ts', 'utf8');
content2 = content2.replace(/url = `.*?`;/g, addEndDate);
content2 = content2.replace(/const url = `.*?`;/g, addEndDate);
fs.writeFileSync('src/services/api.ts', content2);
