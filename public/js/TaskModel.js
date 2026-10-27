/**
 * TaskModel (Client-side Domain & State Management)
 * Holds current list of tasks and notifies observers upon changes.
 */
class TaskModel {
  constructor() {
    this.tasks = [];
    this.listeners = [];
  }

  subscribe(listener) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.tasks);
    }
  }

  setTasks(newTasks) {
    this.tasks = Array.isArray(newTasks) ? newTasks : [];
    this.notify();
  }

  getTasks() {
    return [...this.tasks];
  }

  addTask(task) {
    const existingIndex = this.tasks.findIndex(t => t.id === task.id);
    if (existingIndex >= 0) {
      this.tasks[existingIndex] = task;
    } else {
      this.tasks.unshift(task);
    }
    this.notify();
  }

  updateTask(updatedTask) {
    const index = this.tasks.findIndex(t => t.id === updatedTask.id);
    if (index !== -1) {
      this.tasks[index] = updatedTask;
      this.notify();
    }
  }

  removeTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
    this.notify();
  }
}

window.TaskModel = TaskModel;
