import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, IconButton, TextField, Typography, Box, Menu, MenuItem, Collapse } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import UnfoldLessIcon from '@mui/icons-material/UnfoldLess';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';

// --- Helper: Preserves visual spacing for Markdown ---
const preserveNewlines = (text) => {
  if (!text) return "";
  return text.replace(/\n(?=\n)/g, '\n&nbsp;\n');
};

// --- Parser Helper ---
const parseMarkdownBlocks = (text) => {
  if (!text) return [];
  const rawBlocks = text.split(/(?=^#{1,3}\s)/gm);
  return rawBlocks.map((chunk, index) => {
    const match = chunk.match(/^(#{1,3})\s+(.*)\n?([\s\S]*)$/);
    if (match) {
      return {
        id: index, type: 'section', level: match[1].length,
        title: match[2], body: match[3] || '', content: chunk
      };
    }
    return { id: index, type: 'intro', content: chunk };
  });
};

const EditableBlock = ({ block, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [text, setText] = useState(block.content);
  const [open, setOpen] = useState(true);

  useEffect(() => { setText(block.content); }, [block.content]);

  const handleBlur = () => { setIsEditing(false); onSave(text); };
  
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      const input = e.target;
      const { selectionStart } = input;
      const value = input.value;
      const lastNewLine = value.lastIndexOf('\n', selectionStart - 1);
      const currentLine = value.substring(lastNewLine + 1, selectionStart);
      const listMatch = currentLine.match(/^(\s*)([-*])\s/);

      if (listMatch) {
        e.preventDefault();
        const indent = listMatch[1];
        const bullet = listMatch[2];
        const insertion = `\n${indent}${bullet} `;
        const newValue = value.slice(0, selectionStart) + insertion + value.slice(selectionStart);
        setText(newValue);
        setTimeout(() => { input.selectionStart = input.selectionEnd = selectionStart + insertion.length; }, 0);
      }
    }
  };

  if (isEditing) {
    return (
      <Box sx={{ mb: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
        <TextField
          fullWidth multiline autoFocus value={text} onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur} onKeyDown={handleKeyDown} variant="standard"
          InputProps={{ disableUnderline: true }} sx={{ '& textarea': { fontSize: '0.9rem', lineHeight: 1.5 } }}
        />
      </Box>
    );
  }

  if (block.type === 'intro') {
    if (!block.content.trim()) return null; 
    return (
      <Box 
        onClick={() => setIsEditing(true)}
        sx={{ 
          cursor: 'text', mb: 2, minHeight: '20px', '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' },
          whiteSpace: 'pre-wrap', '& p': { margin: 0 } 
        }}
      >
        <ReactMarkdown>{preserveNewlines(block.content)}</ReactMarkdown>
      </Box>
    );
  }

  const variants = { 1: 'h5', 2: 'h6', 3: 'subtitle1' };
  const variant = variants[block.level] || 'body1';
  
  return (
    <Box sx={{ mb: 1 }}>
      <Box 
        sx={{ 
          display: 'flex', alignItems: 'center', cursor: 'pointer',
          mt: block.level === 1 ? 2 : 1, mb: 0.5, '&:hover .edit-icon': { opacity: 1 }
        }}
      >
        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setOpen(!open); }} sx={{ p: 0.5, mr: 0.5 }}>
          {open ? <KeyboardArrowDownIcon fontSize="small"/> : <KeyboardArrowRightIcon fontSize="small"/>}
        </IconButton>
        <Typography variant={variant} fontWeight="bold" sx={{ flexGrow: 1 }} onClick={() => setOpen(!open)}>
          {block.title}
        </Typography>
        <IconButton className="edit-icon" size="small" onClick={() => setIsEditing(true)} sx={{ opacity: 0, transition: 'opacity 0.2s' }}>
            <EditIcon fontSize="small" />
        </IconButton>
      </Box>
      <Collapse in={open}>
        <Box 
          onClick={() => setIsEditing(true)}
          sx={{ 
            pl: 2, borderLeft: '2px solid rgba(0,0,0,0.05)', cursor: 'text', minHeight: '20px',
            '&:hover': { bgcolor: 'rgba(0,0,0,0.02)' }, whiteSpace: 'pre-wrap',
            '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' }, '& li': { listStyleType: 'disc' },
            '& p': { margin: 0 }
          }}
        >
          <ReactMarkdown>{preserveNewlines(block.body || "*Click to add text...*")}</ReactMarkdown>
        </Box>
      </Collapse>
    </Box>
  );
};

