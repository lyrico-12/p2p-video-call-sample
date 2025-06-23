import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

const app = express();
const http = createServer(app);
const io = new Server(http);

app.use(express.static('public'));

io.on('connection', (socket) => {
  // 音声認識イベントの変換処理
  socket.on('local-speech-result', (data) => {
    socket.broadcast.emit('remote-speech-result', data);
  });
  
  socket.on('local-start-recognition', () => {
    socket.broadcast.emit('remote-start-recognition');
  });
  
  socket.on('local-stop-recognition', () => {
    socket.broadcast.emit('remote-stop-recognition');
  });
  
  // その他のイベントはそのまま転送
  socket.onAny((event, data) => {
    if (!event.startsWith('local-')) {
      socket.broadcast.emit(event, data);
    }
  });
});

http.listen(Number(process.env.PORT) || 3000);
