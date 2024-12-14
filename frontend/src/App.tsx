import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider, CssBaseline, Container, Box } from '@mui/material'
import { createTheme } from '@mui/material/styles'
import Navbar from './components/Navbar'
import Header from './components/Header'
import PropList from './components/PropList'
import Cart from './components/Cart'
import AdminPanel from './components/admin/AdminPanel'
import { CartProvider } from './context/CartContext'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#21274B', // Dark blue from logo
      light: '#4B5178',
      dark: '#161A31',
    },
    secondary: {
      main: '#EDEFF6', // Light blue/gray from logo
      light: '#F5F6FA',
      dark: '#D6D9E9',
    },
    background: {
      default: '#FFFFFF',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Helvetica Neue", Helvetica, Arial, sans-serif',
  },
})

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <CartProvider>
        <Router>
          <Box sx={{ 
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch'
          }}>
            <Header />
            <Navbar />
            <Container maxWidth={false} disableGutters>
              <Routes>
                <Route path="/" element={<PropList />} />
                <Route path="/cart" element={<Cart />} />
                <Route path="/admin" element={<AdminPanel />} />
              </Routes>
            </Container>
          </Box>
        </Router>
      </CartProvider>
    </ThemeProvider>
  )
}

export default App
