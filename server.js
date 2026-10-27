const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const url = require('node:url');

const JsonTaskRepository = require('./src/repositories/JsonTaskRepository');
const SqliteTaskRepository = require('./src/repositories/SqliteTaskRepository');
const DataMigration = require('./src/repositories/DataMigration');
const TaskService = require('./src/services/TaskService');
const TaskController = require('./src/controllers/TaskController');

// Initialize Clean Architecture layers
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const jsonRepo = new JsonTaskRepository(path.join(dataDir, 'tasks.json'));
const sqliteRepo = new SqliteTaskRepository(path.join(dataDir, 'tasks.db'));
const migrationService = new DataMigration(jsonRepo, sqliteRepo);

// Default to sqlite (or json if specified via ENV STORAGE=json)
const initialStorage = process.env.STORAGE === 'json' ? 'json' : 'sqlite';
const activeRepo = initialStorage === 'json' ? jsonRepo : sqliteRepo;
const taskService = new TaskService(activeRepo);
const controller = new TaskController(taskService, jsonRepo, sqliteRepo, migrationService);
controller.setStorageMode(initialStorage);

// Auto-seed SQLite from tasks.json on fresh boot if SQLite is empty
(async () => {
  try {
    const sqliteTasks = await sqliteRepo.getAll();
    const jsonTasks = await jsonRepo.getAll();
    if (sqliteTasks.length === 0 && jsonTasks.length > 0) {
      await migrationService.migrate();
    }
  } catch (err) {
    console.error('Lỗi auto-seed SQLite:', err.message);
  }
})();

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      if (!body) return resolve({});
      try {
        resolve(JSON.parse(body));
      } catch (err) {
        resolve({});
      }
    });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost:3000'}`);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // API Routing
  if (pathname.startsWith('/api/')) {
    // GET /api/tasks
    if (pathname === '/api/tasks' && method === 'GET') {
      return controller.handleGetTasks(req, res);
    }

    // POST /api/tasks
    if (pathname === '/api/tasks' && method === 'POST') {
      const body = await parseRequestBody(req);
      return controller.handleCreateTask(body, res);
    }

    // PATCH /api/tasks/:id or POST /api/tasks/:id/toggle
    const taskActionMatch = pathname.match(/^\/api\/tasks\/([^/]+)(\/toggle)?$/);
    if (taskActionMatch) {
      const id = taskActionMatch[1];
      const isToggle = taskActionMatch[2] === '/toggle';

      if (isToggle && (method === 'POST' || method === 'PATCH')) {
        return controller.handleToggleTask(id, res);
      }
      if (method === 'PATCH') {
        const body = await parseRequestBody(req);
        return controller.handleUpdateTask(id, body, res);
      }
      if (method === 'DELETE') {
        return controller.handleDeleteTask(id, res);
      }
    }

    // Config & Architecture Control Endpoints
    if (pathname === '/api/config' && method === 'GET') {
      return controller.handleGetConfig(res);
    }

    if (pathname === '/api/config/storage' && method === 'POST') {
      const body = await parseRequestBody(req);
      return controller.handleSetStorage(body, res);
    }

    if (pathname === '/api/config/migrate' && method === 'POST') {
      return controller.handleMigrate(res);
    }

    // Signaling for V4 WebRTC P2P
    if (pathname === '/api/signaling/send' && method === 'POST') {
      const body = await parseRequestBody(req);
      return controller.handlePostSignal(body, res);
    }

    if (pathname === '/api/signaling/receive' && method === 'GET') {
      const peerId = parsedUrl.searchParams.get('peerId');
      return controller.handleGetSignals(peerId, res);
    }

    // Not found API
    return controller.sendJson(res, 404, { success: false, error: 'Endpoint không tồn tại' });
  }

  // Static File Serving
  let relativePath = pathname === '/' ? 'index.html' : pathname.replace(/^\//, '');
  let filePath = path.join(PUBLIC_DIR, relativePath);

  // Security check: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      // Fallback to index.html for SPA if not found
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500);
        return res.end('Error loading file');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Task Architecture Evolution Server Running`);
  console.log(`👉 URL: http://localhost:${PORT}`);
  console.log(`📦 Initial Storage: ${controller.currentStorage.toUpperCase()}`);
  console.log(`====================================================`);
});
