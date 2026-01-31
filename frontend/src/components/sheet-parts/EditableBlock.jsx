import React, { useState, useEffect, useRef } from 'react';
import { Box, TextField, IconButton, Typography, Collapse } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import CircleIcon from '@mui/icons-material/Circle';
import ReactMarkdown from 'react-markdown';
import { prepareMarkdown } from './sheet-utils';

// --- STYLES ---
const commonTextStyle = {
  fontSize: '15px', 
  lineHeight: '1.6', 
  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  letterSpacing: '0.00938em',
  color: 'inherit'
};

const TagComponent = ({ href, children, sheetColor }) => {
  const isTag = href && href.startsWith('#tag:');
  const tagBg = (!sheetColor || sheetColor === 'default') ? 'action.selected' : sheetColor;
  const tagText = (!sheetColor || sheetColor === 'default') ? 'text.primary' : '#000000';

  if (isTag) {
    return (
      <Box component="span" sx={{
          display: 'inline-block', bgcolor: tagBg, color: tagText, padding: '0px 6px',
          borderRadius: '4px', fontSize: '0.9em', fontWeight: 'bold', border: '1px solid',
          borderColor: 'divider', mx: 0.5, lineHeight: 1.4, verticalAlign: 'baseline',
          textDecoration: 'none', pointerEvents: 'none'
        }}>
        {children}
      </Box>
    );
  }
  return <a href={href} style={{ color: '#1976d2' }}>{children}</a>;
};

