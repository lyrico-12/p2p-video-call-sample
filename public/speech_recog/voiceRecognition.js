class VoiceRecognition {
  constructor() {
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.setupRecognition();
  }

  setupRecognition() {
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = false; // 短い音声で停止
    this.recognition.interimResults = false;
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

  onFinalResult(transcript) {
    console.log('確定結果:', transcript);
  }

  onInterimResult(transcript) {
    console.log('途中結果:', transcript);
  }
}