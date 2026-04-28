// Vercel serverless function adapter
// This wraps the TanStack Start fetch-based handler into Node.js req/res format
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { join } from 'node:path';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the server handler
const { default: server } = await import('../dist/server/server.js');

/**
 * Converts a Node.js IncomingMessage to a Web Request
 */
function toWebRequest(req) {
  const url = `http://${req.headers.host || 'localhost'}${req.url}`;
  const headers = new Headers();
  for (const [key, value] of Object.entries(req.headers)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        for (const v of value) headers.append(key, v);
      } else {
        headers.set(key, value);
      }
    }
  }

  const init = { method: req.method || 'GET', headers };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = req;
    init.duplex = 'half';
  }

  return new Request(url, init);
}

/**
 * Sends a Web Response to a Node.js ServerResponse
 */
async function sendWebResponse(res, webResponse) {
  res.statusCode = webResponse.status;
  res.statusMessage = webResponse.statusText;

  for (const [key, value] of webResponse.headers.entries()) {
    res.setHeader(key, value);
  }

  if (webResponse.body) {
    const reader = webResponse.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      res.write(value);
    }
  }
  res.end();
}

/**
 * Main Vercel handler (req, res)
 */
export default async function handler(req, res) {
  // Check for static assets in client directory first
  const clientDir = join(__dirname, '..', 'dist', 'client');
  const requestPath = req.url.split('?')[0];
  
  // Serve static assets directly
  if (requestPath.startsWith('/assets/')) {
    const filePath = join(clientDir, requestPath);
    if (existsSync(filePath)) {
      // Set proper content type
      const ext = filePath.split('.').pop();
      const mimeTypes = {
        js: 'application/javascript',
        css: 'text/css',
        png: 'image/png',
        jpg: 'image/jpeg',
        svg: 'image/svg+xml',
        ico: 'image/x-icon',
        woff2: 'font/woff2',
      };
      res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      createReadStream(filePath).pipe(res);
      return;
    }
  }

  try {
    const webRequest = toWebRequest(req);
    const webResponse = await server.fetch(webRequest);
    await sendWebResponse(res, webResponse);
  } catch (err) {
    console.error('[vercel-adapter] Error:', err);
    res.statusCode = 500;
    res.end('Internal Server Error');
  }
}
