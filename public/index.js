import '/socket.io/socket.io.js';

// ブラウザ側でWebRTC通信を管理するインスタンス
const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});

// ソケットIOのクライアント
const socket = io();

// Joinボタンの機能
globalThis.onClickBtn = async () => {
  try {
    // メディアデバイスのサポートチェック
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('お使いのブラウザはカメラ・マイクをサポートしていないか、HTTPSが必要です。');
    }
    // ブラウザで自分の映像と音声を取得
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    // 映像と音声をそれぞれWebRTCの通信対象に含める
    for (const track of stream.getTracks()) {
      pc.addTrack(track);
    }
    // 自分の映像をhtml要素に埋め込み
    const videoContainer = document.querySelector('.video-container');
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.srcObject = stream;
    video.play();
    videoContainer.appendChild(video);

    // 「ゲーム開始」ボタンを追加
    const startButton = document.createElement('button');
    startButton.textContent = "ゲーム開始";
    startButton.classList.add("start-button");
    startButton.disabled = true;
    startButton.addEventListener('click', onGameStart);
    videoContainer.appendChild(startButton);

    // Joinを押したら、'offer'イベントを送信
    pc.createOffer().then((desc) => {
      pc.setLocalDescription(desc);
      socket.emit('offer', desc);
    });

    socket.emit('ready');
  } catch (error) {
    console.error('カメラ・マイクの取得に失敗しました:', error);
    alert('カメラ・マイクの取得に失敗しました。\n' + 
          'HTTPSで接続されているか、カメラ・マイクの使用を許可しているか確認してください。\n' +
          'エラー: ' + error.message);
  }
};

// 'track'は相手のaddTrackで追加されたトラックが送られてきた時のイベント
pc.addEventListener('track', ({ track }) => {
  // 映像トラックがおくらえてきた時に、video要素を埋め込み
  if (track.kind === 'video') {
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.srcObject = new MediaStream([track]);
    video.play();
    document.body.appendChild(video);
  }
  // 音声トラックが送られてきた時に、audio要素を作成（画面上には表示なし）
  if (track.kind === 'audio') {
    const audio = document.createElement('audio');
    audio.srcObject = new MediaStream([track]);
    audio.play();
  }
});

// 接続経路となるIPアドレスとポートが見つかるたびに'icecandidate'イベントが発火
// 複数の候補がある場合は、WebRTCが最適な経路を見つける
pc.addEventListener('icecandidate', ({ candidate }) => {
  if (candidate) {
    // SDPやネットワーク候補をシグナリングサーバに渡す
    socket.emit('ice', candidate);
  }
});

// 相手クライアントからイベントを受信する
socket.on('offer', (desc) => { // 相手のSDPを受信し('offer'イベント)相手として設定、自分のSDPを設定し相手に送信('answer'イベント)
  pc.setRemoteDescription(desc);
  pc.createAnswer().then((desc) => {
    pc.setLocalDescription(desc);
    socket.emit('answer', desc);
  });
})
.on('answer', (desc) => pc.setRemoteDescription(desc)) // こちらがオファーを出した側である場合、'answer'が返ってくるので（上のsocket.emit('answer'...)で'answer'イベントが返ってくるということ）
.on('ice', (candidate) => pc.addIceCandidate(candidate)); // 'ice'イベントを受信したら、通信経路として設定

let gameStarted = false;

// 2人が通話に参加している時
socket.on('enable-game', () => {
  const startButton = document.querySelector('.start-button');
  if (startButton) {
    startButton.disabled = false;
  }
});

// 自分しかJoinしていない時・相手がdisconnectした時
socket.on('unable-game', () => {
  gameStarted = false;
  const startButton = document.querySelector('.start-button');
  if (startButton) {
    // 相手がdisconnectした時
    if (startButton.textContent == "ゲーム終了") {
      startButton.textContent = "ゲーム開始";
      startButton.classList.remove("end-button");
      startButton.classList.add("start-button");
      startButton.removeEventListener("click", onGameEnd);
      startButton.addEventListener("click", onGameStart);
    }
  startButton.disabled = true;
  }
});

socket.on('let-start-game', () => {
  gameStarted = true;
  runGameLoop();
});

socket.on('let-end-game', () => {
  gameStarted = false;
  resetGameUI();
})

// 正解エフェクトの表示
function showCorrect() {
  const correctSound = new Audio('Quiz-Ding_Dong02-1(Fast).mp3');
  correctSound.onerror = (e) => console.error('正解音の読み込みに失敗:', e);
  try {
    correctSound.currentTime = 0;
    correctSound.play().catch(e => console.error('音声再生エラー:', e));
  } catch (e) {
    console.error('音声再生エラー:', e);
  }

  const duration = 300;
  const startTime = performance.now();
  const canvas = document.querySelector('.result-canvas');
  const context = canvas.getContext('2d');
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // 丸を描画
    context.beginPath();
    context.strokeStyle = '#2ecc71';
    context.lineWidth = 15;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.2;
    const currentRadius = Math.max(0, maxRadius * progress);
    
    context.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    context.stroke();
    
    // 輝く効果
    context.shadowBlur = 20;
    context.shadowColor = '#2ecc71';
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }, 2000);
    }
  }
  
  requestAnimationFrame(animate);
}

