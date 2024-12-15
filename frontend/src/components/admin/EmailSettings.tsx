import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  FormControlLabel,
  Switch,
  Alert,
  Snackbar
} from '@mui/material';
import { API_BASE_URL } from '../../config';

interface EmailSettings {
  notification_email: string;
  smtp_server: string;
  smtp_port: number;
  smtp_username: string;
  smtp_password?: string;
  smtp_use_tls: boolean;
}

const EmailSettingsComponent: React.FC = () => {
  const [settings, setSettings] = useState<EmailSettings>({
    notification_email: '',
    smtp_server: '',
    smtp_port: 587,
    smtp_username: '',
    smtp_use_tls: true
  });
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showErrorMessage, setShowErrorMessage] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`);
      if (!response.ok) throw new Error('Failed to fetch settings');
      const data = await response.json();
      setSettings(data);
    } catch (error) {
      console.error('Error fetching settings:', error);
      setErrorMessage('Failed to load settings');
      setShowErrorMessage(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`${API_BASE_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });
      
      if (!response.ok) throw new Error('Failed to update settings');
      
      setShowSuccessMessage(true);
    } catch (error) {
      console.error('Error updating settings:', error);
      setErrorMessage('Failed to update settings');
      setShowErrorMessage(true);
    }
  };

  const handleChange = (field: keyof EmailSettings) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    setSettings(prev => ({
      ...prev,
      [field]: field === 'smtp_port' ? parseInt(value as string, 10) || 0 : value
    }));
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Email Notification Settings
      </Typography>
      
      <form onSubmit={handleSubmit}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Notification Email"
            value={settings.notification_email}
            onChange={handleChange('notification_email')}
            fullWidth
            required
          />
          
          <TextField
            label="SMTP Server"
            value={settings.smtp_server}
            onChange={handleChange('smtp_server')}
            fullWidth
            required
          />
          
          <TextField
            label="SMTP Port"
            type="number"
            value={settings.smtp_port}
            onChange={handleChange('smtp_port')}
            fullWidth
            required
          />
          
          <TextField
            label="SMTP Username"
            value={settings.smtp_username}
            onChange={handleChange('smtp_username')}
            fullWidth
            required
          />
          
          <TextField
            label="SMTP Password"
            type="password"
            value={settings.smtp_password || ''}
            onChange={handleChange('smtp_password')}
            fullWidth
            placeholder="Leave empty to keep existing password"
          />
          
          <FormControlLabel
            control={
              <Switch
                checked={settings.smtp_use_tls}
                onChange={handleChange('smtp_use_tls')}
              />
            }
            label="Use TLS"
          />
          
          <Button
            type="submit"
            variant="contained"
            color="primary"
            sx={{ mt: 2 }}
          >
            Save Settings
          </Button>
        </Box>
      </form>

      <Snackbar
        open={showSuccessMessage}
        autoHideDuration={6000}
        onClose={() => setShowSuccessMessage(false)}
      >
        <Alert severity="success" onClose={() => setShowSuccessMessage(false)}>
          Settings updated successfully
        </Alert>
      </Snackbar>

      <Snackbar
        open={showErrorMessage}
        autoHideDuration={6000}
        onClose={() => setShowErrorMessage(false)}
      >
        <Alert severity="error" onClose={() => setShowErrorMessage(false)}>
          {errorMessage}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default EmailSettingsComponent;