// --- SINGLE LINE COMPONENT (No changes from previous step) ---
const LineItem = ({ 
  content, index, isEditing, setEditingIndex, onUpdateLine, onAddLine, onRemoveLine, onNavigate, 
  sheetColor, isList, indentation, extraTextOffset 
}) => {
  const inputRef = useRef(null);

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const match = content.match(/^((?:- )+| +)/); 
      const prefix = match ? match[1] : ""; 
      onAddLine(index, prefix);
    } 
    else if (e.key === 'Backspace' && content === '') {
      e.preventDefault();
      onRemoveLine(index);
    }
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      onNavigate(index - 1);
    }
    else if (e.key === 'ArrowDown') {
      e.preventDefault();
      onNavigate(index + 1);
    }
  };

  if (isEditing) {
    return (
      <TextField
        inputRef={inputRef} fullWidth variant="standard" value={content}
        onChange={(e) => onUpdateLine(index, e.target.value)} onKeyDown={handleKeyDown}
        onBlur={() => setEditingIndex(null)}
        InputProps={{ disableUnderline: true }}
        sx={{
          p: 0, m: 0,
          '& .MuiInputBase-root': { padding: 0 },
          '& .MuiInputBase-input': { ...commonTextStyle, padding: 0, height: 'auto' }
        }}
      />
    );
  }

  const cleanContent = isList ? content.replace(/^((?:- )+)/, '') : content;
  const displayContent = cleanContent.trim() === '' ? '&nbsp;' : cleanContent;

  return (
    <Box
      onClick={(e) => { e.stopPropagation(); setEditingIndex(index); }}
      sx={{
        ...commonTextStyle, cursor: 'text', minHeight: '24px', display: 'flex', alignItems: 'flex-start',
        pl: `${indentation + extraTextOffset}px`, 
        '&:hover': { bgcolor: 'rgba(0,0,0,0.04)', borderRadius: '2px' }
      }}
    >
      {isList && (
        <Box sx={{ width: '24px', height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <CircleIcon sx={{ fontSize: 6, color: 'text.secondary' }} />
        </Box>
      )}
      <Box sx={{ flexGrow: 1, whiteSpace: 'pre-wrap' }}>
        <ReactMarkdown 
            allowedElements={['p', 'strong', 'em', 'a', 'code', 'text']} unwrapDisallowed={true}
            components={{ 
                a: (props) => <TagComponent {...props} sheetColor={sheetColor} />,
                p: ({children}) => <span style={{ margin: 0 }}>{children}</span>
            }}
        >
            {prepareMarkdown(displayContent)}
        </ReactMarkdown>
      </Box>
    </Box>
  );
};

// --- MAIN BLOCK COMPONENT ---
export default function EditableBlock({ 
  block, 
  onSave, 
  sheetColor,
  // NEW PROPS for External Control
  isCollapsed = false, // Default false (Open)
  onToggle // Function to toggle
}) {
  const [lines, setLines] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);

  useEffect(() => {
    const rawText = block.type === 'section' ? (block.body || '') : block.content;
    setLines(rawText.split('\n'));
  }, [block]);

  const saveChanges = (newLines) => {
    setLines(newLines);
    onSave(newLines.join('\n'));
  };

  const handleUpdateLine = (index, value) => {
    const newLines = [...lines];
    newLines[index] = value;
    saveChanges(newLines);
  };
  const handleAddLine = (index, prefix = "") => {
    const newLines = [...lines];
    newLines.splice(index + 1, 0, prefix);
    saveChanges(newLines);
    setEditingIndex(index + 1);
  };
  const handleRemoveLine = (index) => {
    if (lines.length <= 1) { handleUpdateLine(0, ""); return; }
    const newLines = lines.filter((_, i) => i !== index);
    saveChanges(newLines);
    setEditingIndex(Math.max(0, index - 1));
  };
  const handleNavigate = (targetIndex) => {
    if (targetIndex >= 0 && targetIndex < lines.length) setEditingIndex(targetIndex);
  };

  const renderLines = () => {
    let activeIndentLevel = 0;
    return (
      <Box sx={{ pl: block.type === 'section' ? 2 : 0 }}>
        {lines.map((line, i) => {
            const listMatch = line.match(/^((?:- )+)/);
            const isSpaceStart = line.startsWith(' ');
            let isList = false;
            let indentation = 0;
            let extraTextOffset = 0;

            if (listMatch) {
                isList = true;
                const dashes = (listMatch[1].match(/- /g) || []).length;
                activeIndentLevel = dashes; 
                indentation = (activeIndentLevel - 1) * 24;
            } else if (isSpaceStart && activeIndentLevel > 0) {
                indentation = (activeIndentLevel - 1) * 24;
                extraTextOffset = 24;
            } else {
                activeIndentLevel = 0;
            }

            return (
                <LineItem
                    key={i} index={i} content={line} isEditing={editingIndex === i}
                    setEditingIndex={setEditingIndex} onUpdateLine={handleUpdateLine}
                    onAddLine={handleAddLine} onRemoveLine={handleRemoveLine} onNavigate={handleNavigate}
                    sheetColor={sheetColor} isList={isList} indentation={indentation < 0 ? 0 : indentation}
                    extraTextOffset={extraTextOffset}
                />
            );
        })}
        {lines.length === 0 && (
            <Box onClick={() => { setLines([""]); setEditingIndex(0); }} sx={{ fontStyle: 'italic', cursor: 'pointer' }}>
                Click to add content...
            </Box>
        )}
      </Box>
    );
  };

  // HEADER BLOCK
  if (block.type === 'section') {
    const variants = { 1: 'h5', 2: 'h6', 3: 'subtitle1' };
    const variant = variants[block.level] || 'body1';

    return (
      <Box sx={{ mb: 1 }}>
        <Box 
          // CHANGED: Use passed onToggle prop
          onClick={(e) => { e.stopPropagation(); onToggle(); }}
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 1, mb: 0.5, p: 0.5, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 } }}
        >
          <IconButton size="small" sx={{ p: 0.5, mr: 0.5 }}>
            {/* CHANGED: Check reversed logic for icon */}
            {isCollapsed ? <KeyboardArrowRightIcon fontSize="small"/> : <KeyboardArrowDownIcon fontSize="small"/>}
          </IconButton>
          <Typography variant={variant} fontWeight="bold" sx={{ flexGrow: 1 }}>{block.title}</Typography>
        </Box>
        {/* CHANGED: Use passed isCollapsed prop */}
        <Collapse in={!isCollapsed}>
          <Box sx={{ borderLeft: '2px solid rgba(0,0,0,0.05)', pb: 1 }}>
            {renderLines()}
          </Box>
        </Collapse>
      </Box>
    );
  }

  // INTRO BLOCK (Always visible)
  return <Box sx={{ mb: 1, p: 1 }}>{renderLines()}</Box>;
}
