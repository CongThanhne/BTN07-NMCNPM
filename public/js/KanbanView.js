/**
 * KanbanView (Presentation Layer for V3 & V4)
 * Renders tasks in a modern 2-column Kanban Board (Chưa hoàn thành vs Hoàn thành).
 * Demonstrates Modifiability quality attribute: UI changes while business logic remains intact.
 */
class KanbanView {
  constructor(containerElement, handlers) {
    this.container = containerElement;
    this.handlers = handlers; // { onToggle, onDelete }
  }

  render(tasks) {
    const todoTasks = tasks.filter(t => !t.completed);
    const doneTasks = tasks.filter(t => t.completed);

    const html = `
      <div class="kanban-board">
        <!-- Cột 1: Chưa hoàn thành -->
        <div class="kanban-col">
          <div class="kanban-header">
            <h3>⏳ Chưa hoàn thành</h3>
            <span class="kanban-count">${todoTasks.length}</span>
          </div>
          <div class="kanban-items">
            ${todoTasks.length === 0 ? '<div class="empty-state">Không có task nào đang chờ</div>' : ''}
            ${todoTasks.map(t => this.renderCard(t, false)).join('')}
          </div>
        </div>

        <!-- Cột 2: Đã hoàn thành -->
        <div class="kanban-col">
          <div class="kanban-header">
            <h3>✅ Đã hoàn thành</h3>
            <span class="kanban-count">${doneTasks.length}</span>
          </div>
          <div class="kanban-items">
            ${doneTasks.length === 0 ? '<div class="empty-state">Chưa có task nào hoàn thành</div>' : ''}
            ${doneTasks.map(t => this.renderCard(t, true)).join('')}
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  renderCard(task, isDone) {
    const assignee = task.assignee || 'Chung';
    return `
      <div class="kanban-card ${isDone ? 'completed' : ''}" data-id="${task.id}">
        <div class="kanban-card-top">
          <span class="kanban-card-title">${this.escapeHtml(task.title)}</span>
          <button class="btn-delete" title="Xóa" onclick="window.app.handleDelete('${task.id}')">&times;</button>
        </div>
        <div class="kanban-card-bottom">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span class="badge-user" title="Người phụ trách">👤 ${this.escapeHtml(assignee)}</span>
            <span>${new Date(task.createdAt).toLocaleTimeString('vi-VN')}</span>
          </div>
          <button class="btn-move" onclick="window.app.handleToggle('${task.id}')">
            ${isDone ? '↩️ Đánh dấu Chưa xong' : '✔️ Đánh dấu Xong'}
          </button>
        </div>
      </div>
    `;
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}

window.KanbanView = KanbanView;
