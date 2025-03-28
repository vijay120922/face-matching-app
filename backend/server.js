const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const faceapi = require('face-api.js');
const canvas = require('canvas');
require('dotenv').config();

const User = require('./models/User');
const Image = require('./models/Image');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

// Load face-api.js models
const MODEL_URL = path.join(__dirname, 'models');
Promise.all([
  faceapi.nets.ssdMobilenetv1.loadFromDisk(MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromDisk(MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromDisk(MODEL_URL)
]).then(() => {
  console.log('Face detection models loaded successfully');
}).catch(err => {
  console.error('Error loading face detection models:', err);
});

// Helper function to process image for face detection
async function processImageForFace(imagePath) {
  try {
    const img = await canvas.loadImage(imagePath);
    const detection = await faceapi.detectSingleFace(img)
      .withFaceLandmarks()
      .withFaceDescriptor();
    
    if (!detection) {
      throw new Error('No face detected in the image');
    }
    
    return detection.descriptor;
  } catch (error) {
    console.error('Face detection error:', error);
    throw error;
  }
}

// Helper function to find matching images
async function findMatchingImages(faceDescriptor) {
  const allImages = await Image.find();
  const matchingImages = [];
  const threshold = 0.6; // Threshold for face matching

  for (const image of allImages) {
    if (image.faceDescriptor) {
      const distance = faceapi.euclideanDistance(faceDescriptor, image.faceDescriptor);
      if (distance < threshold) {
        matchingImages.push(image);
      }
    }
  }

  return matchingImages;
}

// Multer configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  fileFilter: function (req, file, cb) {
    // Accept images only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
      return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
  }
});

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/face-matching-app', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => {
  console.log('Connected to MongoDB');
}).catch((err) => {
  console.error('MongoDB connection error:', err);
});

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Auth middleware
const authMiddleware = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findOne({ _id: decoded.userId });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Register Route
app.post('/api/register', async (req, res) => {
  try {
    const { name, password, role } = req.body;

    // Validate input
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ name });
    if (existingUser) {
      return res.status(400).json({ message: 'Username already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      password: hashedPassword,
      role: role || 'student' // Default to student if role not specified
    });

    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error during registration' });
  }
});

// Login Route
app.post('/api/login', async (req, res) => {
  try {
    const { name, password } = req.body;

    // Validate input
    if (!name || !password) {
      return res.status(400).json({ message: 'Name and password are required' });
    }

    // Find user
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error during login' });
  }
});

// Upload Image Route (Admin only)
app.post('/api/images/upload', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Process image for face detection
    const faceDescriptor = await processImageForFace(req.file.path);

    const image = new Image({
      name: req.file.originalname,
      path: req.file.path,
      uploadedBy: req.user._id,
      faceDescriptor: faceDescriptor
    });

    await image.save();

    res.status(201).json({
      message: 'Image uploaded successfully',
      image: image
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Server error during upload: ' + error.message });
  }
});

// Student Face Verification Route
app.post('/api/verify-face', authMiddleware, upload.single('image'), async (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ message: 'Only students can verify their face' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No image uploaded' });
    }

    // Process image for face detection
    const faceDescriptor = await processImageForFace(req.file.path);

    // Update user with face descriptor
    await User.findByIdAndUpdate(req.user._id, { 
      faceDescriptor,
      isVerified: true
    });

    // Find matching images
    const matchingImages = await findMatchingImages(faceDescriptor);

    // Clean up the temporary file
    fs.unlinkSync(req.file.path);

    res.json({
      message: 'Face verification successful',
      isVerified: true,
      matchingImages: matchingImages.length
    });
  } catch (error) {
    if (req.file && req.file.path) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: 'Face verification failed: ' + error.message });
  }
});

// Get All Images Route
app.get('/api/images', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    
    if (user.role === 'admin') {
      // Admin can see all images
      const images = await Image.find().populate('uploadedBy', 'name');
      return res.json(images);
    }

    // Students can only see matching images
    if (!user.faceDescriptor) {
      return res.status(403).json({ message: 'Face verification required' });
    }

    // Find matching images for the student
    const matchingImages = await findMatchingImages(user.faceDescriptor);
    res.json(matchingImages);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching images' });
  }
});

// Download Image Route
app.get('/api/images/:id/download', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const image = await Image.findById(req.params.id);

    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    if (user.role === 'admin' || user.isVerified) {
      // Send the file
      res.sendFile(path.resolve(image.path));
    } else {
      res.status(403).json({ message: 'Access denied' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete Image Route (Admin only)
app.delete('/api/images/:id', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can delete images' });
    }

    const image = await Image.findById(req.params.id);
    if (!image) {
      return res.status(404).json({ message: 'Image not found' });
    }

    // Delete file from filesystem
    fs.unlinkSync(image.path);
    
    // Delete from database
    await Image.findByIdAndDelete(req.params.id);

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get All Students Route (Admin only)
app.get('/api/users/students', authMiddleware, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }

    const students = await User.find({ role: 'student' }).select('-password');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Server error while fetching students' });
  }
});

// Get Verification Status Route
app.get('/api/verify-status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    console.log('Checking verification status:', {
      userId: user._id,
      isVerified: user.isVerified
    });
    
    res.json({
      isVerified: user.isVerified,
      user: {
        id: user._id,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error checking verification status:', error);
    res.status(500).json({ 
      message: 'Failed to check verification status',
      error: error.message
    });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 