import '/socket.io/socket.io.js';

const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});
const socket = io();

// Joinボタンの機能
globalThis.onClickBtn = async () => {
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

  // 「ゲーム開始」ボタンを
  const startButton = document.createElement('button');
  startButton.textContent = "ゲーム開始";
  startButton.classList.add("start-button");
  startButton.addEventListener('click', onGameStart);
  videoContainer.appendChild(startButton);

  pc.createOffer().then((desc) => {
    pc.setLocalDescription(desc);
    socket.emit('offer', desc);
  });
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

let gameStarted;

// ゲーム開始ボタンを押したら実行
const onGameStart = () => {
  gameStarted = true;
  const targetPhrase = "せーの";
  const repeatCount = 3;
  let currentRepeat = 0;

  const endButton = document.querySelector('.start-button');
  if (endButton) {
    endButton.textContent = "ゲーム終了";
    endButton.classList.remove("start-button");
    endButton.classList.add("end-button");
    endButton.addEventListener('click', onGameEnd);
  }

  // 三秒カウントダウンする音声を流す
  const playCountdown = (src) => {
    return new Promise((resolve, reject) => {
      const audio = new Audio(src);
      audio.onended = resolve;
      audio.onerror = reject;
      audio.play();
    });
  };

  // 音声を3秒間収録
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

  // Web Speech APIから、音声が一致しているかどうかを論理値を返される
  const matchJudge = async (audioBlob) => {
    // ここは音声認識APIにPOSTするなどの処理に置き換えてください
    // 今はダミーで「せーの」が返ってくるようにしています
    return "せーの";
  };

  // 結果の⭕️❌のhtml要素を作る
  // スタイルをCSSファイルに書く
  const resultDisplay = document.createElement("div");
  resultDisplay.style.position = "absolute";
  resultDisplay.style.top = "10px";
  resultDisplay.style.left = "50%";
  resultDisplay.style.transform = "translateX(-50%)";
  resultDisplay.style.fontSize = "48px";
  resultDisplay.style.color = "white";
  resultDisplay.style.zIndex = 10;
  resultDisplay.classList.add('result-display');
  document.body.appendChild(resultDisplay);

  // 一回のゲームでの動作
  const loopGame = async () => {
    if (currentRepeat >= repeatCount || !gameStarted) return;


    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await playCountdown('countdown.mp3'); // ✅ カウントダウン音声が終わるのを待つ

      const recordedAudio = await recordAudio(stream);
      const ifMatch = await matchJudge(recordedAudio);

      if (ifMatch) {
        resultDisplay.textContent = "○";
        resultDisplay.style.color = "lime";
      } else {
        resultDisplay.textContent = "×";
        resultDisplay.style.color = "red";
      }

      currentRepeat++;
      setTimeout(loopGame, 2000); // 2秒後に次のループ
    } catch (err) {
      console.error("音声再生エラー:", err);
    }
  };

  loopGame();
}

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
 * 今の課題
 * 丸と罰を消す
 * お互いにゲーム開始ボタンを押してから、ゲームを開始
 * ゲーム終了ボタンに変える
 */