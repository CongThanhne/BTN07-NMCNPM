/**
 * ApiStorage (Client-side Data Access Layer)
 * Handles HTTP REST calls to backend server and provides polling for V2 multi-client sync.
 */
class ApiStorage {
  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
    this.pollingTimer = null;
    this.isServerOnline = true;
  }

  async fetchTasks() {
    try {
      const res = await fetch(`${this.baseUrl}/api/tasks`);
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      const data = await res.json();
      this.isServerOnline = true;
      return data;
    } catch (err) {
      this.isServerOnline = false;
      throw err;
    }
  }

  async createTask(title, assignee = 'Chung') {
    const res = await fetch(`${this.baseUrl}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, assignee })
    });
    if (!res.ok) throw new Error('Không thể tạo công việc trên server');
    return await res.json();
  }

  async toggleTask(id) {
    const res = await fetch(`${this.baseUrl}/api/tasks/${id}/toggle`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Không thể cập nhật trạng thái trên server');
    return await res.json();
  }

  async deleteTask(id) {
    const res = await fetch(`${this.baseUrl}/api/tasks/${id}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Không thể xóa công việc trên server');
    return await res.json();
  }

  async getConfig() {
    const res = await fetch(`${this.baseUrl}/api/config`);
    if (!res.ok) throw new Error('Lỗi lấy thông tin cấu hình');
    return await res.json();
  }

  async setStorage(mode) {
    const res = await fetch(`${this.baseUrl}/api/config/storage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode })
    });
    if (!res.ok) throw new Error('Lỗi thay đổi nguồn lưu trữ');
    return await res.json();
  }

  async migrate() {
    const res = await fetch(`${this.baseUrl}/api/config/migrate`, {
      method: 'POST'
    });
    if (!res.ok) throw new Error('Lỗi di chuyển dữ liệu');
    return await res.json();
  }

  startPolling(callback, intervalMs = 2500) {
    this.stopPolling();
    this.pollingTimer = setInterval(async () => {
      try {
        const result = await this.fetchTasks();
        if (result && result.success) {
          callback(result.data, result.storage);
        }
      } catch (err) {
        // Server might be stopped (e.g. for V4 testing)
        callback(null, null, false);
      }
    }, intervalMs);
  }

  stopPolling() {
    if (this.pollingTimer) {
      clearInterval(this.pollingTimer);
      this.pollingTimer = null;
    }
  }
}

window.ApiStorage = ApiStorage;
