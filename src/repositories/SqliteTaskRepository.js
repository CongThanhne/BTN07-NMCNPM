const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');
const ITaskRepository = require('./ITaskRepository');
const Task = require('../domain/Task');

/**
 * SqliteTaskRepository (Introduced in V3 & V4)
 * Persists tasks into a relational SQLite database.
 * Demonstrates Modifiability quality attribute: swapping persistence layer
 * without affecting Business Logic or Presentation.
 */
class SqliteTaskRepository extends ITaskRepository {
  constructor(dbPath) {
    super();
    this.dbPath = dbPath || path.join(__dirname, '../../data/tasks.db');
    this.ensureDirectoryExists();
    this.db = new DatabaseSync(this.dbPath);
    this.initializeSchema();
  }

  ensureDirectoryExists() {
    const dir = path.dirname(this.dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  initializeSchema() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        completed INTEGER NOT NULL DEFAULT 0,
        assignee TEXT NOT NULL DEFAULT 'Chung',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )
    `);
    try {
      this.db.exec(`ALTER TABLE tasks ADD COLUMN assignee TEXT DEFAULT 'Chung'`);
    } catch {
      // Column already exists
    }
    // Indexing for performance
    this.db.exec(`
      CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC)
    `);
  }

  mapRowToEntity(row) {
    if (!row) return null;
    return new Task({
      id: row.id,
      title: row.title,
      completed: Boolean(row.completed),
      assignee: row.assignee || 'Chung',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  async getAll() {
    const stmt = this.db.prepare('SELECT id, title, completed, assignee, created_at, updated_at FROM tasks ORDER BY created_at DESC');
    const rows = stmt.all();
    return rows.map(row => this.mapRowToEntity(row));
  }

  async getById(id) {
    const stmt = this.db.prepare('SELECT id, title, completed, assignee, created_at, updated_at FROM tasks WHERE id = ?');
    const row = stmt.get(id);
    return this.mapRowToEntity(row);
  }

  async create(task) {
    const stmt = this.db.prepare(`
      INSERT INTO tasks (id, title, completed, assignee, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(task.id, task.title, task.completed ? 1 : 0, task.assignee || 'Chung', task.createdAt, task.updatedAt);
    return task;
  }

  async update(id, updates) {
    const existing = await this.getById(id);
    if (!existing) return null;

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

    const stmt = this.db.prepare(`
      UPDATE tasks
      SET title = ?, completed = ?, assignee = ?, updated_at = ?
      WHERE id = ?
    `);
    stmt.run(existing.title, existing.completed ? 1 : 0, existing.assignee, existing.updatedAt, existing.id);
    return existing;
  }

  async delete(id) {
    const stmt = this.db.prepare('DELETE FROM tasks WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  close() {
    if (this.db) {
      this.db.close();
    }
  }
}

module.exports = SqliteTaskRepository;
