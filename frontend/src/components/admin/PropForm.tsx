import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Paper,
  IconButton,
  Grid,
  Container,
  Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import AddIcon from '@mui/icons-material/Add';

interface PropFormData {
  name: string;
  description: string;
  price: string;
  print_cost: number;
  category: string;
  images: string[];
}

interface PropFormProps {
  initialData?: {
    name?: string;
    description?: string;
    price?: number;
    print_cost?: number;
    category?: string;
    images?: { image_url: string; order: number }[];
  };
  onSubmit: (data: PropFormData) => void;
  submitButtonText: string;
}

const PropForm: React.FC<PropFormProps> = ({
  initialData,
  onSubmit,
  submitButtonText,
}) => {
  const [formData, setFormData] = useState<PropFormData>({
    name: initialData?.name || '',
    description: initialData?.description || '',
    price: initialData?.price?.toString() || '',
    print_cost: initialData?.print_cost || 0,
    category: initialData?.category || '',
    images: initialData?.images?.map(img => img.image_url) || [''],
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images];
    newImages[index] = value;
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const addImageField = () => {
    if (formData.images.length < 5) {
      setFormData(prev => ({ ...prev, images: [...prev.images, ''] }));
    }
  };

  const removeImageField = (index: number) => {
    const newImages = formData.images.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, images: newImages }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Filter out empty image URLs
    const cleanedData = {
      ...formData,
      images: formData.images.filter(url => url.trim() !== ''),
    };
    onSubmit({
      ...cleanedData,
      price: parseFloat(formData.price.toString()),
      print_cost: parseFloat(formData.print_cost.toString())
    });
  };

  return (
    <Paper elevation={3} sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <form onSubmit={handleSubmit}>
        <Typography variant="h6" gutterBottom>
          Prop Details
        </Typography>
        
        <TextField
          fullWidth
          label="Name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          margin="normal"
          required
        />
        
        <TextField
          fullWidth
          label="Description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          margin="normal"
          multiline
          rows={4}
          required
        />
        
        <TextField
          fullWidth
          label="Price"
          name="price"
          type="number"
          value={formData.price}
          onChange={handleChange}
          margin="normal"
          required
          InputProps={{
            startAdornment: '$'
          }}
        />
        
        <TextField
          fullWidth
          label="Print Cost"
          name="print_cost"
          type="number"
          value={formData.print_cost}
          onChange={handleChange}
          margin="normal"
          required
          InputProps={{
            startAdornment: '$'
          }}
        />
        
        <TextField
          fullWidth
          label="Category"
          name="category"
          value={formData.category}
          onChange={handleChange}
          margin="normal"
          required
        />

        <Box sx={{ mt: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            Images (Up to 5)
          </Typography>
          
          {formData.images.map((url, index) => (
            <Grid container spacing={1} alignItems="center" key={index} sx={{ mb: 1 }}>
              <Grid item xs>
                <TextField
                  fullWidth
                  label={`Image URL ${index + 1}`}
                  value={url}
                  onChange={(e) => handleImageChange(index, e.target.value)}
                  margin="normal"
                />
              </Grid>
              <Grid item>
                {index > 0 && (
                  <IconButton
                    onClick={() => removeImageField(index)}
                    color="error"
                    size="small"
                  >
                    <DeleteIcon />
                  </IconButton>
                )}
              </Grid>
            </Grid>
          ))}
          
          {formData.images.length < 5 && (
            <Button
              startIcon={<AddPhotoAlternateIcon />}
              onClick={addImageField}
              sx={{ mt: 1 }}
            >
              Add Image
            </Button>
          )}
        </Box>

        <Box sx={{ mt: 3 }}>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            fullWidth
          >
            {submitButtonText}
          </Button>
        </Box>
      </form>
    </Paper>
  );
};

export default PropForm;
