// server.js
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const { exec } = require('child_process');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// 静的ファイルを配信（HTMLやJSもここから）
app.use(express.static('public'));

// 変換音声を公開（例: converted/output.wav）
app.use('/converted', express.static('converted'));

io.on('connection', (socket) => {
  console.log('ユーザー接続');

  // クライアントから受け取ったテキストを Python に渡す
  socket.on('transcript', (text) => {
    console.log('受信したテキスト:', text);

    // Pythonスクリプトを呼び出す（RVC処理）
    // exec(`python3 tts_pipeline.py "${text}"`, (err, stdout, stderr) => {
    //     if (err) {
    //       console.error('音声合成エラー:', err);
    //       return;
    //     }
    //     console.log('TTS完了:', stdout);
    //     socket.emit('voice', `/converted/output.wav`);
    //   });
  });
});

server.listen(3000, () => {
  console.log('サーバ起動: http://localhost:3000');
});
