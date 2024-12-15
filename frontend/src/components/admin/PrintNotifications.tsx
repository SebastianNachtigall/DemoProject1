import React, { useState, useEffect } from 'react';
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Box,
  Alert,
  Snackbar
} from '@mui/material';
import { PictureAsPdf as PdfIcon } from '@mui/icons-material';
import { API_BASE_URL } from '../../config';

interface PrintNotification {
  id: number;
  order_number: string;
  order_date: string;
  customer_name: string;
  customer_email: string;
  total_print_cost: number;
}

const PrintNotifications: React.FC = () => {
  const [notifications, setNotifications] = useState<PrintNotification[]>([]);
  const [error, setError] = useState<string>('');
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/print-notifications`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      setNotifications(data);
    } catch (error) {
      setError('Failed to load print notifications');
      setShowError(true);
    }
  };

  const downloadPdf = async (id: number) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/print-notifications/${id}/pdf`);
      if (!response.ok) throw new Error('Failed to download PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `print_notification_${id}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setError('Failed to download PDF');
      setShowError(true);
    }
  };

  return (
    <Paper sx={{ p: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom>
        Print Notifications
      </Typography>

      <TableContainer>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Order #</TableCell>
              <TableCell>Order Date</TableCell>
              <TableCell>Customer Name</TableCell>
              <TableCell>Customer Email</TableCell>
              <TableCell>Total Print Cost</TableCell>
              <TableCell align="center">PDF</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {notifications.map((notification) => (
              <TableRow key={notification.id}>
                <TableCell>{notification.order_number}</TableCell>
                <TableCell>
                  {new Date(notification.order_date).toLocaleString()}
                </TableCell>
                <TableCell>{notification.customer_name}</TableCell>
                <TableCell>{notification.customer_email}</TableCell>
                <TableCell>${notification.total_print_cost.toFixed(2)}</TableCell>
                <TableCell align="center">
                  <IconButton
                    color="primary"
                    onClick={() => downloadPdf(notification.id)}
                    title="Download PDF"
                  >
                    <PdfIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
            {notifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center">
                  No print notifications found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={() => setShowError(false)}
      >
        <Alert severity="error" onClose={() => setShowError(false)}>
          {error}
        </Alert>
      </Snackbar>
    </Paper>
  );
};

export default PrintNotifications;
