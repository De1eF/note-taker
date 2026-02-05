import React, { useState, useEffect } from 'react';
// NEW: Import useTheme to detect Light/Dark mode
import { useTheme } from '@mui/material/styles';
import { Box, Typography, IconButton, Menu, MenuItem, TextField, Divider, Tooltip } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import FormatColorFillIcon from '@mui/icons-material/FormatColorFill';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';

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
  title, width, collapsed, setCollapsed, color, 
  onTitleChange, onColorChange, onDuplicate, onDelete, onCreateHelp
}) {
  const MAX_TITLE_LENGTH = 20;
  const theme = useTheme(); // Hook to access theme
  const [anchorEl, setAnchorEl] = useState(null);
  const [localTitle, setLocalTitle] = useState(title);

  useEffect(() => { setLocalTitle(title); }, [title]);

  const handleMenuOpen = (e) => { e.stopPropagation(); setAnchorEl(e.currentTarget); };
  const handleMenuClose = () => setAnchorEl(null);
  const commitTitle = () => {
    const trimmed = (localTitle || '').trim().slice(0, MAX_TITLE_LENGTH);
    if (trimmed !== title) onTitleChange(trimmed);
  };
  const handleTitleBlur = () => commitTitle();
  const handleTitleKeyDown = (e) => { if (e.key === 'Enter') commitTitle(); };

  // --- STYLE LOGIC ---
  const isDefault = !color || color === 'default';
  const isDarkMode = theme.palette.mode === 'dark';

  const headerBg = isDefault ? 'primary.main' : color;
  
  const headerText = (isDefault && !isDarkMode) ? 'white' : '#000000';
  const titleLength = (localTitle || '').length;
  const titleFontSize = titleLength > 16 ? '0.72rem' : titleLength > 12 ? '0.78rem' : '0.875rem';

  return (
    <>
      <Box 
        sx={{ 
          p: 1, 
          bgcolor: headerBg, 
          color: headerText,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0,
          transition: 'background-color 0.3s',
          position: 'relative'
        }}
      >
        <Box
          className="drag-handle"
          aria-label="Drag sheet"
          sx={{
            position: 'absolute',
            left: '50%',
            top: 0,
            bottom: 0,
            transform: 'translateX(-50%)',
            width: 140,
            height: '100%',
            borderRadius: 12,
            bgcolor: 'transparent',
            cursor: 'grab',
            transition: 'background-color 120ms, box-shadow 120ms',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            '&:hover': {
              '& .drag-handle-pill': {
                bgcolor: 'rgba(0,0,0,0.28)',
                boxShadow: '0 0 0 2px rgba(255,255,255,0.25)'
              }
            },
            '&:active': {
              cursor: 'grabbing',
              '& .drag-handle-pill': {
                bgcolor: 'rgba(0,0,0,0.35)',
                boxShadow: '0 0 0 3px rgba(255,255,255,0.35)'
              }
            }
          }}
        >
          <Box
            className="drag-handle-pill"
            sx={{
              width: 44,
              height: 10,
              borderRadius: 6,
              bgcolor: 'rgba(0,0,0,0.18)',
              transition: 'background-color 120ms, box-shadow 120ms',
              pointerEvents: 'none'
            }}
          />
        </Box>
        <Box sx={{ flex: '0 1 55%', minWidth: 140 }}>
          <TextField 
              value={localTitle} onChange={(e) => setLocalTitle(e.target.value.slice(0, MAX_TITLE_LENGTH))}
              onBlur={handleTitleBlur} onKeyDown={handleTitleKeyDown}
              variant="standard" size="small" fullWidth
              onMouseDown={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="no-drag"
              InputProps={{ 
                  disableUnderline: true,
                  style: { 
                      color: headerText, 
                      fontSize: titleFontSize, 
                      fontWeight: 600,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                  } 
              }}
              inputProps={{ maxLength: MAX_TITLE_LENGTH }}
          />
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setCollapsed(!collapsed); }} sx={{ color: headerText, p: 0.5 }}>
            {collapsed ? <UnfoldMoreIcon fontSize="small"/> : <UnfoldLessIcon fontSize="small"/>}
          </IconButton>
          <IconButton size="small" onClick={handleMenuOpen} sx={{ color: headerText, p: 0.5 }}>
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Box>
      </Box>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} onClick={(e) => e.stopPropagation()} MenuListProps={{ sx: { py: 0.5 } }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1.5, pt: 1, pb: 0.5 }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase' }}>
            Sheet actions
          </Typography>
          <IconButton
            size="small"
            onClick={() => {
              onCreateHelp?.();
              handleMenuClose();
            }}
            title="Help"
            sx={{ gap: 0.5 }}
          >
            <HelpOutlineIcon fontSize="small" />
            <Typography variant="caption" sx={{ fontWeight: 600 }}>
              Help
            </Typography>
          </IconButton>
        </Box>
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
                                cursor: 'pointer', border: '1px solid rgba(0,0,0,0.1)',
                                '&:hover': { transform: 'scale(1.2)', boxShadow: 1 }, transition: 'all 0.1s'
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