// 不正解エフェクトの表示
function showIncorrect() {
  const incorrectSound = new Audio('Quiz-Buzzer02-4(Multi).mp3');
  incorrectSound.onerror = (e) => console.error('不正解音の読み込みに失敗:', e);
  try {
    incorrectSound.currentTime = 0;
    incorrectSound.play().catch(e => console.error('音声再生エラー:', e));
  } catch (e) {
    console.error('音声再生エラー:', e);
  }

  const duration = 300;
  const startTime = performance.now();
  const canvas = document.querySelector('.result-canvas');
  const context = canvas.getContext('2d');
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    
    context.clearRect(0, 0, canvas.width, canvas.height);
    
    // バツを描画
    context.beginPath();
    context.strokeStyle = '#e74c3c';
    context.lineWidth = 15;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxSize = Math.min(canvas.width, canvas.height) * 0.2;
    const currentSize = Math.max(0, maxSize * progress);
    
    // バツの線を描画
    context.moveTo(centerX - currentSize, centerY - currentSize);
    context.lineTo(centerX + currentSize, centerY + currentSize);
    context.moveTo(centerX + currentSize, centerY - currentSize);
    context.lineTo(centerX - currentSize, centerY + currentSize);
    
    // 輝く効果
    context.shadowBlur = 20;
    context.shadowColor = '#e74c3c';
    context.stroke();
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => {
        context.clearRect(0, 0, canvas.width, canvas.height);
      }, 2000);
    }
  }
  
  requestAnimationFrame(animate);
}

// ゲーム開始ボタンを押したら実行
const onGameStart = () => {
  // ゲーム終了ボタンにする
  const startButton = document.querySelector('.start-button');
  if (startButton) {
    startButton.disabled = true;
    startButton.textContent = "ゲーム終了";
    startButton.classList.remove("start-button");
    startButton.classList.add("end-button");
    startButton.removeEventListener('click', onGameStart);
    startButton.addEventListener('click', onGameEnd);
    startButton.disabled = false;
  }

  socket.emit('start-game');

  // 結果表示キャンバスを作成
  const canvas = document.createElement('canvas');
  canvas.classList.add("result-canvas");

  canvas.style.position = 'fixed';
  canvas.style.top = '0';
  canvas.style.left = '0';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  function updateCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  updateCanvasSize();
  window.addEventListener('resize', updateCanvasSize);
};

// ゲーム内容
const runGameLoop = () => {
  const repeatCount = 10;
  let currentRepeat = 0;

  const playCountdown = (src) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });
  };

  const recordAudio = async (stream, durationMs = 3000) => {
    const mediaRecorder = new MediaRecorder(stream);
    const chunks = [];
    return new Promise((resolve) => {
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        resolve(blob);
      };
      mediaRecorder.start();
      setTimeout(() => mediaRecorder.stop(), durationMs);
    });
  };

  // ここで一致or不一致の論理値を受けとる
  const matchJudge = async () => {
    return false;
  };

  const loopGame = async () => {
    if (currentRepeat >= repeatCount || !gameStarted) {
      gameStarted = false;
      socket.emit('end-game');
      return;
    }

    try {
      // メディアデバイスのサポートチェック
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('お使いのブラウザはマイクをサポートしていないか、HTTPSが必要です。');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await playCountdown('countdown.mp3');

      const recordedAudio = await recordAudio(stream);
      const ifMatch = await matchJudge(recordedAudio);

      if (ifMatch) {
        showCorrect();
      } else {
        showIncorrect();
      }

      currentRepeat++;
      setTimeout(loopGame, 2000);
    } catch (err) {
      console.error("エラーが発生しました:", err);
      alert('マイクの取得に失敗しました。\n' +
            'HTTPSで接続されているか、マイクの使用を許可しているか確認してください。\n' +
            'エラー: ' + err.message);
    }
  };
  loopGame();
};

const onGameEnd = () => {
  gameStarted = false;
  socket.emit('end-game'); // 相手にも終了を通知
  resetGameUI();
};

function resetGameUI() {
  const endButton = document.querySelector('.end-button');
  if (endButton) {
    endButton.textContent = "ゲーム開始";
    endButton.classList.remove("end-button");
    endButton.classList.add("start-button");
    endButton.removeEventListener("click", onGameEnd);
    endButton.addEventListener("click", onGameStart);
  }

  const resultCanvas = document.querySelector(".result-canvas");
  if (resultCanvas) {
    resultCanvas.remove();
  }
}

