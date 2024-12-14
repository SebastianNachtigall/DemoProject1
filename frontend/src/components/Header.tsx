import React from 'react';
import { Box } from '@mui/material';

const Header: React.FC = () => {
  return (
    <Box sx={{ width: '100%', bgcolor: 'transparent' }}>
      <img 
        src="/images/agentur-logo.png" 
        alt="Agentur Schein Berlin Logo" 
        style={{ 
          width: '100%',
          height: 'auto',
          maxHeight: '455px',
          objectFit: 'cover'
        }} 
      />
    </Box>
  );
};

export default Header;
