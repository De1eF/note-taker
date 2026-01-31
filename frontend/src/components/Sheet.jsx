import React, { useState, useRef, useEffect } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, IconButton, TextField, Typography, Box, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ReactMarkdown from 'react-markdown';

export default function Sheet({ data, onUpdate, onDuplicate, onDelete, onDrag }) {
  // Content Editing State
  const [isEditingContent, setIsEditingContent] = useState(false);
  const [localContent, setLocalContent] = useState(data.content);
  
  // Title Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(data.title);

  const [collapsed, setCollapsed] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const nodeRef = useRef(null);

  // Sync local state if data changes from server (e.g. duplication)
  useEffect(() => {
    setLocalTitle(data.title);
    setLocalContent(data.content);
  }, [data.title, data.content]);

  // --- Handlers ---

  const handleContentBlur = () => {
    setIsEditingContent(false);
    if (localContent !== data.content) {
      onUpdate(data._id, { content: localContent });
    }
  };

  const handleTitleBlur = () => {
    setIsEditingTitle(false);
    if (localTitle !== data.title) {
      onUpdate(data._id, { title: localTitle });
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleTitleBlur();
    }
  };

  const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  // --- Styles ---

  const dotStyle = {
    width: 12,
    height: 12,
    borderRadius: '50%',
    backgroundColor: '#1976d2',
    position: 'absolute',
    right: -6,
    // FIX: Changed from '50%' to fixed '60px' so it matches the line
    top: '70px', 
    cursor: 'pointer',
    zIndex: 10
  };

    // ... rest of the file

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={{ x: data.positionInSpace.x, y: data.positionInSpace.y }}
      onStop={(e, ui) => onDrag(data._id, { x: ui.x, y: ui.y })}
    >
      <div ref={nodeRef} style={{ position: 'absolute', zIndex: 5 }}>
        
        {/* Connection Dot */}
        <div className="connection-dot" id={`dot-${data._id}`} style={dotStyle} title="Connection Point" />

        <Card 
          sx={{ 
            width: 300, 
            opacity: collapsed ? 0.9 : 1,
            height: collapsed ? 'auto' : 'auto',
            overflow: 'visible'
          }}
          elevation={4}
        >
          {/* Header / Drag Handle */}
          <Box 
            className="drag-handle"
            sx={{ 
              p: 1, 
              bgcolor: 'primary.main', 
              color: 'white',
              cursor: 'move', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.1)'
            }}
          >
             {isEditingTitle ? (
               <TextField 
                 value={localTitle}
                 onChange={(e) => setLocalTitle(e.target.value)}
                 onBlur={handleTitleBlur}
                 onKeyDown={handleTitleKeyDown}
                 autoFocus
                 variant="standard"
                 InputProps={{ 
                   disableUnderline: true,
                   style: { color: 'white', fontSize: '0.875rem', fontWeight: 500 } 
                 }}
                 // Stop drag propagation so we can select text
                 onMouseDown={(e) => e.stopPropagation()} 
                 size="small"
                 fullWidth
               />
             ) : (
               <Typography 
                 variant="subtitle2" 
                 noWrap 
                 sx={{ maxWidth: 180, cursor: 'text' }}
                 onDoubleClick={() => setIsEditingTitle(true)}
                 title="Double-click to rename"
               >
                 {data.title}
               </Typography>
             )}
             
             <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: 'white', padding: 0.5 }}>
                  {collapsed ? <UnfoldMoreIcon fontSize="small"/> : <UnfoldLessIcon fontSize="small"/>}
                </IconButton>
                <IconButton size="small" onClick={handleMenuClick} sx={{ color: 'white', padding: 0.5, ml: 0.5 }}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
             </Box>
          </Box>

          {/* Context Menu */}
          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
            <MenuItem onClick={() => { onDuplicate(data._id); handleMenuClose(); }}>
              <ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> Duplicate
            </MenuItem>
            <MenuItem onClick={() => { onDelete(data._id); handleMenuClose(); }}>
              <DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Delete
            </MenuItem>
          </Menu>

          {/* Body Content */}
          {!collapsed && (
            <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
              {isEditingContent ? (
                <TextField
                  fullWidth
                  multiline
                  minRows={4}
                  maxRows={12}
                  value={localContent}
                  onChange={(e) => setLocalContent(e.target.value)}
                  onBlur={handleContentBlur}
                  autoFocus
                  variant="outlined"
                  size="small"
                  sx={{ bgcolor: '#fff' }}
                />
              ) : (
                <Box 
                  onClick={() => setIsEditingContent(true)} 
                  sx={{ 
                    minHeight: 100, 
                    cursor: 'text', 
                    fontSize: '0.9rem',
                    color: 'text.secondary',
                    '& p': { margin: '0.5em 0' } 
                  }}
                >
                  <ReactMarkdown>{data.content || "*Click to add markdown...*"}</ReactMarkdown>
                </Box>
              )}
            </CardContent>
          )}
        </Card>
      </div>
    </Draggable>
  );
}