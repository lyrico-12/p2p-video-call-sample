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

// 新しいクライアントが接続されるたびに呼び出されるコールバック関数。
// socket はこのクライアントとの通信用オブジェクト。
io.on('connection', (socket) => {
  // クライアントから受信したofferを相手に中継
  socket.on('offer', (desc) => {
    socket.broadcast.emit('offer', desc);
  });

  // クライアントから受信したanswerを相手に中継
  socket.on('answer', (desc) => {
    socket.broadcast.emit('answer', desc);
  });

  // ICE candidateの中継
  socket.on('ice', (candidate) => {
    socket.broadcast.emit('ice', candidate);
  });

  // Joinしているユーザーが2人の時のみゲーム開始ボタンを有効にする
  socket.on('ready', () => {
    readyUsers.add(socket.id);
    if (readyUsers.size === 2) {
      io.emit('enable-game');
    } 
    // else {
    //   socket.emit('unable-game');
    // }
  })

  // ここではゲーム開始ボタンを押した時のイベントを受け取る
  socket.on('start-game', () => {
    gameUsers.add(socket.id);
    if (gameUsers.size === 2) {
      io.emit('let-start-game');
    } 
    // else {
    //   socket.emit('not-start'); // 二人で通信することしか考慮していないため、socket.emit()にしている
    //   console.log("not start game")
    // }
  });

  socket.on('end-game', () => {
    io.emit('let-end-game');
    gameUsers.clear();
  });

  // ゲーム終了ボタンをゲーム開始ボタンにする
  // ゲーム開始ボタンを無効にする
  socket.on('disconnect', () => {
    readyUsers.delete(socket.id);
    io.emit('not-ready');
  });
});


http.listen(Number(process.env.PORT) || 3000);
