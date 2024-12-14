import React from 'react'
import { AppBar, Toolbar, Typography, Button, Badge } from '@mui/material'
import { Link as RouterLink } from 'react-router-dom'
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import { useCart } from '../context/CartContext'

const Navbar = () => {
  const { items } = useCart()

  const cartItemCount = items.reduce((total, item) => total + item.quantity, 0)

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography
          variant="h6"
          component={RouterLink}
          to="/"
          sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}
        >
          Movie Props Shop
        </Typography>
        <Button
          color="inherit"
          component={RouterLink}
          to="/admin"
          startIcon={<AdminPanelSettingsIcon />}
          sx={{ mr: 2 }}
        >
          Admin
        </Button>
        <Button
          color="inherit"
          component={RouterLink}
          to="/cart"
          startIcon={
            <Badge badgeContent={cartItemCount} color="error">
              <ShoppingCartIcon />
            </Badge>
          }
        >
          Cart
        </Button>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar
