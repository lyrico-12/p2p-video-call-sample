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

  // オファーを送信
  pc.createOffer().then((desc) => {
    pc.setLocalDescription(desc);
    socket.emit('offer', desc);
  });
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
socket
// 相手のSDPを受信し('offer'イベント)相手として設定、自分のSDPを設定し相手に送信('answer'イベント)
.on('offer', (desc) => {
  pc.setRemoteDescription(desc);
  pc.createAnswer().then((desc) => {
    pc.setLocalDescription(desc);
    socket.emit('answer', desc);
  });
})
// こちらがオファーを出した側である場合、'answer'が返ってくるので（上のsocket.emit('answer'...)で'answer'イベントが返ってくるということ）
.on('answer', (desc) => pc.setRemoteDescription(desc))
// 'ice'イベントを受信したら、通信経路として設定
.on('ice', (candidate) => pc.addIceCandidate(candidate));

// シグナリングサーバからゲーム開始イベントを受信
socket.on('start-game', () => {
  gameStarted = true;
  canStartGame = true;
  runGameLoop();
});

let gameStarted;
let isReady = false;
let canStartGame = false;

// ゲーム開始ボタンを押したら実行
const onGameStart = () => {
  const startButton = document.querySelector('.start-button');
  if (startButton) {
    startButton.textContent = "ゲーム終了";
    startButton.classList.remove("start-button");
    startButton.classList.add("end-button");
    startButton.removeEventListener('click', onGameStart);
    startButton.addEventListener('click', onGameEnd);
  }

  // 状態をセットし、相手に通知
  isReady = true;
  socket.emit('ready');

  // スタイルだけ表示
  const resultDisplay = document.createElement("div");
  resultDisplay.classList.add('result-display');
  document.body.appendChild(resultDisplay);
};

const runGameLoop = () => {
  const targetPhrase = "せーの";
  const repeatCount = 3;
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

  const matchJudge = async (audioBlob) => {
    return "せーの";
  };

  const loopGame = async () => {
    if (currentRepeat >= repeatCount || !gameStarted) return;

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

  // ゲーム終了ボタンをゲーム開始ボタンに戻す
  const endButton = document.querySelector('.end-button');
  if (endButton) {
    endButton.textContent = "ゲーム開始";
    endButton.classList.remove("end-button");
    endButton.classList.add("start-button");

    // 以前追加した onGameEnd のリスナーを削除しておく（再登録を防ぐ）
    endButton.removeEventListener('click', onGameEnd);

    // 再び onGameStart を登録（必要に応じて）
    endButton.addEventListener('click', onGameStart);
  }

  // ⭕️❌ の表示を消す（必要であれば）
  const resultDisplay = document.querySelector('result-display');
  if (resultDisplay) {
    resultDisplay.remove();
  }
}

/**
 * 丸と罰を消す
 * お互いにゲーム開始ボタンを押してから、ゲームを開
 */