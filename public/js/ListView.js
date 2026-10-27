/**
 * ListView (Presentation Layer for V1 & V2)
 * Renders tasks in a traditional vertical list.
 * Decoupled from Business Logic and Data Storage.
 */
class ListView {
  constructor(containerElement, handlers) {
    this.container = containerElement;
    this.handlers = handlers; // { onToggle, onDelete }
  }

  render(tasks) {
    if (!tasks || tasks.length === 0) {
      this.container.innerHTML = `
        <div class="empty-state">
          <p>Chưa có công việc nào. Hãy thêm công việc mới ở trên!</p>
        </div>
      `;
      return;
    }

    const html = `
      <ul class="task-list">
        ${tasks.map(task => `
          <li class="task-item ${task.completed ? 'completed' : ''}" data-id="${task.id}">
            <div class="task-left">
              <input 
                type="checkbox" 
                class="task-checkbox" 
                ${task.completed ? 'checked' : ''} 
                onchange="window.app.handleToggle('${task.id}')"
              />
              <div>
                <div class="task-title">${this.escapeHtml(task.title)}</div>
                <div style="display: flex; gap: 8px; align-items: center; margin-top: 2px;">
                  <span class="badge-user" style="font-size: 0.72rem;">👤 ${this.escapeHtml(task.assignee || 'Chung')}</span>
                  <span class="task-time">${new Date(task.createdAt).toLocaleTimeString('vi-VN')}</span>
                </div>
              </div>
            </div>
            <button class="btn-delete" title="Xóa task" onclick="window.app.handleDelete('${task.id}')">
              &times;
            </button>
          </li>
        `).join('')}
      </ul>
    `;

    this.container.innerHTML = html;
  }

  escapeHtml(str) {
    return (str || '').replace(/[&<>"']/g, m => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[m]));
  }
}

window.ListView = ListView;
