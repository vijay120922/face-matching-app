const https = require('https');
const fs = require('fs');
const path = require('path');

const MODEL_URL = 'https://github.com/justadudewhohacks/face-api.js/tree/master/weights';
const MODEL_FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1'
];

const modelsDir = path.join(__dirname, 'models');

// Create models directory if it doesn't exist
if (!fs.existsSync(modelsDir)) {
  fs.mkdirSync(modelsDir);
}

const downloadFile = (filename) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path.join(modelsDir, filename));
    const url = `https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/${filename}`;
    
    https.get(url, response => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`Downloaded: ${filename}`);
        resolve();
      });
    }).on('error', err => {
      fs.unlink(path.join(modelsDir, filename), () => reject(err));
    });
  });
};

const downloadAllModels = async () => {
  try {
    console.log('Starting model downloads...');
    for (const file of MODEL_FILES) {
      await downloadFile(file);
    }
    console.log('All models downloaded successfully!');
  } catch (error) {
    console.error('Error downloading models:', error);
  }
};

downloadAllModels(); 