import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface Prop {
  id: number;
  name: string;
  description: string;
  price: number;
  print_cost: number;
  category: string;
  images: { id: number; image_url: string; order: number }[];
}

interface PropDetailModalProps {
  open: boolean;
  onClose: () => void;
  prop: Prop;
  onAddToCart: (prop: Prop) => void;
}

const PropDetailModal: React.FC<PropDetailModalProps> = ({
  open,
  onClose,
  prop,
  onAddToCart,
}) => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const nextImage = () => {
    setCurrentImageIndex((prev) =>
      prev === prop.images.length - 1 ? 0 : prev + 1
    );
  };

  const previousImage = () => {
    setCurrentImageIndex((prev) =>
      prev === 0 ? prop.images.length - 1 : prev - 1
    );
  };

  const handleAddToCart = () => {
    onAddToCart(prop);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{prop.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ position: 'relative', mb: 3 }}>
          <Box
            component="img"
            src={prop.images[currentImageIndex]?.image_url || ''}
            alt={prop.name}
            sx={{
              width: '100%',
              height: 400,
              objectFit: 'cover',
              borderRadius: 1,
            }}
          />
          {prop.images.length > 1 && (
            <>
              <IconButton
                sx={{
                  position: 'absolute',
                  left: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                }}
                onClick={previousImage}
              >
                <ArrowBackIosNewIcon />
              </IconButton>
              <IconButton
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  bgcolor: 'rgba(255, 255, 255, 0.8)',
                  '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.9)' },
                }}
                onClick={nextImage}
              >
                <ArrowForwardIosIcon />
              </IconButton>
            </>
          )}
          <Box
            sx={{
              position: 'absolute',
              bottom: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              gap: 1,
            }}
          >
            {prop.images.map((_, index) => (
              <Box
                key={index}
                sx={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  bgcolor:
                    index === currentImageIndex
                      ? 'primary.main'
                      : 'rgba(255, 255, 255, 0.8)',
                  cursor: 'pointer',
                  boxShadow: '0 0 4px rgba(0,0,0,0.2)',
                }}
                onClick={() => setCurrentImageIndex(index)}
              />
            ))}
          </Box>
        </Box>

        <Typography variant="h6" gutterBottom>
          Description
        </Typography>
        <Typography variant="body1" paragraph>
          {prop.description}
        </Typography>

        <Typography variant="h6" gutterBottom>
          Category
        </Typography>
        <Typography variant="body1" paragraph>
          {prop.category}
        </Typography>

        <Typography variant="h6" gutterBottom>
          Price
        </Typography>
        <Typography variant="h4" color="primary">
          ${prop.price.toLocaleString()}
        </Typography>

        {prop.print_cost > 0 && (
          <>
            <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
              Print Cost
            </Typography>
            <Typography variant="body1" color="text.secondary">
              ${prop.print_cost.toLocaleString()}
            </Typography>
          </>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleAddToCart}
          sx={{ minWidth: 120 }}
        >
          Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default PropDetailModal;
