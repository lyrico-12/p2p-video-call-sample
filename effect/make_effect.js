// Webカメラの設定と効果表示のための要素を作成
const video = document.createElement('video');
const canvas = document.createElement('canvas');
const context = canvas.getContext('2d');

// サウンドエフェクトの設定
const correctSound = new Audio('./sounds/Quiz-Ding_Dong02-1(Fast).mp3');
const incorrectSound = new Audio('./sounds/Quiz-Buzzer02-4(Multi).mp3');

// エラーハンドリング
correctSound.onerror = (e) => console.error('正解音の読み込みに失敗:', e);
incorrectSound.onerror = (e) => console.error('不正解音の読み込みに失敗:', e);

// キャンバスのサイズを設定
function updateCanvasSize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
updateCanvasSize();

// スタイル設定
video.style.position = 'fixed';
video.style.top = '0';
video.style.left = '0';
video.style.width = '100%';
video.style.height = '100%';
video.style.objectFit = 'cover';
video.style.transform = 'scaleX(-1)'; // カメラを鏡像反転
document.body.appendChild(video);

canvas.style.position = 'fixed';
canvas.style.top = '0';
canvas.style.left = '0';
canvas.style.width = '100%';
canvas.style.height = '100%';
canvas.style.pointerEvents = 'none';
canvas.style.transform = 'scaleX(-1)'; // キャンバスも鏡像反転
document.body.appendChild(canvas);

// Webカメラの初期化
async function initCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            } 
        });
        video.srcObject = stream;
        await video.play();
        
        // ビデオのメタデータがロードされた後にキャンバスのサイズを設定
        video.onloadedmetadata = updateCanvasSize;
    } catch (err) {
        console.error('カメラの起動に失敗しました:', err);
    }
}

// 正解エフェクトの表示
function showCorrect() {
    try {
        correctSound.currentTime = 0;
        correctSound.play().catch(e => console.error('音声再生エラー:', e));
    } catch (e) {
        console.error('音声再生エラー:', e);
    }
    
    const duration = 300;
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // 丸を描画
        context.beginPath();
        context.strokeStyle = '#2ecc71';
        context.lineWidth = 15;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxRadius = Math.min(canvas.width, canvas.height) * 0.2;
        const currentRadius = Math.max(0, maxRadius * progress); // 負の値を防ぐ
        
        context.arc(centerX, centerY, currentRadius, 0, Math.PI * 2);
        context.stroke();
        
        // 輝く効果
        const glowSize = 20;
        context.shadowBlur = glowSize;
        context.shadowColor = '#2ecc71';
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            setTimeout(() => {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }, 2000);
        }
    }
    
    requestAnimationFrame(animate);
}

// 不正解エフェクトの表示
function showIncorrect() {
    try {
        incorrectSound.currentTime = 0;
        incorrectSound.play().catch(e => console.error('音声再生エラー:', e));
    } catch (e) {
        console.error('音声再生エラー:', e);
    }
    
    const duration = 300;
    const startTime = performance.now();
    
    function animate(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        context.clearRect(0, 0, canvas.width, canvas.height);
        
        // バツを描画
        context.beginPath();
        context.strokeStyle = '#e74c3c';
        context.lineWidth = 15;
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const maxSize = Math.min(canvas.width, canvas.height) * 0.2;
        const currentSize = Math.max(0, maxSize * progress); // 負の値を防ぐ
        
        // バツの線を描画
        context.moveTo(centerX - currentSize, centerY - currentSize);
        context.lineTo(centerX + currentSize, centerY + currentSize);
        context.moveTo(centerX + currentSize, centerY - currentSize);
        context.lineTo(centerX - currentSize, centerY + currentSize);
        
        // 輝く効果
        context.shadowBlur = 20;
        context.shadowColor = '#e74c3c';
        context.stroke();
        
        if (progress < 1) {
            requestAnimationFrame(animate);
        } else {
            setTimeout(() => {
                context.clearRect(0, 0, canvas.width, canvas.height);
            }, 2000);
        }
    }
    
    requestAnimationFrame(animate);
}

// ウィンドウサイズが変更された時にキャンバスとビデオのサイズを更新
window.addEventListener('resize', updateCanvasSize);

// カメラを初期化
initCamera();

// 外部から呼び出せるようにグローバルに公開
window.showCorrect = showCorrect;
window.showIncorrect = showIncorrect;
