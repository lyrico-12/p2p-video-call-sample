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
  .on('ice', (candidate) => pc.addIceCandidate(candidate))
  // デュアル音声認識のソケットイベント
  .on('local-speech-result', (data) => {
    // クライアント側では直接emitしない、サーバーがブロードキャストする
    console.log('受信した音声認識結果:', data);
  })
  .on('local-start-recognition', () => {
    // クライアント側では直接emitしない、サーバーがブロードキャストする
    console.log('相手が音声認識を開始しました');
  })
  .on('local-stop-recognition', () => {
    // クライアント側では直接emitしない、サーバーがブロードキャストする
    console.log('相手が音声認識を停止しました');
  })
  // 実際に受信するイベント
  .on('remote-speech-result', (data) => {
    console.log('相手の音声:', data.transcript);
    if (dualSpeechRecognition) {
      dualSpeechRecognition.displayRemoteResult(data.transcript, data.playerId);
    }
  })
  .on('remote-start-recognition', () => {
    if (dualSpeechRecognition) {
      dualSpeechRecognition.showRemoteStatus('相手が音声認識中...');
    }
  })
  .on('remote-stop-recognition', () => {
    if (dualSpeechRecognition) {
      dualSpeechRecognition.hideRemoteStatus();
    }
  });

// デュアル音声認識の初期化
let dualSpeechRecognition;

// DOMが読み込まれた後に初期化
document.addEventListener('DOMContentLoaded', () => {
  dualSpeechRecognition = new DualSpeechRecognition(socket);
});

// グローバル関数として公開
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
