const fs = require('fs');
const path = require('path');
const https = require('https');

const MODELS_DIR = path.join(__dirname, '..', 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

const MODEL_URLS = {
  'ssd_mobilenetv1_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1',
  'face_landmark_68_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1',
  'face_recognition_model-shard2': 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2'
};

async function downloadFile(fileName, url) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${fileName}...`);
    const filePath = path.join(MODELS_DIR, fileName);
    const file = fs.createWriteStream(filePath);

    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Request Failed With a Status Code: ${response.statusCode}`));
        return;
      }

      response.pipe(file);

      file.on('finish', () => {
        file.close();
        console.log(`Successfully downloaded ${fileName}`);
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      reject(err);
    });
  });
}

async function downloadModels() {
  console.log('Starting to download face-api.js models...');
  
  for (const [fileName, url] of Object.entries(MODEL_URLS)) {
    try {
      await downloadFile(fileName, url);
    } catch (error) {
      console.error(`Error downloading ${fileName}:`, error);
    }
  }
  
  console.log('Finished downloading models');
}

downloadModels(); 