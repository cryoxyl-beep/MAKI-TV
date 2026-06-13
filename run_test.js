const http = require('http');

http.get('http://localhost:3000/api/anizone-test?url=https://seiryuu.vid-cdn.xyz/6767d511-5551-4253-b1c9-02366ef10c6e/master.m3u8', (res) => {
  console.log('STATUS:', res.statusCode);
  console.log('HEADERS:', res.headers);
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => console.log('BODY:\n' + body));
});
