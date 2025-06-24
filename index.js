import { createServer } from 'http';
import { Server } from 'socket.io';
import express from 'express';

const app = express();
const http = createServer(app);
const io = new Server(http);

app.use(express.static('public'));

let readyUsers = new Set();

io.on('connection', (socket) => {
  socket.on('ready', () => {
    readyUsers.add(socket.id);
    if (readyUsers.size === 2) {
      // 両方準備完了 → 全員に通知
      io.emit('start-game');
      readyUsers.clear();
    }
  });

  socket.on('disconnect', () => {
    readyUsers.delete(socket.id);
  });
});

http.listen(Number(process.env.PORT) || 3000);
