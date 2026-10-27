/**
 * P2PPeerManager (V4: Peer-to-Peer Collaboration over WebRTC DataChannel)
 * Connects two clients directly without routing data through a central server.
 * Enables collaboration even when the backend server is terminated.
 */
class P2PPeerManager {
  constructor(peerId, onMessageCallback, onStatusChangeCallback, onLogCallback) {
    this.peerId = peerId || 'Peer_' + Math.random().toString(36).substring(2, 6).toUpperCase();
    this.onMessage = onMessageCallback;
    this.onStatusChange = onStatusChangeCallback;
    this.onLog = onLogCallback || console.log;
    
    this.peerConnection = null;
    this.dataChannel = null;
    this.isConnected = false;
    this.signalingInterval = null;

    // WebRTC Configuration (STUN for NAT, empty for local LAN/loopback)
    this.rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };
  }

  log(msg) {
    if (this.onLog) this.onLog(`[${this.peerId}] ${msg}`);
  }

  initPeerConnection() {
    if (this.peerConnection) {
      try { this.peerConnection.close(); } catch {}
    }

    this.peerConnection = new RTCPeerConnection(this.rtcConfig);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.log(`Tạo ICE candidate: ${event.candidate.candidate.substring(0, 30)}...`);
      }
    };

    this.peerConnection.onconnectionstatechange = () => {
      const state = this.peerConnection.connectionState;
      this.log(`Trạng thái kết nối RTCPeerConnection: ${state}`);
      if (state === 'disconnected' || state === 'failed' || state === 'closed') {
        this.isConnected = false;
        if (this.onStatusChange) this.onStatusChange(false);
      }
    };

    // When remote peer creates DataChannel (Answerer side)
    this.peerConnection.ondatachannel = (event) => {
      this.log('Nhận DataChannel từ phía đối tác (Remote Peer)');
      this.setupDataChannel(event.channel);
    };
  }

  setupDataChannel(channel) {
    this.dataChannel = channel;

    this.dataChannel.onopen = () => {
      this.log('🎉 Kênh WebRTC DataChannel đã MỞ! Hai peer đã kết nối trực tiếp.');
      this.isConnected = true;
      if (this.onStatusChange) this.onStatusChange(true);
    };

    this.dataChannel.onclose = () => {
      this.log('Kênh WebRTC DataChannel đã đóng.');
      this.isConnected = false;
      if (this.onStatusChange) this.onStatusChange(false);
    };

    this.dataChannel.onerror = (err) => {
      this.log(`Lỗi DataChannel: ${err.message || err}`);
    };

    this.dataChannel.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        this.log(`📩 Nhận gói tin P2P trực tiếp: [${payload.type}]`);
        if (this.onMessage) this.onMessage(payload);
      } catch (err) {
        this.log(`Lỗi phân giải gói tin P2P: ${err.message}`);
      }
    };
  }

  // --- Automatic Signaling via Temporary Server Bus (Before Server Shutdown) ---
  async startAutoSignaling(targetPeerId) {
    this.initPeerConnection();
    
    // As Caller / Initiator
    this.dataChannel = this.peerConnection.createDataChannel('tasksSyncChannel');
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Send offer through server bus
    await this.sendSignalMessage({
      type: 'OFFER',
      sdp: this.peerConnection.localDescription,
      from: this.peerId,
      target: targetPeerId
    });
    this.log(`Đã gửi SDP Offer đến ${targetPeerId || 'bất kỳ peer nào'}`);

    this.pollForSignalingAnswers();
  }

  async listenForSignals() {
    this.initPeerConnection();
    this.log('Đang chờ tín hiệu kết nối từ peer khác qua bus signaling...');
    
    if (this.signalingInterval) clearInterval(this.signalingInterval);
    this.signalingInterval = setInterval(async () => {
      if (this.isConnected) {
        clearInterval(this.signalingInterval);
        return;
      }
      try {
        const res = await fetch(`/api/signaling/receive?peerId=${this.peerId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.messages && json.messages.length > 0) {
          for (const msg of json.messages) {
            if (msg.from !== this.peerId && msg.data.type === 'OFFER' && !this.peerConnection.remoteDescription) {
              this.log(`Nhận SDP Offer từ ${msg.from}, đang tạo SDP Answer...`);
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
              const answer = await this.peerConnection.createAnswer();
              await this.peerConnection.setLocalDescription(answer);

              await this.sendSignalMessage({
                type: 'ANSWER',
                sdp: this.peerConnection.localDescription,
                from: this.peerId,
                target: msg.from
              });
              this.log(`Đã gửi SDP Answer lại cho ${msg.from}`);
            }
          }
        }
      } catch (e) {
        // Server might be stopped, ignore
      }
    }, 1500);
  }

  async pollForSignalingAnswers() {
    if (this.signalingInterval) clearInterval(this.signalingInterval);
    this.signalingInterval = setInterval(async () => {
      if (this.isConnected) {
        clearInterval(this.signalingInterval);
        return;
      }
      try {
        const res = await fetch(`/api/signaling/receive?peerId=${this.peerId}`);
        if (!res.ok) return;
        const json = await res.json();
        if (json.messages) {
          for (const msg of json.messages) {
            if (msg.from !== this.peerId && msg.data.type === 'ANSWER' && !this.peerConnection.remoteDescription) {
              this.log(`Nhận SDP Answer từ ${msg.from}, thiết lập Remote Description...`);
              await this.peerConnection.setRemoteDescription(new RTCSessionDescription(msg.data.sdp));
              clearInterval(this.signalingInterval);
              break;
            }
          }
        }
      } catch (e) {}
    }, 1500);
  }

  async sendSignalMessage(data) {
    try {
      await fetch('/api/signaling/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          peerId: this.peerId,
          target: data.target,
          data
        })
      });
    } catch (e) {
      this.log('Không thể gửi tín hiệu qua server (server có thể đã tắt)');
    }
  }

  // --- Manual SDP Offer/Answer Fallback (When Server is Already Offline) ---
  async generateManualOffer() {
    this.initPeerConnection();
    this.dataChannel = this.peerConnection.createDataChannel('tasksSyncChannel');
    this.setupDataChannel(this.dataChannel);

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);

    // Wait for ICE candidates gathering
    await new Promise(resolve => {
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (this.peerConnection.iceGatheringState === 'complete') {
            this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 1000); // Max wait 1s
      }
    });

    return JSON.stringify(this.peerConnection.localDescription);
  }

  async applyManualOfferAndCreateAnswer(offerJsonStr) {
    this.initPeerConnection();
    const offer = JSON.parse(offerJsonStr);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);

    await new Promise(resolve => {
      if (this.peerConnection.iceGatheringState === 'complete') {
        resolve();
      } else {
        const checkState = () => {
          if (this.peerConnection.iceGatheringState === 'complete') {
            this.peerConnection.removeEventListener('icegatheringstatechange', checkState);
            resolve();
          }
        };
        this.peerConnection.addEventListener('icegatheringstatechange', checkState);
        setTimeout(resolve, 1000);
      }
    });

    return JSON.stringify(this.peerConnection.localDescription);
  }

  async applyManualAnswer(answerJsonStr) {
    const answer = JSON.parse(answerJsonStr);
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    this.log('Đã áp dụng SDP Answer thành công!');
  }

  // --- Direct P2P Broadcasting ---
  broadcast(actionType, taskData) {
    if (!this.dataChannel || this.dataChannel.readyState !== 'open') {
      this.log(`⚠️ Không thể gửi P2P: Kênh chưa mở.`);
      return false;
    }
    const message = JSON.stringify({
      type: actionType,
      sender: this.peerId,
      timestamp: Date.now(),
      task: taskData
    });
    this.dataChannel.send(message);
    this.log(`📤 Đã gửi P2P trực tiếp: [${actionType}] -> "${taskData.title || taskData.id}"`);
    return true;
  }
}

window.P2PPeerManager = P2PPeerManager;
