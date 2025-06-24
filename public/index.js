import '/socket.io/socket.io.js';

const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});
const socket = io();

// サウンドエフェクトの設定
const correctSound = new Audio('Quiz-Ding_Dong02-1(Fast).mp3');
const incorrectSound = new Audio('Quiz-Buzzer02-4(Multi).mp3');

// エラーハンドリング
correctSound.onerror = (e) => console.error('正解音の読み込みに失敗:', e);
incorrectSound.onerror = (e) => console.error('不正解音の読み込みに失敗:', e);

// エフェクト用のキャンバスを作成
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

// キャンバスのスタイル設定
canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.pointerEvents = 'none';
document.body.appendChild(canvas);

// キャンバスのサイズを設定
function updateCanvasSize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
updateCanvasSize();
window.addEventListener('resize', updateCanvasSize);

// 正解エフェクトの表示
function showCorrect() {
  try {
    correctSound.currentTime = 0;
    correctSound.play().catch(e => console.error('音声再生エラー:', e));
  } catch (e) {
    console.error('音声再生エラー:', e);
  }

  const duration = 300;
  const startTime = performance.now();
  
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
  try {
    incorrectSound.currentTime = 0;
    incorrectSound.play().catch(e => console.error('音声再生エラー:', e));
  } catch (e) {
    console.error('音声再生エラー:', e);
  }

  const duration = 300;
  const startTime = performance.now();
  
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

globalThis.onClickBtn = async () => {
  try {
    // メディアデバイスのサポートチェック
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

    const buttonElem = document.createElement('button');
    buttonElem.textContent = "ゲーム開始";
    buttonElem.classList.add("start-button");
    buttonElem.addEventListener('click', onGameStart);
    videoContainer.appendChild(buttonElem);

    pc.createOffer().then((desc) => {
      pc.setLocalDescription(desc);
      socket.emit('offer', desc);
    });
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

function onGameStart() {
  const targetPhrase = "せーの";
  const repeatCount = 3;
  let currentRepeat = 0;

  const playCountdown = (src) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });
  };

  const resultDisplay = document.createElement("div");
  resultDisplay.style.position = "absolute";
  resultDisplay.style.top = "10px";
  resultDisplay.style.left = "50%";
  resultDisplay.style.transform = "translateX(-50%)";
  resultDisplay.style.fontSize = "48px";
  resultDisplay.style.color = "white";
  resultDisplay.style.zIndex = 10;
  resultDisplay.style.display = "none";
  document.body.appendChild(resultDisplay);

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
      setTimeout(() => {
        mediaRecorder.stop();
      }, durationMs);
    });
  };

  const recognizeAudio = async (audioBlob) => {
    // ここは音声認識APIにPOSTするなどの処理に置き換えてください
    // 今はダミーで「せーの」が返ってくるようにしています
    return "せーの";
  };

  const loopGame = async () => {
    if (currentRepeat >= repeatCount) return;

    try {
      // メディアデバイスのサポートチェック
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('お使いのブラウザはマイクをサポートしていないか、HTTPSが必要です。');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await playCountdown('countdown.mp3');

      const recordedAudio = await recordAudio(stream);
      const recognizedText = await recognizeAudio(recordedAudio);

      if (recognizedText === targetPhrase) {
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
}
