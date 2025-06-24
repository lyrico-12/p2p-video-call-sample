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

// 新しいクライアントが接続されるたびに呼び出されるコールバック関数。
// socket はこのクライアントとの通信用オブジェクト。
io.on('connection', (socket) => {
  socket.on('ready', () => {
    readyUsers.add(socket.id);
    if (readyUsers.size === 2) {
      io.emit('both-ready');
    } else {
      io.emit('not-ready');
    }
  });

  socket.on('end-game', () => {
    io.emit('force-end-game');
    readyUsers.clear();
  });

  socket.on('disconnect', () => {
    readyUsers.delete(socket.id);
    io.emit('not-ready');
  });
});


http.listen(Number(process.env.PORT) || 3000);
