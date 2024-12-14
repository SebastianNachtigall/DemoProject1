import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  FormControlLabel,
  Checkbox,
  Typography,
  Box,
  TextField,
} from '@mui/material'

interface Prop {
  id: number;
  name: string;
  description: string;
  price: number;
  category: string;
  images: { id: number; image_url: string; order: number }[];
}

interface AddToCartModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (quantity: number, includePrintedVersion: boolean) => void;
  prop: Prop;
}

const AddToCartModal: React.FC<AddToCartModalProps> = ({
  open,
  onClose,
  onSubmit,
  prop,
}) => {
  const [includePrintedVersion, setIncludePrintedVersion] = useState(false)
  const [quantity, setQuantity] = useState(1)

  const handleConfirm = () => {
    onSubmit(quantity, includePrintedVersion)
    onClose()
  }

  const calculateTotal = () => {
    const basePrice = prop.price * quantity
    const printingCost = includePrintedVersion ? (prop.price * 0.2) * quantity : 0
    return basePrice + printingCost
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add to Cart - {prop.name}</DialogTitle>
      <DialogContent>
        <Box sx={{ mb: 3 }}>
          <TextField
            type="number"
            label="Quantity"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            inputProps={{ min: 1 }}
            fullWidth
            sx={{ mt: 2 }}
          />
        </Box>
        <FormControlLabel
          control={
            <Checkbox
              checked={includePrintedVersion}
              onChange={(e) => setIncludePrintedVersion(e.target.checked)}
            />
          }
          label="Include printed version (+20% cost)"
        />
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Base price: ${(prop.price * quantity).toFixed(2)}
          </Typography>
          {includePrintedVersion && (
            <Typography variant="body2" color="text.secondary">
              Printing cost: ${((prop.price * 0.2) * quantity).toFixed(2)}
            </Typography>
          )}
          <Typography variant="h6" sx={{ mt: 1 }}>
            Total: ${calculateTotal().toFixed(2)}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleConfirm} variant="contained" color="primary">
          Add to Cart
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default AddToCartModal
