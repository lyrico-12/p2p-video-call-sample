import '/socket.io/socket.io.js';

const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});
const socket = io();

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

  const buttonElem = document.createElement('button');
  buttonElem.textContent = "ゲーム開始";
  buttonElem.classList.add("start-button");
  buttonElem.addEventListener('click', onGameStart);
  videoContainer.appendChild(buttonElem);

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
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      await playCountdown('countdown.mp3'); // ✅ カウントダウン音声が終わるのを待つ

      const recordedAudio = await recordAudio(stream);
      const recognizedText = await recognizeAudio(recordedAudio);

      if (recognizedText === targetPhrase) {
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
