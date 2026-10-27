const Task = require('../domain/Task');

/**
 * TaskService (Business Logic / Use Cases)
 * Enforces business rules and coordinates operations between domain and repository.
 * Completely decoupled from HTTP transport and specific database implementations.
 */
class TaskService {
  constructor(taskRepository) {
    this.repository = taskRepository;
  }

  setRepository(newRepository) {
    this.repository = newRepository;
  }

  getRepository() {
    return this.repository;
  }

  async listTasks() {
    return await this.repository.getAll();
  }

  async getTask(id) {
    if (!id) return null;
    return await this.repository.getById(id);
  }

  async createTask(title, assignee = 'Chung') {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Tiêu đề công việc là bắt buộc.');
    }

    const newTask = new Task({ title: title.trim(), assignee });
    return await this.repository.create(newTask);
  }

  async toggleTaskStatus(id) {
    if (!id) {
      throw new Error('ID công việc không hợp lệ.');
    }

    const existing = await this.repository.getById(id);
    if (!existing) {
      throw new Error(`Không tìm thấy công việc với ID: ${id}`);
    }

    const newCompleted = !existing.completed;
    return await this.repository.update(id, { completed: newCompleted });
  }

  async updateTask(id, { title, completed, assignee }) {
    if (!id) {
      throw new Error('ID công việc không hợp lệ.');
    }

    const updates = {};
    if (typeof completed === 'boolean') {
      updates.completed = completed;
    }
    if (typeof title === 'string' && title.trim().length > 0) {
      updates.title = title.trim();
    }
    if (typeof assignee === 'string' && assignee.trim().length > 0) {
      updates.assignee = assignee.trim();
    }

    const updated = await this.repository.update(id, updates);
    if (!updated) {
      throw new Error(`Không tìm thấy công việc với ID: ${id}`);
    }
    return updated;
  }

  async deleteTask(id) {
    if (!id) {
      throw new Error('ID công việc không hợp lệ.');
    }

    const success = await this.repository.delete(id);
    if (!success) {
      throw new Error(`Không thể xóa: công việc không tồn tại (ID: ${id})`);
    }
    return true;
  }
}

module.exports = TaskService;