// --- Main Sheet ---
export default function Sheet({ data, onUpdate, onDuplicate, onDelete, onDrag, scale }) {
  const [localContent, setLocalContent] = useState(data.content || "");
  const [collapsed, setCollapsed] = useState(false);
  // NEW: Local width state
  const [width, setWidth] = useState(data.width || 320);
  const [isResizing, setIsResizing] = useState(false);
  
  const [anchorEl, setAnchorEl] = useState(null);
  const nodeRef = useRef(null);

  useEffect(() => { setLocalContent(data.content || ""); }, [data.content]);
  useEffect(() => { if (data.width) setWidth(data.width); }, [data.width]);

  const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

  const handleBlockUpdate = (index, newBlockText) => {
    const newBlocks = [...blocks];
    newBlocks[index].content = newBlockText;
    const newFullText = newBlocks.map(b => b.content).join('');
    setLocalContent(newFullText);
    if (newFullText !== data.content) onUpdate(data._id, { content: newFullText });
  };

  const handleGlobalClick = () => {
    if (!localContent.trim()) handleBlockUpdate(0, "# New Section\nStart typing...");
  };

  // --- Resize Logic ---
  const handleResizeStart = (e) => {
    e.preventDefault();
    e.stopPropagation(); // Stop drag event
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = width;

    const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        // Adjust delta by the global zoom scale
        const newWidth = Math.max(200, startWidth + (deltaX / scale)); 
        setWidth(newWidth);
    };

    const handleMouseUp = () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setIsResizing(false);
        // Save final width
        onUpdate(data._id, { width: startWidth + ((e.clientX - startX) / scale) }); // approximate final calc, relying on state is safer
    };

    // Attach to document to handle fast movements
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // On Mouse Up helper (using current state)
  // The closure above might have stale state for 'width', so we actually
  // need to rely on the hook update, or re-calculate in the mouseup. 
  // Simplified: The onUpdate above in handleMouseUp will use the closure values.
  // To be perfectly accurate, we should use a ref for the current width or just trigger the update with the last calculated value.
  // Let's rely on the setWidth triggering a save on blur? No, explicit save is better.
  // Correct fix for closure trap:
  // We will just let the mouseMove update the visual state, and we need a way to trigger onUpdate with the *final* width.
  // Since we can't easily access the final 'width' state inside the closure created on mousedown without a Ref:
  
  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  const handleResizeStartOptimized = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startWidth = widthRef.current;

    const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(200, startWidth + (deltaX / scale));
        setWidth(newWidth);
    };

    const handleMouseUp = (upEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Calculate final width based on the last event to ensure sync
        const deltaX = upEvent.clientX - startX;
        const finalWidth = Math.max(200, startWidth + (deltaX / scale));
        
        onUpdate(data._id, { width: finalWidth });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const dotStyle = {
    width: 12, height: 12, borderRadius: '50%',
    backgroundColor: '#1976d2', position: 'absolute',
    right: -6, top: '67.5px', cursor: 'pointer', zIndex: 10
  };

  const resizeHandleStyle = {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px',
    cursor: 'ew-resize', zIndex: 20, 
    // Invisible until hovered or active
    opacity: isResizing ? 0 : 0, 
    '&:hover': { opacity: 1 } 
  };

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={{ x: data.positionInSpace.x, y: data.positionInSpace.y }}
      onStop={(e, ui) => onDrag(data._id, { x: ui.x, y: ui.y })}
      scale={scale}
      disabled={isResizing} // Disable dragging while resizing
    >
      <div ref={nodeRef} className="sheet-wrapper" style={{ position: 'absolute', zIndex: 5 }}>
        
        {/* Resize Handle Area (Invisible strip on the right) */}
        <div 
            onMouseDown={handleResizeStartOptimized}
            style={resizeHandleStyle}
            title="Drag to resize"
        />

        <div className="connection-dot" id={`dot-${data._id}`} style={dotStyle} />

        <Card 
          sx={{ 
            width: width, // Dynamic Width
            minHeight: 100, height: 'auto', 
            opacity: collapsed ? 0.9 : 1, display: 'flex', flexDirection: 'column',
            transition: isResizing ? 'none' : 'width 0.2s', // Smooth transition when not manually resizing
            position: 'relative'
          }}
          elevation={4}
        >
          {/* Visual Resize Bar (Thin gray line on the right edge) */}
          <Box sx={{ 
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', 
              bgcolor: 'transparent', 
              '&:hover': { bgcolor: 'primary.light' },
              cursor: 'ew-resize'
          }} onMouseDown={handleResizeStartOptimized} />

          <Box 
            className="drag-handle"
            sx={{ 
              p: 1, bgcolor: 'primary.main', color: 'white', cursor: 'move', 
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              borderBottom: '1px solid rgba(0,0,0,0.1)', flexShrink: 0
            }}
          >
             <Typography variant="subtitle2" noWrap sx={{ maxWidth: width - 80 }}>{data.title}</Typography>
             <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <IconButton size="small" onClick={() => setCollapsed(!collapsed)} sx={{ color: 'white', p: 0.5 }}>
                  {collapsed ? <UnfoldMoreIcon fontSize="small"/> : <UnfoldLessIcon fontSize="small"/>}
                </IconButton>
                <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ color: 'white', p: 0.5 }}>
                  <MoreVertIcon fontSize="small" />
                </IconButton>
             </Box>
          </Box>

          <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
            <MenuItem onClick={() => { onDuplicate(data._id); setAnchorEl(null); }}><ContentCopyIcon fontSize="small" sx={{ mr: 1 }} /> Duplicate</MenuItem>
            <MenuItem onClick={() => { onDelete(data._id); setAnchorEl(null); }}><DeleteIcon fontSize="small" sx={{ mr: 1, color: 'error.main' }} /> Delete</MenuItem>
          </Menu>

          {!collapsed && (
            <CardContent sx={{ p: 1.5, pb: '12px !important', minHeight: 150 }} onClick={handleGlobalClick}>
              {blocks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', cursor: 'pointer' }}>
                   Click to start typing...
                </Typography>
              )}
              {blocks.map((block, i) => (
                <EditableBlock key={i} block={block} onSave={(txt) => handleBlockUpdate(i, txt)} />
              ))}
            </CardContent>
          )}
        </Card>
      </div>
    </Draggable>
  );
}
