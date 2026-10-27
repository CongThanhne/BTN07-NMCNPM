/**
 * Application Controller (MVC / MVVM coordinator)
 * Manages active architecture mode (V1, V2, V3, V4), synchronizes Views and Models.
 */
class AppController {
  constructor() {
    this.model = new TaskModel();
    this.api = new ApiStorage();
    this.currentVersion = 'v3'; // Default to V3 (Kanban + SQLite)
    this.currentStorage = 'sqlite';

    // UI Containers
    this.tasksContainer = document.getElementById('tasks-container');
    this.p2pPanel = document.getElementById('p2p-panel');
    this.p2pLogs = document.getElementById('p2p-logs');
    this.statusStorage = document.getElementById('status-storage');
    this.statusConnection = document.getElementById('status-connection');
    this.statusP2P = document.getElementById('status-p2p');
    this.versionExplanation = document.getElementById('version-explanation');

    // Multi-user Elements (V3.5)
    this.currentUser = 'Alice';
    this.filterMode = 'ALL';
    this.userSwitchBar = document.getElementById('user-switch-bar');
    this.currentUserSelect = document.getElementById('current-user-select');
    this.filterUserSelect = document.getElementById('filter-user-select');
    this.assignToSelect = document.getElementById('assign-to-select');

    // Instantiate Views
    this.listView = new ListView(this.tasksContainer, {
      onToggle: (id) => this.handleToggle(id),
      onDelete: (id) => this.handleDelete(id)
    });

    this.kanbanView = new KanbanView(this.tasksContainer, {
      onToggle: (id) => this.handleToggle(id),
      onDelete: (id) => this.handleDelete(id)
    });

    // P2P Manager Setup (V4)
    const randomPeerName = 'Peer_' + Math.floor(100 + Math.random() * 900);
    this.peerManager = new P2PPeerManager(
      randomPeerName,
      (payload) => this.handleP2PMessage(payload),
      (connected) => this.handleP2PStatusChange(connected),
      (logMsg) => this.appendP2PLog(logMsg)
    );

    document.getElementById('my-peer-id').textContent = this.peerManager.peerId;

    // Subscribe to Model
    this.model.subscribe((tasks) => this.renderCurrentView(tasks));
  }

  async init() {
    this.setupEventListeners();
    await this.refreshStorageStatus();
    await this.setVersion(this.currentVersion);
  }

