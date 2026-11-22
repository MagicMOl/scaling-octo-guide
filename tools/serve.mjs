// 零依赖静态服务：把原型仓库挂到局域网，手机同 Wi-Fi 可打开
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve('.');
const PORT = Number(process.env.PORT || 8090);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.svg': 'image/svg+xml', '.md': 'text/markdown; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
};

const server = http.createServer((req, res) => {
  const url = decodeURIComponent((req.url || '/').split('?')[0]);
  let rel = url === '/' ? 'design-demos/dir-1-v6.html' : url.replace(/^\/+/, '');
  const abs = path.join(root, rel);
  if (!abs.startsWith(root)) { res.writeHead(403); res.end('forbidden'); return; }
  fs.readFile(abs, (err, buf) => {
    if (err) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('404 ' + rel);
      return;
    }
    res.writeHead(200, {
      'content-type': MIME[path.extname(abs).toLowerCase()] || 'application/octet-stream',
      'cache-control': 'no-store',
    });
    res.end(buf);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`serving ${root} on http://0.0.0.0:${PORT}`);
});
