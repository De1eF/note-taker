import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';

import SheetHeader from './sheet-parts/SheetHeader';
import EditableBlock from './sheet-parts/EditableBlock';
import { parseMarkdownBlocks, extractTags } from './sheet-parts/sheet-utils';

export default function Sheet({ data, onUpdate, onDuplicate, onDelete, onDrag, scale }) {
  // 1. Initialize from props (Syncs with DB)
  const [localContent, setLocalContent] = useState(data.content || "");
  const [collapsed, setCollapsed] = useState(data.collapsed || false); 
  const [width, setWidth] = useState(data.width || 320);
  const [isResizing, setIsResizing] = useState(false);
  
  const [collapsedBlocks, setCollapsedBlocks] = useState(new Set());

  const nodeRef = useRef(null);

  // 2. Sync effects when backend data changes
  useEffect(() => { setLocalContent(data.content || ""); }, [data.content]);
  useEffect(() => { if (data.width) setWidth(data.width); }, [data.width]);
  // Sync collapsed state from external updates
  useEffect(() => { setCollapsed(data.collapsed || false); }, [data.collapsed]);

  const tags = useMemo(() => extractTags(localContent), [localContent]);
  const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  // --- HANDLERS ---

  // A. HANDLE COLLAPSE SYNC
  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState); // Immediate UI update
    onUpdate(data._id, { collapsed: newState }); // Backend Update
  };

  // B. HANDLE CONTENT SYNC (The logic that was missing)
  const handleBlockUpdate = (index, newBodyText) => {
    if (blocks.length === 0) {
        // If there are no blocks, we can't map over them.
        // Just set the content directly to initialize the sheet.
        // We default to a space " " if text is empty, to ensure the parser creates a block.
        const content = newBodyText || " "; 
        setLocalContent(content);
        onUpdate(data._id, { content: content });
        return;
    }

    // 1. Create a copy of the current parsed blocks
    const currentBlocks = [...blocks];
    
    // 2. We need to reconstruct the FULL content string from all blocks,
    //    swapping the modified body text into the correct block.
    const fullMarkdown = currentBlocks.map((block, i) => {
        // If this is the block we just edited:
        if (i === index) {
            if (block.type === 'section') {
                // Re-attach the header hashes and title to the new body
                const hashes = "#".repeat(block.level);
                return `${hashes} ${block.title}\n${newBodyText}`;
            } else {
                // Intro block is just raw text
                return newBodyText;
            }
        }
        
        // If this is an untouched block, regenerate its original string:
        if (block.type === 'section') {
            const hashes = "#".repeat(block.level);
            return `${hashes} ${block.title}\n${block.body}`;
        }
        return block.content;
    }).join('\n\n'); // Add breathing room between blocks

    // 3. Update local state immediately for responsiveness
    setLocalContent(fullMarkdown);
    
    // 4. Send to backend
    onUpdate(data._id, { content: fullMarkdown });
  };

  const handleColorUpdate = (newColor) => { onUpdate(data._id, { color: newColor }); };
  const handleTitleUpdate = (newTitle) => { onUpdate(data._id, { title: newTitle }); };

  const toggleBlockCollapse = (index) => {
    const newSet = new Set(collapsedBlocks);
    if (newSet.has(index)) { newSet.delete(index); } else { newSet.add(index); }
    setCollapsedBlocks(newSet);
  };

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

  const resizeHandleStyle = { position: 'absolute', right: 0, top: 0, bottom: 0, width: '10px', cursor: 'ew-resize', zIndex: 20, opacity: 0, '&:hover': { opacity: 1 } };

  const isDefaultColor = !data.color || data.color === 'default';
  const labelBg = isDefaultColor ? 'action.selected' : data.color;
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
          const displayName = tag.substring(1);

          return (
            <Box key={tag} sx={{ position: 'absolute', right: -6, top: `${topPos}px`, zIndex: 10, display: 'flex', alignItems: 'center', flexDirection: 'row-reverse' }}>
               <Tooltip title={displayName} placement="right">
                 <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: '#1976d2', cursor: 'pointer', border: '1px solid white', boxShadow: 1 }} />
               </Tooltip>
               <Box sx={{ mr: 1, bgcolor: labelBg, color: labelText, borderRadius: '4px', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 500, pointerEvents: 'none', boxShadow: 1, border: '1px solid rgba(0,0,0,0.1)', whiteSpace: 'nowrap' }}>
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
          <Box sx={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: '4px', bgcolor: 'transparent', '&:hover': { bgcolor: 'primary.light' }, cursor: 'ew-resize' }} onMouseDown={handleResizeStartOptimized} />

          <SheetHeader 
            title={data.title} width={width} 
            collapsed={collapsed} 
            setCollapsed={handleToggleCollapse} // <-- Pass the syncing handler
            color={data.color} onTitleChange={handleTitleUpdate} onColorChange={handleColorUpdate}
            onDuplicate={() => onDuplicate(data._id)} onDelete={() => onDelete(data._id)}
          />

          {!collapsed && (
            <CardContent sx={{ p: 1.5, pb: '12px !important', minHeight: 150 }}>
              {blocks.length === 0 && (
                <Typography 
                    variant="body2" color="text.secondary" 
                    sx={{ fontStyle: 'italic', cursor: 'pointer', opacity: 0.7 }}
                    // Allow clicking empty state to create initial content
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent dragging
                        handleBlockUpdate(0, " "); 
                    }}
                >
                   Click to start typing...
                </Typography>
              )}
              {(() => {
                let currentCollapseLevel = null;
                return blocks.map((block, i) => {
                  const isHeader = block.type === 'section';
                  const level = block.level;
                  const isThisCollapsed = collapsedBlocks.has(i);
                  
                  // Logic to hide nested blocks if parent is collapsed locally
                  if (currentCollapseLevel !== null) {
                      if (isHeader && level <= currentCollapseLevel) { currentCollapseLevel = null; } else { return null; }
                  }
                  if (isThisCollapsed && isHeader && currentCollapseLevel === null) { currentCollapseLevel = level; }
                  
                  return (
                    <EditableBlock 
                      key={i} 
                      block={block} 
                      sheetColor={data.color} 
                      isCollapsed={isThisCollapsed} 
                      onToggle={() => toggleBlockCollapse(i)}
                      onSave={(txt) => handleBlockUpdate(i, txt)} // <-- Now calls the working handler
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
