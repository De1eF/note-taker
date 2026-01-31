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
    const label = React.Children.toArray(children).join('').replace(/^~/, '');
    return (
      <Box component="span" sx={{
          display: 'inline-block', bgcolor: tagBg, color: tagText, padding: '0px 6px',
          borderRadius: '4px', fontSize: '0.9em', fontWeight: 'bold', border: '1px solid',
          borderColor: 'divider', mx: 0.5, lineHeight: 1.4, verticalAlign: 'baseline',
          textDecoration: 'none', pointerEvents: 'none'
        }}>
        {label}
      </Box>
    );
  }
  return <a href={href} style={{ color: '#1976d2' }}>{children}</a>;
};

// --- SINGLE LINE COMPONENT ---
const LineItem = ({ 
  content, index, isEditing, setEditingIndex, onUpdateLine, onAddLine, onRemoveLine, onNavigate, 
  sheetColor, isList, indentation, extraTextOffset, inputRefs
}) => {
  const inputRef = useRef(null);
  const ignoreBlurRef = useRef(false);
  

  useEffect(() => {
    if (isEditing && inputRef.current) inputRef.current.focus();
  }, [isEditing]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();

      ignoreBlurRef.current = true;

      const match = content.match(/^((?:- )+| +)/); 
      const prefix = match ? match[1] : ""; 

      onAddLine(index, prefix);

      requestAnimationFrame(() => {
        ignoreBlurRef.current = false;
      });
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
        inputRef={el => {
  if (el) inputRefs.current[index] = el;
}} fullWidth variant="standard" value={content}
        onChange={(e) => onUpdateLine(index, e.target.value)} onKeyDown={handleKeyDown}
        onBlur={() => {
          if (ignoreBlurRef.current) return;
          setEditingIndex(null);
        }}
        InputProps={{ disableUnderline: true }}
        sx={{
          p: 0, m: 0,
          '& .MuiInputBase-root': { padding: 0 },
          '& .MuiInputBase-input': { ...commonTextStyle, padding: 0, height: 'auto' }
        }}
      />
    );
  }

  // Strip dash for display, as we render a dot manually
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
            // Allow more elements to prevent stripping styling
            allowedElements={['p', 'strong', 'em', 'a', 'code', 'text', 'h1', 'h2', 'h3', 'blockquote', 'li', 'ul', 'ol']} 
            unwrapDisallowed={true}
            components={{ 
                a: (props) => <TagComponent {...props} sheetColor={sheetColor} />,
                p: ({children}) => <span style={{ margin: 0 }}>{children}</span>,
                // Make headers inside body look distinct but small
                h1: ({children}) => <strong style={{fontSize: '1.2em'}}>{children}</strong>,
                h2: ({children}) => <strong style={{fontSize: '1.1em'}}>{children}</strong>,
                h3: ({children}) => <strong>{children}</strong>
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
  isCollapsed = false, 
  onToggle 
}) {
  const [lines, setLines] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const inputRefs = useRef({});

  useEffect(() => {
    // Extract body if section, or raw content if intro
    setLines((prevLines) => {
      const currentJoined = prevLines.join('\n');
      const rawText = block.type === 'section' ? (block.body || '') : block.content;

      // 1. If the text is exactly the same, do nothing. 
      // This prevents unnecessary re-renders when the object reference changes but data doesn't.
      if (currentJoined === rawText) {
        return prevLines;
      }

      // 2. Fix for the "Phantom Newline" bug:
      // If the incoming text is identical to local state but has ONE extra newline at the end,
      // it is likely an artifact of the parser/backend. Ignore it to keep the UI stable.
      if (rawText === currentJoined + '\n') {
        return prevLines;
      }

      // Otherwise, the content genuinely changed (e.g. initial load or external update), so sync it.
      return rawText.split('\n');
    });
  }, [block.type, block.body, block.content]);

  // When lines change, we join them and call onSave (which sends to Sheet -> Backend)
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

    const newIndex = index + 1;
    setEditingIndex(newIndex);

    requestAnimationFrame(() => {
      inputRefs.current[newIndex]?.focus();
    });
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
                    inputRefs={inputRefs}
                />
            );
        })}
        {lines.length === 0 && (
            <Box onClick={() => { setLines([""]); setEditingIndex(0); }} sx={{ fontStyle: 'italic', cursor: 'pointer', opacity: 0.6 }}>
                Click to add content...
            </Box>
        )}
      </Box>
    );
  };

  // HEADER BLOCK RENDER
  if (block.type === 'section') {
    const fontSizes = { 1: '30px', 2: '25px', 3: '20px' };

    return (
      <Box sx={{ mb: 1 }}>
        <Box 
          sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer', mt: 1, mb: 0.5, p: 0.5, '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 } }}
        >
          <IconButton size="small" sx={{ p: 0.5, mr: 0.5 }} onClick={(e) => { e.stopPropagation(); onToggle(); }}>
            {isCollapsed ? <KeyboardArrowRightIcon fontSize="small"/> : <KeyboardArrowDownIcon fontSize="small"/>}
          </IconButton>
          <TextField
            variant="standard"
            fullWidth
            value={block.title || ''}
            onChange={(e) => {
                // Ensure onUpdateTitle is passed from the parent component!
                if (onUpdateTitle) onUpdateTitle(e.target.value); 
            }}
            placeholder="Heading"
            InputProps={{ 
              disableUnderline: true,
              style: { 
                fontSize: fontSizes[block.level],
                fontWeight: 'bold',
                cursor: 'text' 
              }
            }}
            // Prevent click from bubbling up (safety measure)
            onClick={(e) => e.stopPropagation()} 
          />
        </Box>
        <Collapse in={!isCollapsed}>
          <Box sx={{ borderLeft: '2px solid rgba(0,0,0,0.05)', pb: 1 }}>
            {renderLines()}
          </Box>
        </Collapse>
      </Box>
    );
  }

  // INTRO BLOCK RENDER
  return <Box sx={{ mb: 1, p: 1 }}>{renderLines()}</Box>;
}
