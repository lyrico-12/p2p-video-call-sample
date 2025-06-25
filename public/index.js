import '/socket.io/socket.io.js';

// ブラウザ側でWebRTC通信を管理するインスタンス
const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});

// ソケットIOのクライアント
const socket = io();

// Joinボタンの機能
globalThis.onClickBtn = async () => {
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
  startButton.addEventListener('click', onGameStart);
  videoContainer.appendChild(startButton);

  // Joinを押したら、'offer'イベントを送信
  pc.createOffer().then((desc) => {
    pc.setLocalDescription(desc);
    socket.emit('offer', desc);
  });

  socket.emit('ready');
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

let gameStarted;

// 2人がゲーム開始ボタンを押した時
socket.on('enable-game', () => {
  const startButton = document.querySelector('.start-button');
  if (startButton) {
    startButton.disabled = false;
  }
});

// 2人がゲーム開始ボタンを押していない時
socket.on('unable-game', () => {
  const startButton = document.querySelector('.start-button');
  if (startButton) {
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

  // 結果を表示する場所だけ作る
  const resultDisplay = document.createElement("div");
  resultDisplay.classList.add('result-display');
  document.body.appendChild(resultDisplay);
};

const runGameLoop = () => {
  const repeatCount = 10;
  let currentRepeat = 0;

  const resultDisplay = document.querySelector('.result-display');

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
    return true;
  };

  const loopGame = async () => {
    if (currentRepeat >= repeatCount || !gameStarted) {
      gameStarted = false;
      socket.emit('end-game');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await playCountdown('countdown.mp3');
      const recordedAudio = await recordAudio(stream);
      const ifMatch = await matchJudge(recordedAudio);

      resultDisplay.textContent = ifMatch ? "○" : "×";
      resultDisplay.style.color = ifMatch ? "lime" : "red";

      currentRepeat++;
      setTimeout(loopGame, 2000);
    } catch (err) {
      console.error("音声再生エラー:", err);
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

  const resultDisplay = document.querySelector(".result-display");
  if (resultDisplay) {
    resultDisplay.remove();
  }
  console.log("reset ui");
}

