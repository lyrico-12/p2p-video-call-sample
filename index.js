import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

// expressアプリを作成。(HTTPサーバーのルーティングなどを簡単に行うためのWebフレームワーク)
const app = express();
// HTTPサーバーを生成し、expressアプリを組み込む
const http = createServer(app);
// Socket.IOサーバーをHTTPサーバーに紐づけて起動。
const io = new Server(http);

// publicディレクトリにあるファイルを提供
app.use(express.static('public'));

let readyUsers = new Set();
let gameUsers = new Set();

// クライアント接続時のイベント
io.on('connection', (socket) => {
  // ===== WebRTC シグナリング（main ブランチ） =====
  socket.on('offer', (desc) => {
    socket.broadcast.emit('offer', desc);
  });

  socket.on('answer', (desc) => {
    socket.broadcast.emit('answer', desc);
  });

  socket.on('ice', (candidate) => {
    socket.broadcast.emit('ice', candidate);
  });

  socket.on('ready', () => {
    readyUsers.add(socket.id);
    if (readyUsers.size === 2) {
      io.emit('enable-game');
    } else {
      socket.emit('unable-game');
    }
  });

  socket.on('start-game', () => {
    gameUsers.add(socket.id);
    if (gameUsers.size === 2) {
      io.emit('let-start-game');
    }
  });

  socket.on('end-game', () => {
    io.emit('let-end-game');
    gameUsers.clear();
  });

  socket.on('disconnect', () => {
    readyUsers.delete(socket.id);
    io.emit('unable-game');
  });

  // ===== 音声認識（speech/recog ブランチ） =====
  socket.on('local-speech-result', (data) => {
    socket.broadcast.emit('remote-speech-result', data);
  });

  socket.on('local-start-recognition', () => {
    socket.broadcast.emit('remote-start-recognition');
  });

  socket.on('local-stop-recognition', () => {
    socket.broadcast.emit('remote-stop-recognition');
  });

  // local- 以外のイベントはそのまま転送
  socket.onAny((event, data) => {
    if (!event.startsWith('local-')) {
      socket.broadcast.emit(event, data);
    }
  });
});

http.listen(Number(process.env.PORT) || 3000);
