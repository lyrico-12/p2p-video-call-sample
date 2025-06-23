import '/socket.io/socket.io.js';

const pc = new RTCPeerConnection({
  iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }],
});
const socket = io();

socket.on('voice', (audioPath) => {
  const audio = new Audio(audioPath);
  audio.play();
});


globalThis.onClickBtn = async () => {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: true,
  });
  for (const track of stream.getTracks()) {
    pc.addTrack(track);
  }
  const video = document.createElement('video');
  video.playsInline = true;
  video.muted = true;
  video.style.width = '100%';
  video.srcObject = stream;
  video.play();
  document.body.appendChild(video);

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

//追加
const recognition = new webkitSpeechRecognition(); // Chrome用
recognition.lang = 'ja-JP';
recognition.continuous = false;

recognition.onresult = function (event) {
  const text = event.results[0][0].transcript;
  console.log('認識結果:', text);
  socket.emit('transcript', text); // サーバへ送信
};

globalThis.startRecognition = () => {
  recognition.start();
};
const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.lang = 'ja-JP';     // 日本語
recognition.interimResults = false;
recognition.continuous = false;

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  console.log('認識結果:', transcript);
  document.getElementById('result').textContent = transcript;
};

recognition.onerror = (event) => {
  console.error('音声認識エラー:', event.error);
};

function startRecognition() {
  recognition.start();
}
