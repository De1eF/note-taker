import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Menu, MenuItem, TextField, Divider, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';

// Predefined Palette
const COLORS = [
  { name: 'Default', value: 'default' },
  { name: 'Red', value: '#ffcdd2' },
  { name: 'Orange', value: '#ffe0b2' },
  { name: 'Yellow', value: '#fff9c4' },
  { name: 'Green', value: '#c8e6c9' },
  { name: 'Blue', value: '#bbdefb' },
  { name: 'Purple', value: '#e1bee7' },
];

export default function SheetHeader({ 
  title, 
  width, 
  collapsed, 
  setCollapsed, 
  color, // NEW: Receive the specific sheet color
  onTitleChange, 
  onColorChange, 
  onDuplicate, 
  onDelete 
}) {
  const [anchorEl, setAnchorEl] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [localTitle, setLocalTitle] = useState(title);

  useEffect(() => { setLocalTitle(title); }, [title]);

  const handleMenuOpen = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const handleMenuClose = () => setAnchorEl(null);
  const handleTitleBlur = () => { setIsEditing(false); if (localTitle !== title) onTitleChange(localTitle); };
  const handleTitleKeyDown = (e) => { if (e.key === 'Enter') handleTitleBlur(); };

  // Determine Styles based on "Default" vs "Custom Color"
  const isDefault = !color || color === 'default';
  const headerBg = isDefault ? 'primary.main' : color;
  const headerText = isDefault ? 'white' : 'rgba(0,0,0,0.87)'; // White for Blue, Black for Pastels

  return (
    <>
      <Box 
        className="drag-handle"
        sx={{ 
          p: 1, 
          bgcolor: headerBg, // Apply Color
          color: headerText, // Apply Text Color
          cursor: 'move', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
          transition: 'background-color 0.3s'
        }}
      >
        {isEditing ? (
            <TextField 
                value={localTitle} onChange={(e) => setLocalTitle(e.target.value)}
                onBlur={handleTitleBlur} onKeyDown={handleTitleKeyDown}
                autoFocus variant="standard" size="small" fullWidth
                onMouseDown={(e) => e.stopPropagation()} 
                InputProps={{ 
                    disableUnderline: true,
                    style: { color: headerText, fontSize: '0.875rem', fontWeight: 500 } 
                }}
            />
        ) : (
            <Typography 
                variant="subtitle2" noWrap sx={{ maxWidth: width - 80, cursor: 'text' }}
                onDoubleClick={(e) => { e.stopPropagation(); setIsEditing(true); }}
                title="Double-click to rename"
            >
                {title}
            </Typography>
        )}
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton 
            size="small" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }} 
            sx={{ color: headerText, p: 0.5 }}
          >
            {collapsed ? <UnfoldMoreIcon fontSize="small"/> : <UnfoldLessIcon fontSize="small"/>}
          </IconButton>
          
          <IconButton size="small" onClick={handleMenuOpen} sx={{ color: headerText, p: 0.5 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Menu 
        anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} onClick={(e) => e.stopPropagation()} 
        MenuListProps={{ sx: { py: 0.5 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, color: 'text.secondary', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                <FormatColorFillIcon sx={{ fontSize: 16, mr: 1 }} /> Color
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
                {COLORS.map((c) => (
                    <Tooltip key={c.name} title={c.name}>
                        <Box
                            onClick={() => { onColorChange(c.value); handleMenuClose(); }}
                            sx={{
                                width: 20, height: 20, borderRadius: '50%',
                                bgcolor: c.value === 'default' ? '#e0e0e0' : c.value,
                                cursor: 'pointer',
                                border: '1px solid rgba(0,0,0,0.1)',
                                '&:hover': { transform: 'scale(1.2)', boxShadow: 1 },
                                transition: 'all 0.1s'
                            }}
                        />
                    </Tooltip>
                ))}
            </Box>
        </Box>
        <Divider />
        <MenuItem onClick={() => { onDuplicate(); handleMenuClose(); }}><ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> Duplicate</MenuItem>
        <MenuItem onClick={() => { onDelete(); handleMenuClose(); }}><DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Delete</MenuItem>
      </Menu>
    </>
  );
}
