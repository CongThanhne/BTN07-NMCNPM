/**
 * Domain Entity: Task
 * Represents a task in the domain with validation and state transition rules.
 */
class Task {
  constructor({ id, title, completed = false, assignee = 'Chung', createdAt = null, updatedAt = null }) {
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      throw new Error('Tiêu đề công việc không được để trống.');
    }

    this.id = id || Task.generateId();
    this.title = title.trim();
    this.completed = Boolean(completed);
    this.assignee = (assignee && typeof assignee === 'string' && assignee.trim()) ? assignee.trim() : 'Chung';
    this.createdAt = createdAt || new Date().toISOString();
    this.updatedAt = updatedAt || this.createdAt;
  }

  static generateId() {
    return 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 7);
  }

  toggleCompleted() {
    this.completed = !this.completed;
    this.updatedAt = new Date().toISOString();
    return this;
  }

  assignTo(newAssignee) {
    if (newAssignee && typeof newAssignee === 'string' && newAssignee.trim()) {
      this.assignee = newAssignee.trim();
      this.updatedAt = new Date().toISOString();
    }
    return this;
  }

  updateTitle(newTitle) {
    if (!newTitle || typeof newTitle !== 'string' || newTitle.trim().length === 0) {
      throw new Error('Tiêu đề công việc không hợp lệ.');
    }
    this.title = newTitle.trim();
    this.updatedAt = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      id: this.id,
      title: this.title,
      completed: this.completed,
      assignee: this.assignee,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = Task;
