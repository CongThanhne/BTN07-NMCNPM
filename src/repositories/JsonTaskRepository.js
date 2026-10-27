const fs = require('node:fs');
const path = require('node:path');
const ITaskRepository = require('./ITaskRepository');
const Task = require('../domain/Task');

/**
 * JsonTaskRepository (Used in V1 & V2)
 * Persists tasks into a single JSON file on disk.
 */
class JsonTaskRepository extends ITaskRepository {
  constructor(filePath) {
    super();
    this.filePath = filePath || path.join(__dirname, '../../data/tasks.json');
    this.ensureFileExists();
  }

  ensureFileExists() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(this.filePath)) {
      fs.writeFileSync(this.filePath, JSON.stringify([], null, 2), 'utf-8');
    }
  }

  readData() {
    this.ensureFileExists();
    const content = fs.readFileSync(this.filePath, 'utf-8');
    if (!content.trim()) return [];
    try {
      const parsed = JSON.parse(content);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  writeData(tasks) {
    const serialized = JSON.stringify(tasks, null, 2);
    // Atomic write pattern using temporary file to prevent corruption
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, serialized, 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  async getAll() {
    const raw = this.readData();
    return raw.map(item => new Task(item));
  }

  async getById(id) {
    const raw = this.readData();
    const found = raw.find(item => item.id === id);
    if (!found) return null;
    return new Task(found);
  }

  async create(task) {
    const raw = this.readData();
    const taskData = task.toJSON();
    raw.unshift(taskData);
    this.writeData(raw);
    return new Task(taskData);
  }

  async update(id, updates) {
    const raw = this.readData();
    const index = raw.findIndex(item => item.id === id);
    if (index === -1) return null;

    const existing = new Task(raw[index]);
    if (typeof updates.completed === 'boolean') {
      existing.completed = updates.completed;
      existing.updatedAt = new Date().toISOString();
    }
    if (updates.title) {
      existing.updateTitle(updates.title);
    }
    if (updates.assignee) {
      existing.assignTo(updates.assignee);
    }

    raw[index] = existing.toJSON();
    this.writeData(raw);
    return existing;
  }

  async delete(id) {
    const raw = this.readData();
    const index = raw.findIndex(item => item.id === id);
    if (index === -1) return false;

    raw.splice(index, 1);
    this.writeData(raw);
    return true;
  }
}

module.exports = JsonTaskRepository;
