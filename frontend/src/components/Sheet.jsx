import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';

import SheetHeader from './sheet-parts/SheetHeader';
import EditableBlock from './sheet-parts/EditableBlock';
import { parseMarkdownBlocks, extractTags } from './sheet-parts/sheet-utils';

export default function Sheet({ data, onUpdate, onDuplicate, onDelete, onDrag, scale }) {
  const [localContent, setLocalContent] = useState(data.content || "");
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(data.width || 320);
  const [isResizing, setIsResizing] = useState(false);
  
  const [collapsedBlocks, setCollapsedBlocks] = useState(new Set());

  const nodeRef = useRef(null);

  useEffect(() => { setLocalContent(data.content || ""); }, [data.content]);
  useEffect(() => { if (data.width) setWidth(data.width); }, [data.width]);

  const tags = useMemo(() => extractTags(localContent), [localContent]);
  const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  // --- HANDLERS (Resize, Update, etc.) ---
  const handleResizeStartOptimized = (e) => {
    // ... (Keep existing resize logic)
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

  const handleBlockUpdate = (index, newBlockText) => { /* ... */ };
  const handleGlobalClick = () => { /* ... */ };
  const handleColorUpdate = (newColor) => { onUpdate(data._id, { color: newColor }); };
  const handleTitleUpdate = (newTitle) => { onUpdate(data._id, { title: newTitle }); };

  const toggleBlockCollapse = (index) => {
    const newSet = new Set(collapsedBlocks);
    if (newSet.has(index)) { newSet.delete(index); } else { newSet.add(index); }
    setCollapsedBlocks(newSet);
  };

  const resizeHandleStyle = { position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px', cursor: 'ew-resize', zIndex: 20, opacity: 0, '&:hover': { opacity: 1 } };

  // --- TAG LABEL STYLING LOGIC ---
  const isDefaultColor = !data.color || data.color === 'default';
  // Use neutral grey bg if default, else use the custom sheet color
  const labelBg = isDefaultColor ? 'action.selected' : data.color;
  // Use standard text if default, else black text for contrast on pastels
  const labelText = isDefaultColor ? 'text.primary' : 'rgba(0,0,0,0.87)';

  return (
    <Draggable
      nodeRef={nodeRef} handle=".drag-handle"
      defaultPosition={{ x: data.positionInSpace.x, y: data.positionInSpace.y }}
      onStop={(e, ui) => onDrag(data._id, { x: ui.x, y: ui.y })}
      scale={scale} disabled={isResizing}
    >
      <div ref={nodeRef} className="sheet-wrapper" style={{ position: 'absolute', zIndex: 5 }}>
        
        <div onMouseDown={handleResizeStartOptimized} style={resizeHandleStyle} title="Drag to resize" />
        
        {tags.map((tag, index) => {
          const topPos = 60 + (index * 30);
          // REMOVE '~' for display
          const displayName = tag.substring(1);

          return (
            <Box key={tag} sx={{ position: 'absolute', right: -6, top: `${topPos}px`, zIndex: 10, display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
               {/* The Dot */}
               <Tooltip title={displayName} placement="right">
                 <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1976d2', cursor: 'pointer', border: '1px solid white', boxShadow: 1 }} />
               </Tooltip>

               {/* The Tag Label (Styled as colored pill) */}
               <Box
                 sx={{
                   mr: 1,
                   bgcolor: labelBg,    // Dynamic background
                   color: labelText,    // Dynamic text color
                   borderRadius: '4px',
                   padding: '2px 6px',
                   fontSize: '0.75rem',
                   fontWeight: 500,
                   pointerEvents: 'none',
                   boxShadow: 1, // Make it pop off the canvas
                   border: '1px solid rgba(0,0,0,0.1)',
                   whiteSpace: 'nowrap'
                 }}
               >
                 {displayName}
               </Box>
            </Box>
          );
        })}

        <Card 
          sx={{ 
            width: width, minHeight: 100, height: 'auto', 
            opacity: collapsed ? 0.9 : 1, display: 'flex', flexDirection: 'column',
            transition: isResizing ? 'none' : 'width 0.2s', position: 'relative'
          }}
          elevation={4}
        >
          {/* ... (Rest of Card content remains exactly the same) ... */}
          <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', bgcolor: 'transparent', '&:hover': { bgcolor: 'primary.light' }, cursor: 'ew-resize' }} onMouseDown={handleResizeStartOptimized} />

          <SheetHeader 
            title={data.title} width={width} collapsed={collapsed} setCollapsed={setCollapsed}
            color={data.color} onTitleChange={handleTitleUpdate} onColorChange={handleColorUpdate}
            onDuplicate={() => onDuplicate(data._id)} onDelete={() => onDelete(data._id)}
          />

          {!collapsed && (
            <CardContent sx={{ p: 1.5, pb: '12px !important', minHeight: 150 }} onClick={handleGlobalClick}>
              {/* ... (Block rendering logic remains the same) ... */}
              {blocks.length === 0 && (
                <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', cursor: 'pointer', opacity: 0.7 }}>
                   Click to start typing...
                </Typography>
              )}
              {(() => {
                let currentCollapseLevel = null;
                return blocks.map((block, i) => {
                  const isHeader = block.type === 'section';
                  const level = block.level;
                  const isThisCollapsed = collapsedBlocks.has(i);
                  if (currentCollapseLevel !== null) {
                      if (isHeader && level <= currentCollapseLevel) { currentCollapseLevel = null; } else { return null; }
                  }
                  if (isThisCollapsed && isHeader && currentCollapseLevel === null) { currentCollapseLevel = level; }
                  return (
                    <EditableBlock 
                      key={i} block={block} sheetColor={data.color} 
                      isCollapsed={isThisCollapsed} onToggle={() => toggleBlockCollapse(i)}
                      onSave={(txt) => handleBlockUpdate(i, txt)} 
                    />
                  );
                });
              })()}
            </CardContent>
          )}
        </Card>
      </div>
    </Draggable>
  );
}
