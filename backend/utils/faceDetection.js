const faceapi = require('face-api.js');
const canvas = require('canvas');
const path = require('path');
const fs = require('fs');

let modelsLoaded = false;

async function loadModels() {
  if (modelsLoaded) {
    console.log('Models already loaded');
    return;
  }

  try {
    console.log('Loading face detection models...');
    const modelsPath = path.join(__dirname, '../models');
    
    // Check if models directory exists
    if (!fs.existsSync(modelsPath)) {
      console.error('Models directory not found:', modelsPath);
      throw new Error('Face detection models not found. Please ensure models are downloaded.');
    }

    // Load all required models
    await Promise.all([
      faceapi.nets.ssdMobilenetv1.loadFromDisk(modelsPath),
      faceapi.nets.faceLandmark68Net.loadFromDisk(modelsPath),
      faceapi.nets.faceRecognitionNet.loadFromDisk(modelsPath)
    ]);
    
    modelsLoaded = true;
    console.log('Face detection models loaded successfully');
  } catch (error) {
    console.error('Error loading face detection models:', error);
    throw new Error('Failed to load face detection models: ' + error.message);
  }
}

async function detectFaces(imagePath) {
  try {
    // Ensure models are loaded
    await loadModels();
    
    console.log('Loading image for face detection:', imagePath);
    
    // Check if image exists
    if (!fs.existsSync(imagePath)) {
      throw new Error('Image file not found: ' + imagePath);
    }

    // Load and process image
    const img = await canvas.loadImage(imagePath);
    console.log('Image loaded successfully, dimensions:', img.width, 'x', img.height);
    
    console.log('Detecting faces...');
    const detections = await faceapi.detectAllFaces(img)
      .withFaceLandmarks()
      .withFaceDescriptors();
    
    console.log('Face detection complete. Found faces:', detections.length);
    return detections;
  } catch (error) {
    console.error('Error detecting faces:', error);
    throw new Error('Face detection failed: ' + error.message);
  }
}

module.exports = {
  loadModels,
  detectFaces
}; 