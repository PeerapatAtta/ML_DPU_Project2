const videoElement = document.getElementById('video');
const canvasElement = document.getElementById('canvas');
const canvasCtx = canvasElement.getContext('2d');
const uploadVideoInput = document.getElementById('uploadVideo');
const jumpingJackCountElement = document.getElementById('jumpingJackCount');
const resetButton = document.getElementById('resetButton');

const startButton = document.getElementById('startButton');
const stopButton = document.getElementById('stopButton');
const statusMessage = document.getElementById('statusMessage');

let camera; // ตัวแปรกล้อง
let isCameraRunning = false;
let jumpingJackCount = 0;
let isUp = false; // ใช้ตรวจจับสถานะ "ขึ้น" ของแขนและขา

// Initialize Mediapipe Holistic
const holistic = new Holistic({
  locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/holistic/${file}`;
  },
});

holistic.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: false,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});

holistic.onResults(onResults);

// Start Webcam
document.getElementById('startButton').addEventListener('click', () => {
  if (!isCameraRunning) {
    camera = new Camera(videoElement, {
      onFrame: async () => {
        await holistic.send({ image: videoElement });
      },
      width: 640,
      height: 480,
    });
    camera.start();
    isCameraRunning = true;
    console.log("Webcam started");
  }
});

// Stop Webcam
document.getElementById('stopButton').addEventListener('click', () => {
  if (isCameraRunning && camera) {
    camera.stop();
    isCameraRunning = false;
    
    // Reset videoElement
    resetVideoElement();

    console.log("Webcam stopped");

    // Clear Canvas
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  }
});

function resetVideoElement() {
  videoElement.pause();
  videoElement.srcObject = null; // ล้าง MediaStream
  videoElement.src = ""; // ล้าง src
}

// Reset Jumping Jack Count
resetButton.addEventListener('click', () => {
  jumpingJackCount = 0; // Reset count
  jumpingJackCountElement.textContent = jumpingJackCount; // Update UI
  console.log("Jumping Jack Count Reset");
});

// Process Uploaded Video
uploadVideoInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (file) {
    const videoURL = URL.createObjectURL(file);

    // ตั้งค่า src ใหม่สำหรับการอัปโหลดวิดีโอ
    videoElement.src = videoURL;
    videoElement.style.display = "block";
    videoElement.onloadeddata = () => {
      videoElement.play();
      processVideoWithLandmarks();
    };
  }
});

function processVideoWithLandmarks() {
  const processFrame = () => {
    if (!videoElement.paused && !videoElement.ended) {
      holistic.send({ image: videoElement }).then(() => {
        requestAnimationFrame(processFrame);
      });
    }
  };
  processFrame();
}


function onResults(results) {
  // Adjust Canvas Size to Match Video
  canvasElement.width = videoElement.videoWidth;
  canvasElement.height = videoElement.videoHeight;

  // Clear Canvas
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

  // Draw Image from Video
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  // Draw Landmarks and Connections
  if (results.poseLandmarks) {
    drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 2,
    });
    drawLandmarks(canvasCtx, results.poseLandmarks, { color: '#FF0000', lineWidth: 2 });

    detectJumpingJack(results.poseLandmarks);
  }

  if (results.leftHandLandmarks) {
    drawConnectors(canvasCtx, results.leftHandLandmarks, HAND_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 2,
    });
    drawLandmarks(canvasCtx, results.leftHandLandmarks, { color: '#FF0000', lineWidth: 2 });
  }

  if (results.rightHandLandmarks) {
    drawConnectors(canvasCtx, results.rightHandLandmarks, HAND_CONNECTIONS, {
      color: '#00FF00',
      lineWidth: 2,
    });
    drawLandmarks(canvasCtx, results.rightHandLandmarks, { color: '#FF0000', lineWidth: 2 });
  }

  if (results.faceLandmarks) {
    drawConnectors(canvasCtx, results.faceLandmarks, FACEMESH_RIGHT_EYE, {
      color: '#FF3030',
      lineWidth: 1,
    });
  }

  canvasCtx.restore();
}

function detectJumpingJack(poseLandmarks) {
  // จุดที่ใช้: ไหล่, สะโพก, ข้อเท้า
  const leftShoulder = poseLandmarks[11];
  const rightShoulder = poseLandmarks[12];
  const leftElbow = poseLandmarks[13];
  const rightElbow = poseLandmarks[14];
  const leftHip = poseLandmarks[23];
  const rightHip = poseLandmarks[24];
  const leftAnkle = poseLandmarks[27];
  const rightAnkle = poseLandmarks[28];

  // ตรวจสอบการยกแขนขึ้น
  // const armsUp = (leftShoulder.y < leftHip.y && rightShoulder.y < rightHip.y);
  const armsUp = (leftShoulder.y < leftElbow.y && rightShoulder.y < rightElbow.y);

  // ตรวจสอบการแยกขา
  const legsApart = (Math.abs(leftAnkle.x - rightAnkle.x) > 0.5);

  console.log("armsUp:", armsUp, "isUp:", isUp);

  if (armsUp && !isUp) {
    isUp = true; // เปลี่ยนสถานะเป็น "ขึ้น"
  } else if (!armsUp && isUp) {
    isUp = false; // เปลี่ยนสถานะเป็น "ลง"
    jumpingJackCount++; // เพิ่มจำนวนการนับ
    jumpingJackCountElement.textContent = jumpingJackCount; // อัปเดต UI
    console.log("Jumping Jack Count:", jumpingJackCount); // Debugging
  }
}

// Update status message on Start
startButton.addEventListener('click', () => {
  statusMessage.textContent = 'Webcam is running...';
  statusMessage.classList.remove('text-muted');
  statusMessage.classList.add('text-success');
});

// Update status message on Stop
stopButton.addEventListener('click', () => {
  statusMessage.textContent = 'Webcam is stopped';
  statusMessage.classList.remove('text-success');
  statusMessage.classList.add('text-muted');
});
