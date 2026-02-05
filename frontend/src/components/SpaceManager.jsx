import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, Button, Menu, MenuItem, IconButton, Typography, Divider, ListItemIcon, ListItemText, TextField
} from '@mui/material';
import LayersIcon from '@mui/icons-material/Layers';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';

export default function SpaceManager({ spaces, currentSpace, onSwitch, onCreate, onDelete, onRename }) {
  const MAX_SPACE_NAME_LENGTH = 20;
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);
  const spacesLoaded = Array.isArray(spaces);
  const hasSpaces = spacesLoaded && spaces.length > 0;
  const anchorRef = useRef(null);
  const [localName, setLocalName] = useState(currentSpace?.name || '');

  useEffect(() => {
    setLocalName(currentSpace?.name || '');
  }, [currentSpace?._id]);

  useEffect(() => {
    if (open) setLocalName(currentSpace?.name || '');
  }, [open, currentSpace?.name]);

  const handleClick = () => setAnchorEl(anchorRef.current);
  const handleClose = () => setAnchorEl(null);

  const handleCreateClick = () => {
    const raw = prompt("Enter name for new space:", "New Space");
    const name = raw ? raw.trim().slice(0, MAX_SPACE_NAME_LENGTH) : '';
    if (name) onCreate(name);
    handleClose();
  };

  const commitRename = () => {
    if (!currentSpace || !onRename) return;
    const trimmed = localName.trim().slice(0, MAX_SPACE_NAME_LENGTH);
    if (!trimmed || trimmed === currentSpace.name) return;
    onRename(currentSpace._id, trimmed);
  };

  const handleNameBlur = () => commitRename();

  const handleNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
      e.currentTarget.blur();
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setLocalName(currentSpace?.name || '');
      e.currentTarget.blur();
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 20, left: 20, zIndex: 1000 }} ref={anchorRef}>
      {open ? (
        <TextField
          value={localName}
          onChange={(e) => setLocalName(e.target.value.slice(0, MAX_SPACE_NAME_LENGTH))}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
          autoFocus
          size="small"
          variant="outlined"
          InputProps={{
            startAdornment: <LayersIcon sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
          inputProps={{ maxLength: MAX_SPACE_NAME_LENGTH }}
          sx={{
            minWidth: 220,
            bgcolor: 'background.paper',
            borderRadius: 2,
            boxShadow: 3,
            '& .MuiOutlinedInput-root': {
              borderRadius: 2,
              fontWeight: 'bold',
            },
          }}
        />
      ) : (
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
      )}

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={() => {}}
        hideBackdrop
        disableEnforceFocus
        disableAutoFocus
        disableRestoreFocus
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        PaperProps={{ sx: { minWidth: 220, mb: 1, pointerEvents: 'auto' } }}
        slotProps={{
          root: { sx: { pointerEvents: 'none' } },
          paper: { sx: { pointerEvents: 'auto' } },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, pt: 1, pb: 0.5 }}>
          <Box sx={{ typography: 'caption', color: 'text.secondary', fontWeight: 'bold' }}>
            YOUR SPACES
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            sx={{ color: 'text.secondary' }}
            aria-label="Close spaces"
          >
            <CloseIcon fontSize="small" />
          </IconButton>
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
