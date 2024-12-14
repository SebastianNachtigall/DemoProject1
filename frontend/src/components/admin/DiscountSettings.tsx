import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Alert,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import { API_BASE_URL } from '../../config';

interface DiscountSettingsData {
  tier1_quantity: number;
  tier1_discount: number;
  tier2_quantity: number;
  tier2_discount: number;
}

interface DiscountSettingsProps {
  open: boolean;
  onClose: () => void;
}

const DiscountSettings: React.FC<DiscountSettingsProps> = ({ open, onClose }) => {
  const [settings, setSettings] = useState<DiscountSettingsData>({
    tier1_quantity: 5,
    tier1_discount: 0.05,
    tier2_quantity: 10,
    tier2_discount: 0.10,
  });
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/discount-settings`);
      if (!response.ok) throw new Error('Failed to fetch discount settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching discount settings:', error);
      setMessage({ text: 'Failed to load discount settings', type: 'error' });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/discount-settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      const data = await response.json();
      setMessage({ text: data.message, type: 'success' });
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error updating discount settings:', error);
      setMessage({ text: 'Failed to update discount settings', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof DiscountSettingsData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = field.includes('discount') 
      ? parseFloat(e.target.value) / 100 // Convert percentage to decimal
      : parseInt(e.target.value);
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Discount Settings</DialogTitle>
      <DialogContent>
        {message && (
          <Alert severity={message.type} sx={{ mb: 2 }}>
            {message.text}
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Box sx={{ display: 'grid', gap: 3, mt: 2 }}>
            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="h6">Tier 1 Discount</Typography>
              <TextField
                label="Minimum Quantity"
                type="number"
                value={settings.tier1_quantity}
                onChange={handleInputChange('tier1_quantity')}
                inputProps={{ min: 1 }}
                required
              />
              <TextField
                label="Discount Percentage"
                type="number"
                value={settings.tier1_discount * 100}
                onChange={handleInputChange('tier1_discount')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 100, step: 1 }}
                required
              />
            </Box>

            <Box sx={{ display: 'grid', gap: 2 }}>
              <Typography variant="h6">Tier 2 Discount</Typography>
              <TextField
                label="Minimum Quantity"
                type="number"
                value={settings.tier2_quantity}
                onChange={handleInputChange('tier2_quantity')}
                inputProps={{ min: settings.tier1_quantity + 1 }}
                required
              />
              <TextField
                label="Discount Percentage"
                type="number"
                value={settings.tier2_discount * 100}
                onChange={handleInputChange('tier2_discount')}
                InputProps={{
                  endAdornment: <InputAdornment position="end">%</InputAdornment>,
                }}
                inputProps={{ min: 0, max: 100, step: 1 }}
                required
              />
            </Box>
          </Box>
        </form>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          color="primary"
          disabled={loading}
        >
          {loading ? 'Saving...' : 'Save Settings'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default DiscountSettings;
