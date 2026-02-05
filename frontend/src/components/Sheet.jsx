import React, { useState, useRef, useEffect, useMemo } from 'react';
import Draggable from 'react-draggable';
import { Card, CardContent, Typography, Box, Tooltip } from '@mui/material';
import { useTheme } from '@mui/material/styles';

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
  onCreateHelp,
  onDrag,
  scale,
  setHoveredTag
}) {
  const theme = useTheme();
  const [localContent, setLocalContent] = useState(data.content || "");
  const [collapsed, setCollapsed] = useState(() => (data && typeof data.collapsed !== 'undefined') ? data.collapsed : false);
  const [collapsedHeaders, setCollapsedHeaders] = useState(() => (data && Array.isArray(data.collapsed_headers)) ? data.collapsed_headers : []);
  const [width, setWidth] = useState(data.width || 320);
  const [isResizing, setIsResizing] = useState(false);
  const [isHandleActive, setIsHandleActive] = useState(false);
  const [isHandleHover, setIsHandleHover] = useState(false);
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  

  const nodeRef = useRef(null);

  useEffect(() => { setLocalContent(data.content || ""); }, [data.content]);
  useEffect(() => { if (data.width) setWidth(data.width); }, [data.width]);
  useEffect(() => {
    // Load collapsed state from DB when the sheet data (id) changes —
    // initialize local state from the server value without overwriting
    // transient local toggles while editing.
    setCollapsed(typeof data?.collapsed !== 'undefined' ? data.collapsed : false);
    setCollapsedHeaders(Array.isArray(data?.collapsed_headers) ? data.collapsed_headers : []);
  }, [data._id]);
  

  const tags = useMemo(() => extractTags(localContent), [localContent]);
  const blocks = useMemo(() => parseMarkdownBlocks(localContent), [localContent]);

  const headerIdsInBlocks = useMemo(() => {
    const ids = new Set();
    blocks.forEach((block, i) => {
      if (block.type === 'section') ids.add(`section:${i}:${block.level}`);
    });
    return ids;
  }, [blocks]);

  useEffect(() => {
    if (!collapsedHeaders || collapsedHeaders.length === 0) return;
    const filtered = collapsedHeaders.filter((id) => {
      if (id.startsWith('section:')) return headerIdsInBlocks.has(id);
      return true;
    });
    if (filtered.length !== collapsedHeaders.length) {
      setCollapsedHeaders(filtered);
      onUpdate(data._id, { collapsed_headers: filtered });
    }
  }, [collapsedHeaders, headerIdsInBlocks, data._id, onUpdate]);

  const widthRef = useRef(width);
  useEffect(() => { widthRef.current = width; }, [width]);

  const handleToggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    onUpdate(data._id, { collapsed: newState });
  };

  const handleHeaderCollapseToggle = (headerId) => {
    const set = new Set(collapsedHeaders || []);
    if (set.has(headerId)) set.delete(headerId);
    else set.add(headerId);
    const next = Array.from(set);
    setCollapsedHeaders(next);
    onUpdate(data._id, { collapsed_headers: next });
  };

  const hiddenBlockIndexes = useMemo(() => {
    const hidden = new Set();
    if (!blocks || blocks.length === 0) return hidden;
    const collapsedSet = new Set(collapsedHeaders || []);
    let active = null; // { level, index }
    blocks.forEach((block, i) => {
      if (block.type === 'section') {
        if (active && block.level <= active.level) {
          active = null;
        }
        if (active) {
          hidden.add(i);
          return;
        }
        const id = `section:${i}:${block.level}`;
        if (collapsedSet.has(id)) {
          active = { level: block.level, index: i };
        }
        return;
      }
      if (active) hidden.add(i);
    });
    return hidden;
  }, [blocks, collapsedHeaders]);

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
    // Use pointer events so touch devices can resize by grabbing the edge.
    e.preventDefault(); e.stopPropagation();
    const startX = e.clientX;
    const startWidth = widthRef.current;
    setIsResizing(true);
    setIsHandleActive(true);

    const handleMove = (moveEvent) => {
      moveEvent.preventDefault?.();
      const deltaX = moveEvent.clientX - startX;
      const newWidth = Math.max(200, startWidth + (deltaX / scale));
      setWidth(newWidth);
    };

    const handleUp = (upEvent) => {
      document.removeEventListener('pointermove', handleMove);
      document.removeEventListener('pointerup', handleUp);
      setIsResizing(false);
      setIsHandleActive(false);
      const deltaX = upEvent.clientX - startX;
      const finalWidth = Math.max(200, startWidth + (deltaX / scale));
      onUpdate(data._id, { width: finalWidth });
    };

    document.addEventListener('pointermove', handleMove, { passive: false });
    document.addEventListener('pointerup', handleUp);

    // Try to capture the pointer on the handle so moves are routed correctly
    if (e.pointerId && e.currentTarget && typeof e.currentTarget.setPointerCapture === 'function') {
      try { e.currentTarget.setPointerCapture(e.pointerId); } catch (err) {}
    }
  };

    useEffect(() => {
      // detect coarse pointer (touch) so we can widen the hit target
      const mq = window.matchMedia && window.matchMedia('(pointer: coarse)');
      const setCoarse = () => { setIsCoarsePointer(!!(mq && mq.matches)); };
      setCoarse();
      if (mq && typeof mq.addEventListener === 'function') mq.addEventListener('change', setCoarse);
      else if (mq && typeof mq.addListener === 'function') mq.addListener(setCoarse);
      return () => {
        if (mq && typeof mq.removeEventListener === 'function') mq.removeEventListener('change', setCoarse);
        else if (mq && typeof mq.removeListener === 'function') mq.removeListener(setCoarse);
      };
    }, []);

    const headerHeight = 48;
    const resizeHandleStyle = {
      position: 'absolute',
      right: 0,
      top: headerHeight,
      bottom: 0,
      width: isCoarsePointer ? '24px' : '10px',
      cursor: 'ew-resize',
      zIndex: 20,
      opacity: (isHandleActive || isHandleHover) ? 1 : 0,
      background: (isHandleActive || isHandleHover) ? 'rgba(25,118,210,0.10)' : 'transparent',
      transition: 'opacity 120ms, background 120ms',
      touchAction: 'none',
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
      cancel=".no-drag, input, textarea, button, [contenteditable='true'], .MuiInputBase-root"
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
<div onPointerDown={handleResizeStartOptimized} style={resizeHandleStyle} title="Drag to resize" />

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
      left: '100%',       // place to the right of dot
      top: '50%',
      transform: 'translateY(-50%)',
      ml: 1,
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
            onCreateHelp={onCreateHelp}
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
              {blocks.map((block, i) => {
                const isHeader = block.type === 'section';
                const headerId = isHeader ? `section:${i}:${block.level}` : null;
                const isHidden = hiddenBlockIndexes.has(i);

                if (isHidden) return null;

                return (
                  <div key={i} style={{ marginBottom: 8 }}>
                    {isHeader && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleHeaderCollapseToggle(headerId);
                          }}
                          title={collapsedHeaders?.includes(headerId) ? 'Expand section' : 'Collapse section'}
                          style={{
                            width: 18,
                            height: 18,
                            borderRadius: 4,
                            border: theme?.palette?.mode === 'dark'
                              ? '1px solid rgba(255,255,255,0.5)'
                              : '1px solid rgba(0,0,0,0.2)',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: '16px',
                            padding: 0,
                            color: theme?.palette?.mode === 'dark'
                              ? '#ffffff'
                              : (theme?.palette?.text?.primary || 'inherit'),
                          }}
                        >
                          {collapsedHeaders?.includes(headerId) ? '+' : '-'}
                        </button>
                        <div
                          onDoubleClick={() => {
                            const t = window.prompt('Section title', block.title || '');
                            if (t !== null) handleTitleUpdate(i, t);
                          }}
                          style={{ fontWeight: 700, cursor: 'pointer', userSelect: 'none' }}
                        >
                          {block.title}
                        </div>
                      </div>
                    )}

                    {!isHeader && (
                      <EditableBlock
                        initialText={block.content || ''}
                        sheetColor={data.color}
                        collapsedHeaders={collapsedHeaders}
                        collapseIdPrefix={`block:${i}:`}
                        onCollapsedHeadersChange={(next) => {
                          setCollapsedHeaders(next);
                          onUpdate(data._id, { collapsed_headers: next });
                        }}
                        onChange={(text) => handleBlockUpdate(i, text)}
                      />
                    )}

                    {isHeader && (
                      <EditableBlock
                        initialText={block.body || ''}
                        sheetColor={data.color}
                        collapsedHeaders={collapsedHeaders}
                        collapseIdPrefix={`block:${i}:`}
                        onCollapsedHeadersChange={(next) => {
                          setCollapsedHeaders(next);
                          onUpdate(data._id, { collapsed_headers: next });
                        }}
                        onChange={(text) => handleBlockUpdate(i, text)}
                      />
                    )}
                  </div>
                );
              })}
            </CardContent>
          )}
        </Card>
      </div>
    </Draggable>
  );
}
