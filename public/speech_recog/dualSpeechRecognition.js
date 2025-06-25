class DualSpeechRecognition {
  constructor(socket) {
    this.socket = socket;
    this.localRecognition = new VoiceRecognition();
    this.isRecognitionActive = false;
    this.setupSocketEvents();
    this.setupLocalRecognition();
  }

  setupSocketEvents() {
    // 相手の音声認識結果を受信
    this.socket.on('remote-speech-result', (data) => {
      this.displayRemoteResult(data.transcript, data.playerId);
    });

    // 相手が音声認識を開始したことを受信 - 自動的に自分も開始
    this.socket.on('remote-start-recognition', () => {
      console.log('相手が音声認識を開始しました - 自動的に参加します');
      this.showRemoteStatus('相手が音声認識中...');
      this.autoStartRecognition(); // 自動的に音声認識を開始
    });

    // 相手が音声認識を停止したことを受信
    this.socket.on('remote-stop-recognition', () => {
      console.log('相手が音声認識を停止しました');
      this.hideRemoteStatus();
    });
  }

  setupLocalRecognition() {
    this.localRecognition.onFinalResult = (transcript) => {
      // ローカル表示
      this.displayLocalResult(transcript);
      
      // 相手に送信
      this.socket.emit('local-speech-result', {
        transcript: transcript,
        playerId: this.socket.id,
        timestamp: Date.now()
      });
    };

    // 音声認識終了時の処理
    this.localRecognition.recognition.onend = () => {
      console.log('ローカル音声認識終了');
      this.isRecognitionActive = false;
      this.socket.emit('local-stop-recognition');
    };
  }

  startRecognition() {
    if (this.isRecognitionActive) {
      console.log('既に音声認識が実行中です');
      return;
    }

    // 音声認識結果エリアを表示
    const speechResults = document.getElementById('speechResults');
    if (speechResults) {
      speechResults.style.display = 'block';
    }

    this.isRecognitionActive = true;
    this.localRecognition.start();
    
    // 相手にも音声認識開始を通知
    this.socket.emit('local-start-recognition');
    console.log('デュアル音声認識を開始しました');
  }

  // 相手が開始した時に自動的に開始する
  autoStartRecognition() {
    if (this.isRecognitionActive) {
      console.log('既に音声認識が実行中です');
      return;
    }

    // 音声認識結果エリアを表示
    const speechResults = document.getElementById('speechResults');
    if (speechResults) {
      speechResults.style.display = 'block';
    }

    this.isRecognitionActive = true;
    this.localRecognition.start();
    console.log('自動でデュアル音声認識に参加しました');
  }

  stopRecognition() {
    if (!this.isRecognitionActive) {
      return;
    }

    this.localRecognition.stop();
    this.isRecognitionActive = false;
    
    // 相手に停止を通知
    this.socket.emit('local-stop-recognition');
    console.log('デュアル音声認識を停止しました');
  }

  displayLocalResult(transcript) {
    const localDiv = document.getElementById('localResults');
    if (localDiv) {
      const timestamp = new Date().toLocaleTimeString();
      localDiv.innerHTML += `<p style="color: blue; margin: 5px 0;">[${timestamp}] あなた: ${transcript}</p>`;
      localDiv.scrollTop = localDiv.scrollHeight;
    }
  }

  displayRemoteResult(transcript, playerId) {
    console.log('displayRemoteResult called with:', transcript, playerId);
    const remoteDiv = document.getElementById('remoteResults');
    console.log('remoteDiv element:', remoteDiv);
    
    if (remoteDiv) {
      const timestamp = new Date().toLocaleTimeString();
      const message = `<p style="color: red; margin: 5px 0;">[${timestamp}] 相手: ${transcript}</p>`;
      console.log('Adding message:', message);
      remoteDiv.innerHTML += message;
      remoteDiv.scrollTop = remoteDiv.scrollHeight;
      console.log('remoteDiv content after update:', remoteDiv.innerHTML);
    } else {
      console.error('remoteResults element not found!');
    }
  }

  showRemoteStatus(message) {
    const statusDiv = document.getElementById('remoteStatus');
    if (statusDiv) {
      statusDiv.textContent = message;
      statusDiv.style.display = 'block';
    }
  }

  hideRemoteStatus() {
    const statusDiv = document.getElementById('remoteStatus');
    if (statusDiv) {
      statusDiv.style.display = 'none';
    }
  }

  clearResults() {
    const localDiv = document.getElementById('localResults');
    const remoteDiv = document.getElementById('remoteResults');
    
    if (localDiv) localDiv.innerHTML = '';
    if (remoteDiv) remoteDiv.innerHTML = '';
  }
}

// グローバル変数
let dualSpeechRecognition;

// ボタンから呼び出される関数
function startDualRecognition() {
  if (dualSpeechRecognition) {
    dualSpeechRecognition.startRecognition();
  }
}

function stopDualRecognition() {
  if (dualSpeechRecognition) {
    dualSpeechRecognition.stopRecognition();
  }
}

function clearSpeechResults() {
  if (dualSpeechRecognition) {
    dualSpeechRecognition.clearResults();
  }
}
