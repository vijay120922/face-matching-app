import React, { useState } from 'react';
import {
  Box,
  Button,
  Alert,
  Typography,
} from '@mui/material';
import { CloudUpload } from '@mui/icons-material';

const FaceUpload = ({ onFaceDetected }) => {
  const [error, setError] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageUpload = async (event) => {
    try {
      const file = event.target.files[0];
      if (!file) return;

      setError('');
      setLoading(true);
      setImage(URL.createObjectURL(file));

      // Create FormData
      const formData = new FormData();
      formData.append('image', file);

      // Call the parent's onFaceDetected with the file
      onFaceDetected(formData);
    } catch (error) {
      console.error('Error processing image:', error);
      setError('Failed to process image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Button
          component="label"
          variant="contained"
          startIcon={<CloudUpload />}
          fullWidth
          size="large"
          disabled={loading}
          sx={{ 
            backgroundColor: '#1976d2',
            '&:hover': {
              backgroundColor: '#1565c0',
            },
          }}
        >
          {loading ? 'Processing...' : 'Choose Photo for Face Verification'}
          <input
            type="file"
            hidden
            accept="image/*"
            onChange={handleImageUpload}
            disabled={loading}
          />
        </Button>
      </Box>

      {image && (
        <Box sx={{ width: '100%', maxWidth: 500, mx: 'auto' }}>
          <img
            src={image}
            alt="Uploaded face"
            style={{ width: '100%', display: 'block', borderRadius: '8px' }}
          />
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
            Please ensure your face is clearly visible in the photo
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default FaceUpload; 