import '/socket.io/socket.io.js';

const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});

const socket = io();

// Joinボタンの機能
globalThis.onClickBtn = async () => {
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('お使いのブラウザはカメラ・マイクをサポートしていないか、HTTPSが必要です。');
    }
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    for (const track of stream.getTracks()) {
      pc.addTrack(track);
    }

    const videoContainer = document.querySelector('.video-container');
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.srcObject = stream;
    video.play();
    videoContainer.appendChild(video);

    const startButton = document.createElement('button');
    startButton.textContent = "ゲーム開始";
    startButton.classList.add("start-button");
    startButton.disabled = true;
    startButton.addEventListener('click', onGameStart);
    videoContainer.appendChild(startButton);

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

pc.addEventListener('track', ({ track }) => {
  if (track.kind === 'video') {
    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = true;
    video.style.width = '100%';
    video.srcObject = new MediaStream([track]);
    video.play();
    document.body.appendChild(video);
  }
  if (track.kind === 'audio') {
    const audio = document.createElement('audio');
    audio.srcObject = new MediaStream([track]);
    audio.play();
  }
});

pc.addEventListener('icecandidate', ({ candidate }) => {
  if (candidate) {
    socket.emit('ice', candidate);
  }
});

socket
  .on('offer', (desc) => {
    pc.setRemoteDescription(desc);
    pc.createAnswer().then((desc) => {
      pc.setLocalDescription(desc);
      socket.emit('answer', desc);
    });
  })
  .on('answer', (desc) => pc.setRemoteDescription(desc))
  .on('ice', (candidate) => pc.addIceCandidate(candidate));

let gameStarted = false;

socket.on('enable-game', () => {
  const startButton = document.querySelector('.start-button');
  if (startButton) startButton.disabled = false;
});

socket.on('unable-game', () => {
  const startButton = document.querySelector('.start-button');
  if (startButton) startButton.disabled = true;
});

socket.on('let-start-game', () => {
  gameStarted = true;
  runGameLoop();
});

socket.on('let-end-game', () => {
  gameStarted = false;
  resetGameUI();
});

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
    context.beginPath();
    context.strokeStyle = '#2ecc71';
    context.lineWidth = 15;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxRadius = Math.min(canvas.width, canvas.height) * 0.2;
    const currentRadius = Math.max(0, maxRadius * progress);
    context.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
    context.stroke();
    context.shadowBlur = 20;
    context.shadowColor = '#2ecc71';
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => context.clearRect(0, 0, canvas.width, canvas.height), 2000);
    }
  }

  requestAnimationFrame(animate);
}

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
    context.beginPath();
    context.strokeStyle = '#e74c3c';
    context.lineWidth = 15;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const maxSize = Math.min(canvas.width, canvas.height) * 0.2;
    const currentSize = Math.max(0, maxSize * progress);
    context.moveTo(centerX - currentSize, centerY - currentSize);
    context.lineTo(centerX + currentSize, centerY + currentSize);
    context.moveTo(centerX + currentSize, centerY - currentSize);
    context.lineTo(centerX - currentSize, centerY + currentSize);
    context.shadowBlur = 20;
    context.shadowColor = '#e74c3c';
    context.stroke();
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      setTimeout(() => context.clearRect(0, 0, canvas.width, canvas.height), 2000);
    }
  }

  requestAnimationFrame(animate);
}

const onGameStart = () => {
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
  
  // 音声認識を開始
  if (dualSpeechRecognition) {
    dualSpeechRecognition.startRecognition();
  }
  
  socket.emit('start-game');

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

const runGameLoop = () => {
  const playCountdown = (src) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });
  };

  const matchJudge = async () => {
    // 音声認識結果を比較
    if (typeof compareSpeechResults === 'function') {
      const isMatch = compareSpeechResults();
      const results = getLatestSpeechResults();
      
      console.log('matchJudge - 音声認識結果比較:');
      console.log('あなた:', results.local);
      console.log('相手:', results.remote);
      console.log('一致判定:', isMatch);
      
      return isMatch;
    } else {
      console.warn('compareSpeechResults関数が見つかりません');
      return false;
    }
  };

  const runSingleRound = async () => {
    if (!gameStarted) {
      gameStarted = false;
      socket.emit('end-game');
      return;
    }
    
    try {
      console.log('ゲーム開始 - 1ラウンド');
      
      // 音声認識結果をクリア
      if (dualSpeechRecognition) {
        dualSpeechRecognition.latestLocalTranscript = '';
        dualSpeechRecognition.latestRemoteTranscript = '';
      }
      
      // カウントダウン音を再生
      await playCountdown('countdown.mp3');
      
      // 音声認識が完了するまで待機（最大5秒）
      const waitForSpeechResults = () => {
        return new Promise((resolve) => {
          let waitTime = 0;
          const maxWaitTime = 5000; // 5秒間待機
          const checkInterval = 100; // 100msごとにチェック
          
          const checkResults = () => {
            const results = getLatestSpeechResults();
            if (results.local && results.remote) {
              console.log('両方の音声認識結果が揃いました');
              resolve();
            } else if (waitTime >= maxWaitTime) {
              console.log('タイムアウト: 音声認識結果が揃いませんでした');
              resolve();
            } else {
              waitTime += checkInterval;
              setTimeout(checkResults, checkInterval);
            }
          };
          
          checkResults();
        });
      };
      
      await waitForSpeechResults();
      
      // 判定を実行
      const ifMatch = await matchJudge();
      console.log('判定結果:', ifMatch);
      
      if (ifMatch) {
        showCorrect();
      } else {
        showIncorrect();
      }
      
      // ゲーム終了
      setTimeout(() => {
        gameStarted = false;
        socket.emit('end-game');
      }, 3000); // 3秒後にゲーム終了
      
    } catch (err) {
      console.error("エラーが発生しました:", err);
      alert('ゲーム実行中にエラーが発生しました。\n' +
        'エラー: ' + err.message);
      gameStarted = false;
      socket.emit('end-game');
    }
  };

  runSingleRound();
};

const onGameEnd = () => {
  gameStarted = false;
  
  // 音声認識を停止
  if (dualSpeechRecognition) {
    dualSpeechRecognition.stopRecognition();
  }
  
  socket.emit('end-game');
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

let dualSpeechRecognition;
document.addEventListener('DOMContentLoaded', () => {
  dualSpeechRecognition = new DualSpeechRecognition(socket);
});

globalThis.startDualRecognition = () => {
  if (dualSpeechRecognition) {
    dualSpeechRecognition.startRecognition();
  }
};

globalThis.stopDualRecognition = () => {
  if (dualSpeechRecognition) {
    dualSpeechRecognition.stopRecognition();
  }
};

globalThis.clearSpeechResults = () => {
  if (dualSpeechRecognition) {
    dualSpeechRecognition.clearResults();
  }
};
