const net = require('net');

const client = new net.Socket();
client.connect(3000, 'localhost', () => {
  client.write('GET /api/anizone-test?url=https://seiryuu.vid-cdn.xyz/6767d511-5551-4253-b1c9-02366ef10c6e/master.m3u8 HTTP/1.1\r\nHost: localhost:3000\r\nConnection: close\r\n\r\n');
});

client.on('data', (data) => {
  console.log(data.toString());
});
client.on('close', () => {
  console.log('Connection closed');
});
