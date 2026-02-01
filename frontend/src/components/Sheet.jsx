import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';

import SheetHeader from './sheet-parts/SheetHeader';
import EditableBlock from './sheet-parts/EditableBlock';
import { parseMarkdownBlocks, extractTags } from './sheet-parts/sheet-utils';

export default function Sheet({
  data,
  sheets,
  tagConnections,
  onUpdate,
  onDuplicate,
  onDelete,
  onDrag,
  scale,
  setHoveredTag
}) {
  const [localContent, setLocalContent] = useState(data.content || "");
  const [collapsed, setCollapsed] = useState(data.collapsed || false);
  const [width, setWidth] = useState(data.width || 320);
  const [isResizing, setIsResizing] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState(new Set());

  const nodeRef = useRef(null);

  useEffect(() => { setLocalContent(data.content || ""); }, [data.content]);
  useEffect(() => { if (data.width) setWidth(data.width); }, [data.width]);
  useEffect(() => { setCollapsed(data.collapsed || false); }, [data.collapsed]);

  const tags = useMemo(() => extractTags(localContent), [localContent]);
  const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onUpdate(data._id, { collapsed: newState });
  };

  const handleBlockUpdate = (index, newBodyText) => {
    if (!blocks.length) {
      setLocalContent(newBodyText || " ");
      onUpdate(data._id, { content: newBodyText || " " });
      return;
    }

    const fullMarkdown = blocks.map((block, i) => {
      if (i === index) {
        if (block.type === 'section') {
          const hashes = "#".repeat(block.level);
          return `${hashes} ${block.title}\n${newBodyText}`;
        }
        return newBodyText;
      }
      if (block.type === 'section') {
        const hashes = "#".repeat(block.level);
        return `${hashes} ${block.title}\n${block.body}`;
      }
      return block.content;
    }).join('\n\n');

    setLocalContent(fullMarkdown);
    onUpdate(data._id, { content: fullMarkdown });
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


    const toggleBlockCollapse = (index) => {
    const newSet = new Set(collapsedBlocks);
    if (newSet.has(index)) { newSet.delete(index); } else { newSet.add(index); }
    setCollapsedBlocks(newSet);
  };
    const handleTitleUpdate = (index, newTitle) => {
  const fullMarkdown = blocks.map((block, i) => {
    if (i === index && block.type === 'section') {
      const hashes = "#".repeat(block.level);
      return `${hashes} ${newTitle}\n${block.body || ''}`;
    }

    if (block.type === 'section') {
      const hashes = "#".repeat(block.level);
      return `${hashes} ${block.title}\n${block.body || ''}`;
    }

    return block.content;
  }).join('\n\n');

  setLocalContent(fullMarkdown);
  onUpdate(data._id, { content: fullMarkdown });
};

  return (
    <Draggable
      nodeRef={nodeRef}
      handle=".drag-handle"
      defaultPosition={data.positionInSpace}
      onStop={(e, ui) => onDrag(data._id, { x: ui.x, y: ui.y })}
      scale={scale}
      disabled={isResizing}
    >
      <div
  ref={nodeRef}
  style={{ position: 'absolute', zIndex: 5 }}
  onPointerDown={(e) => e.stopPropagation()}
>
<div onMouseDown={handleResizeStartOptimized} style={resizeHandleStyle} title="Drag to resize" />

        {/* TAG DOTS */}
{tags.map((tag, index) => {
  const topPos = 60 + index * 30;
  const displayName = tag.substring(1);
  const connections = tagConnections?.[tag] || [];

  return (
   <Box
  key={tag}
  sx={{
    position: 'absolute',
    right: -6,
    top: topPos,
    zIndex: 10
  }}
  onMouseEnter={() => setHoveredTag(tag)}
  onMouseLeave={() => setHoveredTag(null)}
>
  {/* DOT — anchor point */}
  <Tooltip
    placement="right"
    title={
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Typography variant="caption" fontWeight={600}>
          Connections
        </Typography>

        {connections.map((title, i) => (
          <Typography
            key={i}
            variant="caption"
            sx={{ whiteSpace: 'nowrap' }}
          >
            • {title}
          </Typography>
        ))}
      </Box>
    }
  >
    <Box
      sx={{
        width: 12,
        height: 12,
        borderRadius: '50%',
        bgcolor: '#1976d2',
        cursor: 'pointer',
        border: '1px solid white',
        boxShadow: 1
      }}
    />
  </Tooltip>

  {/* LABEL — FLOATING, DOES NOT AFFECT DOT */}
  <Box
    sx={{
      position: 'absolute',
      right: '100%',      // place to the left of dot
      top: '50%',
      transform: 'translateY(-50%)',
      mr: 1,
      bgcolor: (!data.color || data.color === 'default')
        ? 'action.selected'
        : data.color,
      color: (!data.color || data.color === 'default')
        ? 'text.primary'
        : '#000000',
      borderRadius: '4px',
      padding: '2px 6px',
      fontSize: '0.75rem',
      fontWeight: 500,
      pointerEvents: 'none',
      boxShadow: 1,
      border: '1px solid rgba(0,0,0,0.1)',
      whiteSpace: 'nowrap'
    }}
  >
    {displayName}
  </Box>
</Box>

  );
})}


        <Card sx={{ width, minHeight: 120 }} elevation={4}>
          <SheetHeader
            title={data.title}
            width={width}
            collapsed={collapsed}
            setCollapsed={handleToggleCollapse}
            color={data.color}
            onTitleChange={(t) => onUpdate(data._id, { title: t })}
            onColorChange={(c) => onUpdate(data._id, { color: c })}
            onDuplicate={() => onDuplicate(data._id)}
            onDelete={() => onDelete(data._id)}
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
                      onSave={(txt) => handleBlockUpdate(i, txt)}
                      onUpdateTitle={(title) => handleTitleUpdate(i, title)}
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
