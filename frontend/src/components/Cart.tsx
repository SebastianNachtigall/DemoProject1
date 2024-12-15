import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  Box,
  Divider,
  Paper,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { useCart } from '../context/CartContext';
import { API_BASE_URL } from '../config';

const Cart: React.FC = () => {
  const { items, removeFromCart, clearCart } = useCart();
  const [discountSettings, setDiscountSettings] = useState({
    tier1_quantity: 5,
    tier1_discount: 0.05,
    tier2_quantity: 10,
    tier2_discount: 0.10,
  });

  useEffect(() => {
    fetchDiscountSettings();
  }, []);

  const fetchDiscountSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/discount-settings`);
      if (!response.ok) throw new Error('Failed to fetch discount settings');
      const data = await response.json();
      setDiscountSettings(data);
    } catch (error) {
      console.error('Error fetching discount settings:', error);
    }
  };

  const calculateTotals = () => {
    const totalItems = items.reduce((acc, item) => acc + item.quantity, 0);
    const discountPercent = totalItems >= discountSettings.tier2_quantity 
      ? discountSettings.tier2_discount 
      : totalItems >= discountSettings.tier1_quantity 
        ? discountSettings.tier1_discount 
        : 0;
    
    const totals = items.reduce(
      (acc, item) => {
        acc.subtotal += item.prop.price * item.quantity;
        acc.printCost += item.printedVersion ? (item.prop.print_cost || 0) * item.quantity : 0;
        return acc;
      },
      { subtotal: 0, printCost: 0, total: 0, discountPercent, discountAmount: 0 }
    );
    
    totals.discountAmount = (totals.subtotal + totals.printCost) * totals.discountPercent;
    totals.total = totals.subtotal + totals.printCost - totals.discountAmount;
    
    return totals;
  };

  const handleCheckout = async () => {
    try {
      const { discountPercent } = calculateTotals();
      const response = await fetch(`${API_BASE_URL}/api/generate-invoice`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          items: items.map(item => ({
            ...item.prop,
            quantity: item.quantity,
            printedVersion: item.printedVersion,
            print_cost: item.printedVersion ? item.prop.print_cost : 0
          })),
          discountPercent: discountPercent
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate invoice');
      }

      // Get the PDF blob
      const blob = await response.blob();
      
      // Get filename from headers
      const filename = response.headers.get('X-Filename') || 'invoice.pdf';
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Clear the cart after successful checkout
      clearCart();
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to generate invoice. Please try again.');
    }
  };

  const { subtotal, printCost, total, discountPercent, discountAmount } = calculateTotals();

  return (
    <Box sx={{ 
      width: '100%',
      px: 2,
      py: 2,
      display: 'flex',
      flexDirection: 'column'
    }}>
      <Typography variant="h4" gutterBottom>
        Shopping Cart
      </Typography>
      
      {items.length === 0 ? (
        <Typography variant="body1">Your cart is empty</Typography>
      ) : (
        <Paper elevation={3} sx={{ p: 2 }}>
          <List>
            {items.map((item, index) => (
              <React.Fragment key={item.id}>
                <ListItem>
                  <ListItemText
                    primary={item.prop.name}
                    secondary={
                      <>
                        <Typography component="span" variant="body2">
                          Quantity: {item.quantity}
                        </Typography>
                        <br />
                        <Typography component="span" variant="body2">
                          Price: ${(item.prop.price * item.quantity).toLocaleString()}
                        </Typography>
                        {item.printedVersion && item.prop.print_cost !== undefined && item.prop.print_cost > 0 && (
                          <>
                            <br />
                            <Typography component="span" variant="body2">
                              Print Cost: ${((item.prop.print_cost || 0) * item.quantity).toLocaleString()}
                            </Typography>
                          </>
                        )}
                      </>
                    }
                  />
                  <ListItemSecondaryAction>
                    <IconButton edge="end" onClick={() => removeFromCart(item.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < items.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>

          <Box sx={{ mt: 2, p: 2, bgcolor: 'background.paper' }}>
            <Typography variant="subtitle1" gutterBottom>
              Subtotal: ${subtotal.toLocaleString()}
            </Typography>
            {printCost > 0 && (
              <Typography variant="subtitle1" gutterBottom>
                Total Print Cost: ${printCost.toLocaleString()}
              </Typography>
            )}
            {discountPercent > 0 && (
              <>
                <Typography variant="subtitle1" color="success.main" gutterBottom>
                  Discount ({(discountPercent * 100).toFixed(0)}%): -${discountAmount.toLocaleString()}
                </Typography>
                <Divider sx={{ my: 1 }} />
              </>
            )}
            <Typography variant="h6">
              Total: ${total.toLocaleString()}
            </Typography>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              color="primary"
              onClick={handleCheckout}
              disabled={items.length === 0}
            >
              Checkout
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default Cart;
