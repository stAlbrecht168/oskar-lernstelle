import {createServer} from 'node:http';
import {open} from 'node:fs/promises';
import {constants} from 'node:fs';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';

const PROJECT_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const HOST = '127.0.0.1';
export const PUBLIC_FILES = Object.freeze([
  'index.html',
  'study-v04.js',
  'journey-media-v07.js',
  'journeys-v05.js',
  'journey-generator-v06.js',
  'connections-v07.js',
  'planner-v08.js',
  'assessment-core-v08.js',
  'assessment-v08.js',
  'auto-material-v09.js',
  'local-folder-v10.js'
]);
const publicPaths = new Map(PUBLIC_FILES.map(name => ['/' + name, name]));
publicPaths.set('/', 'index.html');

export function createAppServer({root = PROJECT_ROOT} = {}) {
  return createServer(async (request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    const reply = (status, message) => {
      response.writeHead(status, {'Content-Type': 'text/plain; charset=utf-8'});
      response.end(request.method === 'HEAD' ? undefined : message);
    };
    // An fremde Hostnamen gerichtete Anfragen gehören nicht zur lokalen Vorschau.
    if (request.headers.host !== HOST + ':' + request.socket.localPort) {
      reply(403, 'Nicht zugelassen.');
      return;
    }
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      response.setHeader('Allow', 'GET, HEAD');
      reply(405, 'Methode nicht erlaubt.');
      return;
    }
    // Rohpfad exakt prüfen: keine URL-Normalisierung oder Dekodierung, die
    // Traversal, kodierte Trenner oder alternative Pfade zulassen könnte.
    const name = publicPaths.get((request.url || '').split('?')[0]);
    if (!name) {
      reply(404, 'Nicht gefunden.');
      return;
    }
    let file;
    try {
      // Alle freigegebenen Dateien liegen direkt im Projektordner.
      // O_NOFOLLOW verhindert auch bei gleichzeitigem Austausch Symlink-Zugriffe.
      file = await open(join(root, name), constants.O_RDONLY | constants.O_NOFOLLOW);
      if (!(await file.stat()).isFile()) {
        reply(404, 'Nicht gefunden.');
        return;
      }
      const body = await file.readFile();
      response.writeHead(200, {
        'Content-Type': name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript; charset=utf-8',
        'Content-Length': body.length
      });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      // Weder private Inhalte noch lokale Dateipfade in Fehlermeldungen ausgeben.
      reply(404, 'Nicht gefunden.');
    } finally {
      if (file) await file.close();
    }
  });
}

export async function startDevServer({port = 8000, root = PROJECT_ROOT} = {}) {
  if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('Ungültiger Port.');
  const server = createAppServer({root});
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, HOST, resolve);
  });
  return server;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    if (process.argv.length > 3 || (process.argv[2] !== undefined && !/^\d+$/.test(process.argv[2]))) {
      throw new Error('Aufruf: node scripts/dev-server.mjs [port]');
    }
    const server = await startDevServer({port: process.argv[2] === undefined ? 8000 : Number(process.argv[2])});
    console.log('Lokale Lern-App: http://' + HOST + ':' + server.address().port);
    console.log('Es werden ausschließlich die öffentlichen App-Dateien bereitgestellt.');
  } catch (error) {
    console.error(error.code === 'EADDRINUSE' ? 'Der Port ist bereits belegt.' : error.message);
    process.exitCode = 1;
  }
}
