const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';

  // URL alias mapping for clean routes
  const routeAliases = {
    '/product': '/product.html',
    '/how-it-works': '/how-it-works.html',
    '/pricing': '/pricing.html',
    '/faq': '/faqs.html',
    '/faqs': '/faqs.html',
    '/privacy': '/privacy.html',
    '/legal/privacy': '/privacy.html',
    '/terms': '/terms.html',
    '/legal/terms': '/terms.html',
    '/login': '/login.html',
    '/register': '/register.html',
    '/signup': '/register.html',
    '/dashboard': '/dashboard.html',
    '/book': '/storefront.html',
    '/storefront': '/storefront.html'
  };

  if (routeAliases[reqPath]) {
    reqPath = routeAliases[reqPath];
  } else if (reqPath.startsWith('/p/')) {
    reqPath = '/storefront.html';
  }

  let filePath = path.join(__dirname, reqPath);

  // If path has no extension and is not directory, check if .html file exists
  if (!path.extname(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  // Security check to avoid escaping root
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <title>Page Not Found · Vela</title>
          <link rel="stylesheet" href="/styles.css">
        </head>
        <body style="background:#C5F36A; padding:20px; font-family:sans-serif; text-align:center;">
          <div style="background:#F7F6F0; border-radius:24px; padding:60px 20px; max-width:600px; margin:40px auto; box-shadow:0 10px 30px rgba(0,0,0,0.1);">
            <img src="/assets/vela-logo-black-opt.png" alt="vela" style="height:32px; margin-bottom:24px;">
            <h1 style="color:#161817; font-size:32px; font-weight:700; margin-bottom:12px;">Page Not Found</h1>
            <p style="color:#666; margin-bottom:24px;">The page you are looking for does not exist or has moved.</p>
            <a href="/" class="btn btn-pill-ink" style="display:inline-block; padding:12px 28px; background:#161817; color:#F7F6F0; text-decoration:none; border-radius:999px; font-weight:600;">Return to Homepage</a>
          </div>
        </body>
        </html>
      `);
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stats.size,
      'Cache-Control': 'no-cache'
    });

    if (req.method === 'HEAD') {
      return res.end();
    }

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Vela local server running at http://localhost:${PORT}`);
});
