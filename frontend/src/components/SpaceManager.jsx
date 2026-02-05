import React, { useState } from 'react';
import { 
  Box, Button, Menu, MenuItem, IconButton, Typography, Divider, ListItemIcon, ListItemText 
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';

export default function SpaceManager({ spaces, currentSpace, onSwitch, onCreate, onDelete }) {
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const spacesLoaded = Array.isArray(spaces);
  const hasSpaces = spacesLoaded && spaces.length > 0;

  const handleClick = (event) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleCreateClick = () => {
    const name = prompt("Enter name for new space:", "New Space");
    if (name) onCreate(name);
    handleClose();
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000 }}>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<LayersIcon />}
        onClick={handleClick}
        sx={{ 
          bgcolor: 'background.paper', 
          color: 'text.primary',
          borderRadius: 2,
          textTransform: 'none',
          fontWeight: 'bold',
          boxShadow: 3,
          '&:hover': { bgcolor: 'background.paper', opacity: 0.9 }
        }}
      >
        {currentSpace ? currentSpace.name : (spacesLoaded && !hasSpaces ? "Create a space" : "Loading...")}
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: 200, mb: 1 } }}
      >
        <Box sx={{ p: 1, px: 2, typography: 'caption', color: 'text.secondary', fontWeight: 'bold' }}>
            YOUR SPACES
        </Box>
        
        {spaces.map(space => (
          <MenuItem 
            key={space._id} 
            selected={currentSpace && currentSpace._id === space._id}
            onClick={() => { onSwitch(space); handleClose(); }}
            sx={{ display: 'flex', justifyContent: 'space-between' }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {currentSpace && currentSpace._id === space._id && <CheckIcon fontSize="small" sx={{ mr: 1, fontSize: 16 }} />}
                <ListItemText primary={space.name} />
            </Box>
            
            <IconButton 
                size="small" 
                onClick={(e) => { e.stopPropagation(); onDelete(space._id); }}
                sx={{ ml: 1, opacity: 0.5, '&:hover': { opacity: 1, color: 'error.main' } }}
            >
                <DeleteIcon fontSize="small" />
            </IconButton>
          </MenuItem>
        ))}
        
        <Divider />
        
        <MenuItem onClick={handleCreateClick} sx={{ color: 'primary.main' }}>
            <ListItemIcon><AddIcon fontSize="small" color="primary" /></ListItemIcon>
            <ListItemText primary="Create New Space" />
        </MenuItem>
      </Menu>
    </Box>
  );
}
