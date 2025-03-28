import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Button,
  TextField,
  Alert,
  Paper,
  CircularProgress,
} from '@mui/material';
import axios from 'axios';
import Navbar from '../common/Navbar';
import FaceUpload from './FaceUpload';

const StudentDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    console.log('StudentDashboard mounted');
    console.log('User:', user);
    console.log('User role:', user?.role);
    console.log('Token:', token ? 'Present' : 'Missing');
    
    if (user?.role === 'student') {
      checkVerificationStatus();
    }
  }, []);

  const checkVerificationStatus = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/verify-status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Verification status:', response.data);
      setIsVerified(response.data.isVerified);
      if (response.data.isVerified) {
        fetchImages();
      }
    } catch (error) {
      console.error('Error checking verification status:', error);
      setError('Failed to check verification status');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchImages = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/images', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched images:', response.data);
      setImages(response.data.images || response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
      setError(error.response?.data?.message || 'Failed to fetch images');
    }
  };

  const handleFaceDetected = async (formData) => {
    try {
      console.log('Uploading face verification image...');
      const response = await axios.post(
        'http://localhost:3001/api/verify-face',
        formData,
        {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      console.log('Face verification response:', response.data);
      setIsVerified(true);
      setSuccess('Face verification successful!');
      setError('');
      
      // Fetch images after successful verification
      await fetchImages();
    } catch (error) {
      console.error('Face verification error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Face verification failed');
      setIsVerified(false);
    }
  };

  const handleDownload = async (imageId) => {
    try {
      const response = await axios.get(
        `http://localhost:3001/api/images/${imageId}/download`,
        {
          headers: { Authorization: `Bearer ${token}` },
          responseType: 'blob'
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'image.jpg');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download image');
    }
  };

  const filteredImages = images.filter(image =>
    image.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return (
      <Box>
        <Navbar title="Student Dashboard" />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
            <CircularProgress />
          </Box>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar title="Student Dashboard" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Student Dashboard
        </Typography>
        
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        
        {success && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {success}
          </Alert>
        )}

        {user?.role === 'student' && !isVerified && (
          <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f5f5f5' }}>
            <Typography variant="h6" gutterBottom color="primary">
              Face Verification Required
            </Typography>
            <Typography variant="body1" paragraph>
              Please upload a clear photo of your face to verify your identity. The system will automatically find your photos from the database.
            </Typography>
            <Box sx={{ mt: 3 }}>
              <FaceUpload onFaceDetected={handleFaceDetected} />
            </Box>
          </Paper>
        )}

        {isVerified && (
          <>
            <TextField
              fullWidth
              label="Search Images"
              variant="outlined"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ mb: 3 }}
            />
            
            {images.length === 0 ? (
              <Typography variant="body1" color="text.secondary" align="center">
                No images found. Please contact your administrator to upload images.
              </Typography>
            ) : (
              <Grid container spacing={3}>
                {filteredImages.map((image) => (
                  <Grid item xs={12} sm={6} md={4} key={image._id}>
                    <Card>
                      <CardMedia
                        component="img"
                        height="200"
                        image={`http://localhost:3001/${image.path}`}
                        alt={image.name}
                      />
                      <CardContent>
                        <Typography variant="h6">{image.name}</Typography>
                        <Typography variant="body2" color="text.secondary">
                          Uploaded by: {image.uploadedBy?.name || 'Unknown'}
                        </Typography>
                      </CardContent>
                      <CardActions>
                        <Button
                          size="small"
                          color="primary"
                          onClick={() => handleDownload(image._id)}
                        >
                          Download
                        </Button>
                      </CardActions>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </>
        )}
      </Container>
    </Box>
  );
};

export default StudentDashboard; 