class VoiceRecognition {
  constructor() {
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.setupRecognition();
  }

  setupRecognition() {
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = false; // 短い音声で停止
    this.recognition.interimResults = true;
    this.recognition.maxAlternatives = 1; // 代替候補を1つに制限
    
    // 無音検出の時間を短縮（ブラウザがサポートしている場合）
    if ('webkitSpeechRecognition' in window) {
      this.recognition.webkitAudioContext = true;
    }

    this.recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        this.onFinalResult(finalTranscript);
        // 結果が得られたら自動的に停止
        this.stop();
      }
      if (interimTranscript) {
        this.onInterimResult(interimTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('音声認識エラー:', event.error);
    };

    // 音声認識が終了したら自動的に再開（必要に応じて）
    this.recognition.onend = () => {
      console.log('音声認識終了');
    };
  }

  start() {
    this.recognition.start();
  }

  stop() {
    this.recognition.stop();
  }

  // 手動で確定させるメソッド
  forceFinalize() {
    this.recognition.stop();
    // 少し待ってから再開（連続認識が必要な場合）
    setTimeout(() => {
      if (this.recognition.continuous) {
        this.recognition.start();
      }
    }, 100);
  }

  onFinalResult(transcript) {
    console.log('確定結果:', transcript);
    const finalResultsDiv = document.getElementById('finalResults');
    if (finalResultsDiv) {
      finalResultsDiv.innerHTML += `<p>${transcript}</p>`;
    }
  }

  onInterimResult(transcript) {
    console.log('途中結果:', transcript);
    const interimResultsDiv = document.getElementById('interimResults');
    if (interimResultsDiv) {
      interimResultsDiv.innerHTML = `<p>認識中: ${transcript}</p>`;
    }
  }
}

// グローバル変数として音声認識インスタンスを作成
let voiceRecognition;

// ボタンから呼び出される関数
function startVoiceRecognition() {
  if (!voiceRecognition) {
    voiceRecognition = new VoiceRecognition();
  }
  voiceRecognition.start();
  console.log('音声認識を開始しました');
}

function stopVoiceRecognition() {
  if (voiceRecognition) {
    voiceRecognition.stop();
    console.log('音声認識を停止しました');
  }
}

function forceFinalize() {
  if (voiceRecognition) {
    voiceRecognition.forceFinalize();
    console.log('音声認識を手動で確定しました');
  }
}