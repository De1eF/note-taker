import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, TextField } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';

export default function SheetHeader({ 
  title, 
  width, 
  collapsed, 
  setCollapsed, 
  onTitleChange, // New prop for saving title
  onDuplicate, 
  onDelete 
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  
  // Title Editing State
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);

  useEffect(() => { setLocalTitle(title); }, [title]);

  const handleMenuOpen = (event) => {
    event.stopPropagation(); 
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  // --- Title Handlers ---
  const handleTitleBlur = () => {
    setIsEditing(false);
    if (localTitle !== title) {
      onTitleChange(localTitle);
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  return (
    <>
      <Box 
        className="drag-handle"
        sx={{ 
          p: 1, bgcolor: 'primary.main', color: 'white', cursor: 'move', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0
        }}
      >
        {isEditing ? (
            <TextField 
                value={localTitle}
                onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur}
                onKeyDown={handleTitleKeyDown}
                autoFocus
                variant="standard"
                size="small"
                fullWidth
                // CRITICAL FIX: Stop drag propagation so we can type/select text
                onMouseDown={(e) => e.stopPropagation()} 
                InputProps={{ 
                    disableUnderline: true,
                    style: { color: 'white', fontSize: '0.875rem', fontWeight: 500 } 
                }}
            />
        ) : (
            <Typography 
                variant="subtitle2" 
                noWrap 
                sx={{ maxWidth: width - 80, cursor: 'text' }}
                // Enable editing on double click
                onDoubleClick={(e) => {
                    e.stopPropagation(); // Prevent drag on double click
                    setIsEditing(true);
                }}
                title="Double-click to rename"
            >
                {title}
            </Typography>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            size="small" 
            onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }} 
            sx={{ color: 'white', p: 0.5 }}
          >
            {collapsed ? <UnfoldMoreIcon fontSize="small"/> : <UnfoldLessIcon fontSize="small"/>}
          </IconButton>
          
          <IconButton 
            size="small" 
            onClick={handleMenuOpen} 
            sx={{ color: 'white', p: 0.5 }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Menu 
        anchorEl={anchorEl} 
        open={Boolean(anchorEl)} 
        onClose={handleMenuClose}
        onClick={(e) => e.stopPropagation()} 
      >
        <MenuItem onClick={() => { onDuplicate(); handleMenuClose(); }}>
          <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> Duplicate
        </MenuItem>
        <MenuItem onClick={() => { onDelete(); handleMenuClose(); }}>
          <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Delete
        </MenuItem>
      </Menu>
    </>
  );
}
