import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, Typography, Box } from '@mui/material';

// Imports from sub-components
import SheetHeader from './sheet-parts/SheetHeader';
import EditableBlock from './sheet-parts/EditableBlock';
import { parseMarkdownBlocks } from './sheet-parts/sheet-utils';

export default function Sheet({ data, onUpdate, onDuplicate, onDelete, onDrag, scale }) {
  const [localContent, setLocalContent] = useState(data.content || "");
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(data.width || 320);
  const [isResizing, setIsResizing] = useState(false);
  const nodeRef = useRef(null);

  useEffect(() => { setLocalContent(data.content || ""); }, [data.content]);
  useEffect(() => { if (data.width) setWidth(data.width); }, [data.width]);

  const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

  // --- Handlers ---

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

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  const handleResizeStartOptimized = (e) => {
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    setIsResizing(true);

    const handleMouseMove = (moveEvent) => {
        const deltaX = moveEvent.clientX - startX;
        const newWidth = Math.max(200, startWidth + (deltaX / scale));
        setWidth(newWidth);
    };

    const handleMouseUp = (upEvent) => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        setIsResizing(false);
        const deltaX = upEvent.clientX - startX;
        const finalWidth = Math.max(200, startWidth + (deltaX / scale));
        onUpdate(data._id, { width: finalWidth });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  // --- Styles ---

  const dotStyle = {
    width: 12, height: 12, borderRadius: '50%',
    backgroundColor: '#1976d2', position: 'absolute',
    right: -6, top: '67.5px', cursor: 'pointer', zIndex: 10
  };

  const resizeHandleStyle = {
    position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px',
    cursor: 'ew-resize', zIndex: 20, opacity: 0, '&:hover': { opacity: 1 } 
  };

  const handleTitleUpdate = (newTitle) => {
    onUpdate(data._id, { title: newTitle });
  };

  // --- Render ---

  return (
    <Draggable
      nodeRef={nodeRef} handle=".drag-handle"
      defaultPosition={{ x: data.positionInSpace.x, y: data.positionInSpace.y }}
      onStop={(e, ui) => onDrag(data._id, { x: ui.x, y: ui.y })}
      scale={scale} disabled={isResizing}
    >
      <div ref={nodeRef} className="sheet-wrapper" style={{ position: 'absolute', zIndex: 5 }}>
        
        {/* Resize Controls */}
        <div onMouseDown={handleResizeStartOptimized} style={resizeHandleStyle} title="Drag to resize" />
        
        {/* Connection Dot */}
        <div className="connection-dot" id={`dot-${data._id}`} style={dotStyle} />

        <Card 
          sx={{ 
            width: width, minHeight: 100, height: 'auto', 
            opacity: collapsed ? 0.9 : 1, display: 'flex', flexDirection: 'column',
            transition: isResizing ? 'none' : 'width 0.2s', position: 'relative'
          }}
          elevation={4}
        >
          {/* Visual Resize Line */}
          <Box sx={{ 
              position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', 
              bgcolor: 'transparent', '&:hover': { bgcolor: 'primary.light' }, cursor: 'ew-resize'
          }} onMouseDown={handleResizeStartOptimized} />

          {/* Header Component */}
          <SheetHeader 
            title={data.title}
            width={width}
            collapsed={collapsed}
            setCollapsed={setCollapsed}
            onDuplicate={() => onDuplicate(data._id)}
            onDelete={() => onDelete(data._id)}
            onTitleChange={handleTitleUpdate}
          />

          {/* Body Content */}
          {!collapsed && (
            <CardContent sx={{ p: 1.5, pb: '12px !important', minHeight: 150 }} onClick={handleGlobalClick}>
              {blocks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', cursor: 'pointer' }}>
                   Click to start typing...
                </Typography>
              )}
              {blocks.map((block, i) => (
                <EditableBlock 
                  key={i} 
                  block={block} 
                  onSave={(txt) => handleBlockUpdate(i, txt)} 
                />
              ))}
            </CardContent>
          )}
        </Card>
      </div>
    </Draggable>
  );
}
