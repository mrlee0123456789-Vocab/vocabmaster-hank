const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT = 8765;
const BASE = path.join(__dirname, 'vocab master');
const MIME = {
  html: 'text/html; charset=utf-8',
  css:  'text/css',
  js:   'application/javascript',
  json: 'application/json'
};

const server = http.createServer((req, res) => {
  let url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/' || url === '') url = '/index.html';
  const fp = path.join(BASE, url);
  // 安全检查：不能跳出BASE目录
  if (!fp.startsWith(BASE)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }
  fs.readFile(fp, (err, data) => {
    if (err) {
      res.writeHead(404); res.end('Not found: ' + url);
    } else {
      const ext = fp.split('.').pop().toLowerCase();
      res.writeHead(200, {
        'Content-Type': MIME[ext] || 'text/plain',
        'Access-Control-Allow-Origin': '*'
      });
      res.end(data);
    }
  });
});

server.listen(PORT, () => {
  console.log('VocabMaster server running at http://localhost:' + PORT);
});
