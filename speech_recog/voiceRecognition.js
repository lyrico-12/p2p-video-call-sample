class VoiceRecognition {
  constructor() {
    this.recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
    this.setupRecognition();
  }

  setupRecognition() {
    this.recognition.lang = 'ja-JP';
    this.recognition.continuous = true;
    this.recognition.interimResults = true;

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
      }
      if (interimTranscript) {
        this.onInterimResult(interimTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('音声認識エラー:', event.error);
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