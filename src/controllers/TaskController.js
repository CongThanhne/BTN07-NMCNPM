/**
 * TaskController (Presentation / HTTP API Layer)
 * Translates HTTP requests to Service calls and formats responses.
 * Follows REST principles and separation of concerns.
 */
class TaskController {
  constructor(taskService, jsonRepo, sqliteRepo, migrationService) {
    this.taskService = taskService;
    this.jsonRepo = jsonRepo;
    this.sqliteRepo = sqliteRepo;
    this.migrationService = migrationService;
    this.currentStorage = 'sqlite'; // Default to V3/V4 SQLite, switchable to JSON
    
    // In-memory signaling bus for WebRTC pairing in V4
    this.signalingMessages = [];
  }

  setStorageMode(mode) {
    if (mode === 'json') {
      this.currentStorage = 'json';
      this.taskService.setRepository(this.jsonRepo);
      return { success: true, mode: 'json', message: 'Đã chuyển sang lưu trữ file JSON (V1/V2)' };
    }
    this.currentStorage = 'sqlite';
    this.taskService.setRepository(this.sqliteRepo);
    return { success: true, mode: 'sqlite', message: 'Đã chuyển sang lưu trữ SQLite (V3/V4)' };
  }

  async handleGetTasks(req, res) {
    try {
      const tasks = await this.taskService.listTasks();
      this.sendJson(res, 200, {
        success: true,
        data: tasks.map(t => t.toJSON()),
        storage: this.currentStorage
      });
    } catch (error) {
      this.sendJson(res, 500, { success: false, error: error.message });
    }
  }

  async handleCreateTask(body, res) {
    try {
      if (!body || !body.title) {
        return this.sendJson(res, 400, { success: false, error: 'Thiếu trường title' });
      }
      const task = await this.taskService.createTask(body.title, body.assignee);
      this.sendJson(res, 201, { success: true, data: task.toJSON() });
    } catch (error) {
      this.sendJson(res, 400, { success: false, error: error.message });
    }
  }

  async handleUpdateTask(id, body, res) {
    try {
      const task = await this.taskService.updateTask(id, body || {});
      this.sendJson(res, 200, { success: true, data: task.toJSON() });
    } catch (error) {
      const status = error.message.includes('Không tìm thấy') ? 404 : 400;
      this.sendJson(res, status, { success: false, error: error.message });
    }
  }

  async handleToggleTask(id, res) {
    try {
      const task = await this.taskService.toggleTaskStatus(id);
      this.sendJson(res, 200, { success: true, data: task.toJSON() });
    } catch (error) {
      const status = error.message.includes('Không tìm thấy') ? 404 : 400;
      this.sendJson(res, status, { success: false, error: error.message });
    }
  }

  async handleDeleteTask(id, res) {
    try {
      await this.taskService.deleteTask(id);
      this.sendJson(res, 200, { success: true, message: `Đã xóa công việc ${id}` });
    } catch (error) {
      const status = error.message.includes('Không thể xóa') ? 404 : 400;
      this.sendJson(res, status, { success: false, error: error.message });
    }
  }

  async handleGetConfig(res) {
    const jsonCount = (await this.jsonRepo.getAll()).length;
    const sqliteCount = (await this.sqliteRepo.getAll()).length;
    this.sendJson(res, 200, {
      currentStorage: this.currentStorage,
      jsonCount,
      sqliteCount
    });
  }

  async handleSetStorage(body, res) {
    const mode = body && body.mode;
    if (mode !== 'json' && mode !== 'sqlite') {
      return this.sendJson(res, 400, { success: false, error: 'Chế độ không hợp lệ (phải là json hoặc sqlite)' });
    }
    const result = this.setStorageMode(mode);
    this.sendJson(res, 200, result);
  }

  async handleMigrate(res) {
    try {
      const result = await this.migrationService.migrate();
      this.sendJson(res, 200, { success: true, ...result });
    } catch (error) {
      this.sendJson(res, 500, { success: false, error: error.message });
    }
  }

  // WebRTC Signaling Endpoints (For establishing V4 P2P connection)
  handlePostSignal(body, res) {
    if (!body || !body.peerId || !body.data) {
      return this.sendJson(res, 400, { success: false, error: 'Thiếu thông tin signaling' });
    }
    this.signalingMessages.push({
      from: body.peerId,
      target: body.target,
      data: body.data,
      timestamp: Date.now()
    });
    // Keep only last 50 signaling messages
    if (this.signalingMessages.length > 50) {
      this.signalingMessages.shift();
    }
    this.sendJson(res, 200, { success: true });
  }

  handleGetSignals(peerId, res) {
    const messages = this.signalingMessages.filter(m => !m.target || m.target === peerId);
    this.sendJson(res, 200, { success: true, messages });
  }

  sendJson(res, statusCode, data) {
    res.writeHead(statusCode, {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end(JSON.stringify(data));
  }
}

module.exports = TaskController;