  setupEventListeners() {
    // Form submit
    const form = document.getElementById('add-task-form');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('task-input');
      const title = input.value.trim();
      if (title) {
        this.handleCreate(title);
        input.value = '';
      }
    });

    // Version switcher buttons
    document.querySelectorAll('.ver-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const ver = e.target.getAttribute('data-ver');
        this.setVersion(ver);
      });
    });

    // Storage toggle buttons
    document.getElementById('btn-use-json')?.addEventListener('click', () => this.switchStorage('json'));
    document.getElementById('btn-use-sqlite')?.addEventListener('click', () => this.switchStorage('sqlite'));
    document.getElementById('btn-migrate')?.addEventListener('click', () => this.triggerMigration());

    // Multi-user event listeners (V3.5)
    this.currentUserSelect?.addEventListener('change', (e) => {
      this.currentUser = e.target.value;
      if (this.assignToSelect) this.assignToSelect.value = this.currentUser;
      this.renderCurrentView(this.model.getTasks());
    });

    this.filterUserSelect?.addEventListener('change', (e) => {
      this.filterMode = e.target.value;
      this.renderCurrentView(this.model.getTasks());
    });

    // P2P Controls
    document.getElementById('btn-p2p-listen')?.addEventListener('click', () => {
      this.peerManager.listenForSignals();
    });

    document.getElementById('btn-p2p-connect')?.addEventListener('click', () => {
      const targetId = document.getElementById('target-peer-input').value.trim();
      this.peerManager.startAutoSignaling(targetId);
    });

    document.getElementById('btn-manual-offer')?.addEventListener('click', async () => {
      const offerStr = await this.peerManager.generateManualOffer();
      prompt('Sao chép mã SDP Offer này và gửi cho Peer kia:', offerStr);
    });

    document.getElementById('btn-manual-answer')?.addEventListener('click', async () => {
      const offerInput = prompt('Dán mã SDP Offer nhận từ Peer kia vào đây:');
      if (offerInput) {
        const answerStr = await this.peerManager.applyManualOfferAndCreateAnswer(offerInput);
        prompt('Sao chép mã SDP Answer này và gửi lại cho Peer gửi Offer:', answerStr);
      }
    });

    document.getElementById('btn-apply-answer')?.addEventListener('click', async () => {
      const answerInput = prompt('Dán mã SDP Answer nhận từ Peer kia vào đây:');
      if (answerInput) {
        await this.peerManager.applyManualAnswer(answerInput);
      }
    });
  }

  async setVersion(ver) {
    this.currentVersion = ver;

    // Update active button state
    document.querySelectorAll('.ver-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-ver') === ver);
    });

    // Explanations per version
    const explanations = {
      v1: {
        title: 'V1: Chạy cục bộ trên 1 máy (JSON Storage)',
        desc: 'Ứng dụng nguyên khối tối giản. Dữ liệu lưu vào tasks.json trên disk. Không có đồng bộ đa client.',
        storage: 'json',
        showP2P: false,
        polling: false
      },
      v2: {
        title: 'V2: Chia sẻ trạng thái nhiều Client (Client-Server + Polling)',
        desc: 'Nhiều trình duyệt / thiết bị dùng chung backend API và file tasks.json. Hệ thống polling tự động 2.5s.',
        storage: 'json',
        showP2P: false,
        polling: true
      },
      v3: {
        title: 'V3: N-Layer & MVC/MVVM (Giao diện Kanban 2 cột + SQLite Database)',
        desc: 'Thay giao diện sang Kanban 2 cột. Thay nguồn lưu trữ sang SQLite với bước Data Migration an toàn. Tách bạch Presentation, Business Logic, Persistence.',
        storage: 'sqlite',
        showP2P: false,
        showMultiUser: false,
        polling: true
      },
      'v3.5': {
        title: 'V3.5: Multi-user (Phân công & Quản lý Đa Người Dùng)',
        desc: 'Bổ sung danh tính người dùng (Alice, Bob, Charlie). Mỗi task được phân công cho một thành viên cụ thể; hỗ trợ lọc công việc cá nhân hoặc xem toàn nhóm.',
        storage: 'sqlite',
        showP2P: false,
        showMultiUser: true,
        polling: true
      },
      v4: {
        title: 'V4: Cộng tác P2P khi mất Server (WebRTC DataChannel Mesh)',
        desc: 'Hai client kết nối trực tiếp qua WebRTC DataChannel. Bạn có thể TẮT BACKEND SERVER, hai trình duyệt vẫn chia sẻ và đổi trạng thái task tức thì!',
        storage: 'sqlite',
        showP2P: true,
        showMultiUser: true,
        polling: true
      }
    };

    const config = explanations[ver];
    this.versionExplanation.innerHTML = `<strong>${config.title}</strong>: ${config.desc}`;

    // Show/hide P2P Panel
    this.p2pPanel.style.display = config.showP2P ? 'block' : 'none';

    // Show/hide Multi-user Controls
    const isMultiUser = Boolean(config.showMultiUser);
    if (this.userSwitchBar) this.userSwitchBar.style.display = isMultiUser ? 'flex' : 'none';
    if (this.assignToSelect) this.assignToSelect.style.display = isMultiUser ? 'inline-block' : 'none';

    // Switch storage if needed
    if (this.currentStorage !== config.storage) {
      await this.switchStorage(config.storage);
    } else {
      await this.loadTasks();
    }

    // Configure Polling
    if (config.polling) {
      this.api.startPolling((tasks, storage, online) => {
        if (online === false) {
          this.statusConnection.innerHTML = '🔴 Server Offline (Đã tắt)';
          this.statusConnection.className = 'badge badge-rose';
        } else {
          this.statusConnection.innerHTML = '🟢 Server Online';
          this.statusConnection.className = 'badge badge-sage';
          if (tasks) this.model.setTasks(tasks);
          if (storage) this.updateStorageBadge(storage);
        }
      });
    } else {
      this.api.stopPolling();
    }

    this.renderCurrentView(this.model.getTasks());
  }

  renderCurrentView(tasks) {
    let displayedTasks = tasks;
    if ((this.currentVersion === 'v3.5' || this.currentVersion === 'v4') && this.filterMode === 'MY') {
      displayedTasks = tasks.filter(t => (t.assignee || 'Chung') === this.currentUser);
    }

    if (this.currentVersion === 'v1' || this.currentVersion === 'v2') {
      this.listView.render(displayedTasks);
    } else {
      this.kanbanView.render(displayedTasks);
    }
  }

  async loadTasks() {
    try {
      const res = await this.api.fetchTasks();
      if (res && res.data) {
        this.model.setTasks(res.data);
        this.updateStorageBadge(res.storage);
      }
    } catch (err) {
      this.appendP2PLog('Không thể tải task từ server (có thể server đã tắt)');
    }
  }

  async handleCreate(title) {
    const isMultiUserMode = this.currentVersion === 'v3.5' || this.currentVersion === 'v4';
    const assignee = (isMultiUserMode && this.assignToSelect) 
      ? this.assignToSelect.value 
      : (isMultiUserMode ? this.currentUser : 'Chung');

    // Optimistic / Local creation
    const tempTask = {
      id: 'task_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6),
      title: title,
      completed: false,
      assignee: assignee,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // If P2P is connected, broadcast directly!
    if (this.peerManager.isConnected) {
      this.peerManager.broadcast('TASK_CREATED', tempTask);
    }

    // Try server save if online
    try {
      const res = await this.api.createTask(title, assignee);
      if (res && res.data) {
        this.model.addTask(res.data);
        return;
      }
    } catch (err) {
      this.appendP2PLog('Server offline: Lưu task vào bộ nhớ client và đồng bộ qua P2P.');
    }

    // Fallback in offline P2P mode
    this.model.addTask(tempTask);
  }

  async handleToggle(id) {
    const existing = this.model.getTasks().find(t => t.id === id);
    if (!existing) return;

    const updated = {
      ...existing,
      completed: !existing.completed,
      updatedAt: new Date().toISOString()
    };

    // If P2P is connected, broadcast directly!
    if (this.peerManager.isConnected) {
      this.peerManager.broadcast('TASK_TOGGLED', updated);
    }

    // Update locally
    this.model.updateTask(updated);

    // Try server save
    try {
      await this.api.toggleTask(id);
    } catch (err) {
      this.appendP2PLog('Server offline: Cập nhật trạng thái qua kênh P2P.');
    }
  }

  async handleDelete(id) {
    // If P2P is connected, broadcast directly!
    if (this.peerManager.isConnected) {
      this.peerManager.broadcast('TASK_DELETED', { id });
    }

    this.model.removeTask(id);

    try {
      await this.api.deleteTask(id);
    } catch (err) {
      this.appendP2PLog('Server offline: Xóa task qua kênh P2P.');
    }
  }

  handleP2PMessage(payload) {
    if (!payload || !payload.type) return;

    if (payload.type === 'TASK_CREATED') {
      this.model.addTask(payload.task);
    } else if (payload.type === 'TASK_TOGGLED') {
      this.model.updateTask(payload.task);
    } else if (payload.type === 'TASK_DELETED') {
      this.model.removeTask(payload.task.id);
    }
  }

  handleP2PStatusChange(connected) {
    if (connected) {
      this.statusP2P.innerHTML = '🟢 P2P Direct Mesh Đã Kết Nối';
      this.statusP2P.className = 'badge badge-sage';
    } else {
      this.statusP2P.innerHTML = '⚪ P2P Chưa Kết Nối';
      this.statusP2P.className = 'badge badge-caramel';
    }
  }

  async switchStorage(mode) {
    try {
      const res = await this.api.setStorage(mode);
      this.currentStorage = mode;
      this.updateStorageBadge(mode);
      await this.loadTasks();
      alert(`Đã chuyển storage sang: ${mode.toUpperCase()}`);
    } catch (e) {
      alert(`Lỗi chuyển storage: ${e.message}`);
    }
  }

  async triggerMigration() {
    try {
      const res = await this.api.migrate();
      alert(res.message || 'Di chuyển dữ liệu hoàn tất!');
      await this.loadTasks();
    } catch (e) {
      alert(`Lỗi di chuyển dữ liệu: ${e.message}`);
    }
  }

  async refreshStorageStatus() {
    try {
      const config = await this.api.getConfig();
      this.currentStorage = config.currentStorage;
      this.updateStorageBadge(config.currentStorage);
    } catch (e) {}
  }

  updateStorageBadge(storage) {
    this.currentStorage = storage;
    this.statusStorage.textContent = `Storage: ${storage.toUpperCase()}`;
    if (storage === 'sqlite') {
      this.statusStorage.className = 'badge badge-sage';
    } else {
      this.statusStorage.className = 'badge badge-caramel';
    }
  }

  appendP2PLog(msg) {
    if (!this.p2pLogs) return;
    const time = new Date().toLocaleTimeString('vi-VN');
    const line = document.createElement('div');
    line.textContent = `[${time}] ${msg}`;
    this.p2pLogs.appendChild(line);
    this.p2pLogs.scrollTop = this.p2pLogs.scrollHeight;
  }
}

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppController();
  window.app.init();
});
