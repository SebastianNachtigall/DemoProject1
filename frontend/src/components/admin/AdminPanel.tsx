import React, { useState, useEffect, useRef } from 'react'
import {
  Container,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  Box
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FileUploadIcon from '@mui/icons-material/FileUpload'
import PropForm from './PropForm'
import DiscountSettings from './DiscountSettings'
import EmailSettings from './EmailSettings'
import PrintNotifications from './PrintNotifications'
import axios from 'axios'
import { API_BASE_URL } from '../../config'

interface PropImage {
  id: number;
  image_url: string;
  order: number;
}

interface MovieProp {
  id: number;
  name: string;
  description: string;
  price: number;
  print_cost: number;
  category: string;
  images: PropImage[];
}

const AdminPanel = () => {
  const [props, setProps] = useState<MovieProp[]>([])
  const [openDialog, setOpenDialog] = useState(false)
  const [selectedProp, setSelectedProp] = useState<MovieProp | null>(null)
  const [message, setMessage] = useState<string>('')
  const [isDiscountSettingsOpen, setIsDiscountSettingsOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchProps = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/props`)
      setProps(response.data)
    } catch (error) {
      console.error('Error fetching props:', error)
    }
  }

  useEffect(() => {
    fetchProps()
  }, [])

  const handleEdit = (prop: MovieProp) => {
    setSelectedProp(prop)
    setOpenDialog(true)
  }

  const handleAdd = () => {
    setSelectedProp(null)
    setOpenDialog(true)
  }

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this prop?')) {
      try {
        await axios.delete(`${API_BASE_URL}/api/admin/props/${id}`)
        fetchProps()
      } catch (error) {
        console.error('Error deleting prop:', error)
      }
    }
  }

  const handleSave = async (formData: any) => {
    try {
      const propData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        print_cost: parseFloat(formData.print_cost),
        category: formData.category,
        images: formData.images.filter((url: string) => url.trim() !== '')
      };

      if (selectedProp) {
        // Update existing prop
        await axios.put(`${API_BASE_URL}/api/admin/props/${selectedProp.id}`, propData)
      } else {
        // Create new prop
        await axios.post(`${API_BASE_URL}/api/admin/props`, propData)
      }
      setOpenDialog(false)
      fetchProps()
    } catch (error) {
      console.error('Error saving prop:', error)
    }
  }

  const handleExport = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/export`)
      const data = await response.json()
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `movie-props-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      setMessage('Database exported successfully!')
      setTimeout(() => setMessage(''), 3000)
    } catch (error) {
      console.error('Error exporting database:', error)
      setMessage('Error exporting database')
      setTimeout(() => setMessage(''), 3000)
    }
  }

  const handleImportClick = () => {
    fileInputRef.current?.click()
  }

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const jsonData = JSON.parse(e.target?.result as string)
          
          const response = await fetch(`${API_BASE_URL}/api/admin/import`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(jsonData)
          })

          const result = await response.json()
          
          if (response.ok) {
            setMessage('Database imported successfully!')
            // Refresh the props list
            window.location.reload()
          } else {
            throw new Error(result.error || 'Import failed')
          }
        } catch (error) {
          console.error('Error importing database:', error)
          setMessage(error instanceof Error ? error.message : 'Error importing database')
        }
      }
      reader.readAsText(file)
    } catch (error) {
      console.error('Error reading file:', error)
      setMessage('Error reading file')
    }
    
    // Clear the file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    
    setTimeout(() => setMessage(''), 3000)
  }

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Admin Panel
      </Typography>
      
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => setIsDiscountSettingsOpen(true)}
          >
            Manage Discounts
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleExport}
            startIcon={<FileDownloadIcon />}
          >
            Export Database
          </Button>
          <Button 
            variant="contained" 
            color="primary"
            onClick={handleImportClick}
            startIcon={<FileUploadIcon />}
          >
            Import Database
          </Button>
          <input
            type="file"
            ref={fileInputRef}
            style={{ display: 'none' }}
            accept=".json"
            onChange={handleImport}
          />
        </Box>
      </Box>

      <Typography variant="h5" gutterBottom>
        Manage Props
      </Typography>
      
      <Box sx={{ mb: 4 }}>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ mb: 3 }}
        >
          Add New Prop
        </Button>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Description</TableCell>
                <TableCell>Price</TableCell>
                <TableCell>Print Cost</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {props.map((prop) => (
                <TableRow key={prop.id}>
                  <TableCell>{prop.name}</TableCell>
                  <TableCell>{prop.description}</TableCell>
                  <TableCell>${prop.price}</TableCell>
                  <TableCell>${prop.print_cost}</TableCell>
                  <TableCell>{prop.category}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleEdit(prop)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(prop.id)} color="error">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      {message && (
        <Typography 
          color={message.includes('Error') ? 'error' : 'success'} 
          sx={{ mb: 2 }}
        >
          {message}
        </Typography>
      )}
      <DiscountSettings 
        open={isDiscountSettingsOpen}
        onClose={() => setIsDiscountSettingsOpen(false)}
      />
      <EmailSettings />
      <PrintNotifications />
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <PropForm
          initialData={selectedProp || undefined}
          onSubmit={handleSave}
          submitButtonText={selectedProp ? 'Update Prop' : 'Create Prop'}
        />
      </Dialog>
    </Container>
  )
}

export default AdminPanel
