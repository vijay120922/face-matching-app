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

const AdminDashboard = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [images, setImages] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const user = JSON.parse(localStorage.getItem('user'));
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await axios.get('http://localhost:3001/api/images', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Fetched images:', response.data);
      setImages(response.data);
    } catch (error) {
      console.error('Error fetching images:', error);
      setError(error.response?.data?.message || 'Failed to fetch images');
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('image', file);

    try {
      setUploadProgress(0);
      setError('');
      setSuccess('');

      const response = await axios.post(
        'http://localhost:3001/api/images/upload',
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(progress);
          }
        }
      );

      console.log('Upload response:', response.data);
      setSuccess('Image uploaded successfully');
      await fetchImages();
    } catch (error) {
      console.error('Upload error:', error.response?.data || error.message);
      setError(error.response?.data?.message || 'Failed to upload image');
    } finally {
      setUploadProgress(0);
    }
  };

  const handleDelete = async (imageId) => {
    try {
      await axios.delete(`http://localhost:3001/api/images/${imageId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuccess('Image deleted successfully');
      await fetchImages();
    } catch (error) {
      setError(error.response?.data?.message || 'Failed to delete image');
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
        <Navbar title="Admin Dashboard" />
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          <Typography variant="h6">Loading...</Typography>
        </Container>
      </Box>
    );
  }

  return (
    <Box>
      <Navbar title="Admin Dashboard" />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Admin Dashboard
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

        <Paper sx={{ p: 3, mb: 4, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom color="primary">
            Upload Images
          </Typography>
          <Typography variant="body1" paragraph>
            Upload any image file (JPG, JPEG, PNG, GIF)
          </Typography>
          <Box sx={{ mt: 2 }}>
            <input
              accept="image/*"
              style={{ display: 'none' }}
              id="image-upload"
              type="file"
              onChange={handleImageUpload}
            />
            <label htmlFor="image-upload">
              <Button
                variant="contained"
                component="span"
                disabled={uploadProgress > 0}
              >
                {uploadProgress > 0 ? (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <CircularProgress size={20} color="inherit" />
                    <span>Uploading... {uploadProgress}%</span>
                  </Box>
                ) : (
                  'Upload Image'
                )}
              </Button>
            </label>
          </Box>
        </Paper>

        <TextField
          fullWidth
          label="Search Images"
          variant="outlined"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ mb: 3 }}
        />

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
                  <Button
                    size="small"
                    color="error"
                    onClick={() => handleDelete(image._id)}
                  >
                    Delete
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    </Box>
  );
};

export default AdminDashboard; 