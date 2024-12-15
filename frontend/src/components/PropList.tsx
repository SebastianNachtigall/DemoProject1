import React, { useState } from 'react';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  IconButton,
} from '@mui/material';
import { useCart } from '../context/CartContext';
import AddToCartModal from './AddToCartModal';
import PropDetailModal from './PropDetailModal';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import { API_BASE_URL } from '../config';

interface Prop {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  images: { id: number; image_url: string; order: number }[];
}

interface PropCardProps {
  prop: Prop;
  onAddToCart: (prop: Prop) => void;
  onTitleClick: (prop: Prop) => void;
}

const PropCard: React.FC<PropCardProps> = ({ prop, onAddToCart, onTitleClick }) => {
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

  return (
    <Card 
      sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        transition: 'all 0.3s ease-in-out',
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-8px)',
          boxShadow: (theme) => `0 8px 24px ${theme.palette.primary.main}25`,
        }
      }}
      onClick={() => onTitleClick(prop)}
    >
      <Box sx={{ position: 'relative' }}>
        <CardMedia
          component="img"
          height="200"
          image={prop.images[currentImageIndex]?.image_url || ''}
          alt={prop.name}
          sx={{ objectFit: 'cover' }}
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
                zIndex: 2,
              }}
              onClick={(e) => {
                e.stopPropagation();
                previousImage();
              }}
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
                zIndex: 2,
              }}
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
            >
              <ArrowForwardIosIcon />
            </IconButton>
          </>
        )}
        <Box
          sx={{
            position: 'absolute',
            bottom: 8,
            right: 8,
            display: 'flex',
            gap: 0.5,
            zIndex: 2,
          }}
        >
          {prop.images.map((_, index) => (
            <Box
              key={index}
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: index === currentImageIndex ? 'white' : 'rgba(255, 255, 255, 0.5)',
                transition: 'background-color 0.3s ease',
              }}
            />
          ))}
        </Box>
      </Box>
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography gutterBottom variant="h6" component="h2">
          {prop.name}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {prop.description}
        </Typography>
        <Typography variant="h6" color="primary" sx={{ mt: 'auto' }}>
          ${prop.price.toLocaleString()}
        </Typography>
      </CardContent>
    </Card>
  );
};

const PropList: React.FC = () => {
  const [props, setProps] = useState<Prop[]>([]);
  const [selectedProp, setSelectedProp] = useState<Prop | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const { addToCart } = useCart();

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/api/props`)
      .then((response) => response.json())
      .then((data) => setProps(data))
      .catch((error) => console.error('Error fetching props:', error));
  }, []);

  const handleAddToCart = (prop: Prop) => {
    setSelectedProp(prop);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setSelectedProp(null);
  };

  const handleDetailModalClose = () => {
    setIsDetailModalOpen(false);
    // Only clear selected prop if add to cart modal is not open
    if (!isModalOpen) {
      setSelectedProp(null);
    }
  };

  const handleTitleClick = (prop: Prop) => {
    setSelectedProp(prop);
    setIsDetailModalOpen(true);
  };

  const handleModalSubmit = (quantity: number, printedVersion: boolean) => {
    if (selectedProp) {
      addToCart(selectedProp, quantity, printedVersion);
      // Close both modals
      setIsModalOpen(false);
      setIsDetailModalOpen(false);
      setSelectedProp(null);
    }
  };

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      <Grid container spacing={4}>
        {props.map((prop) => (
          <Grid item key={prop.id} xs={12} sm={6} md={4}>
            <PropCard 
              prop={prop} 
              onAddToCart={handleAddToCart} 
              onTitleClick={handleTitleClick}
            />
          </Grid>
        ))}
      </Grid>
      
      {selectedProp && (
        <>
          <AddToCartModal
            open={isModalOpen}
            onClose={handleModalClose}
            onSubmit={handleModalSubmit}
            prop={selectedProp}
          />
          <PropDetailModal
            open={isDetailModalOpen}
            onClose={handleDetailModalClose}
            prop={selectedProp}
            onAddToCart={handleAddToCart}
          />
        </>
      )}
    </Box>
  );
};

export default PropList;
