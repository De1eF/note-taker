import React, { useState, useEffect } from 'react';
import { Box, TextField, IconButton, Typography, Collapse } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import EditIcon from '@mui/icons-material/Edit';
import ReactMarkdown from 'react-markdown';
import { prepareMarkdown } from './sheet-utils';

const commonTextStyle = {
  fontSize: '15px', 
  lineHeight: '1.6', 
  fontFamily: '"Roboto","Helvetica","Arial",sans-serif',
  letterSpacing: '0.00938em',
  color: 'inherit'
};

// --- Updated Tag Component ---
const TagComponent = ({ href, children, sheetColor }) => {
  // CHANGED: Look for the hash prefix we added in utils
  const isTag = href && href.startsWith('#tag:');

  const tagBg = (!sheetColor || sheetColor === 'default') ? 'action.selected' : sheetColor;
  const tagText = (!sheetColor || sheetColor === 'default') ? 'text.primary' : 'rgba(0,0,0,0.87)';

  if (isTag) {
    return (
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          bgcolor: tagBg,
          color: tagText,
          padding: '0px 6px',
          borderRadius: '4px',
          fontSize: '0.9em',
          fontWeight: 'bold',
          border: '1px solid',
          borderColor: 'divider',
          mx: 0.5,
          lineHeight: 1.4,
          verticalAlign: 'baseline',
          textDecoration: 'none',
          pointerEvents: 'none' // Prevent clicking the hash link
        }}
      >
        {children}
      </Box>
    );
  }
  
  return <a href={href} style={{ color: '#1976d2' }}>{children}</a>;
};

export default function EditableBlock({ block, onSave, sheetColor }) {
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
      <Box sx={{ mb: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
        <TextField
          fullWidth multiline autoFocus value={text} onChange={(e) => setText(e.target.value)}
          onBlur={handleBlur} onKeyDown={handleKeyDown} variant="standard"
          InputProps={{ disableUnderline: true }} 
          sx={{ '& .MuiInputBase-root': { padding: 0 }, '& .MuiInputBase-input': { ...commonTextStyle, padding: 0 } }}
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
          cursor: 'text', mb: 1, p: 1,
          '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 },
          whiteSpace: 'pre-wrap', ...commonTextStyle, '& p': { margin: 0 } 
        }}
      >
        <ReactMarkdown 
          components={{ a: (props) => <TagComponent {...props} sheetColor={sheetColor} /> }}
        >
            {prepareMarkdown(block.content)}
        </ReactMarkdown>
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
          mt: block.level === 1 ? 2 : 1, mb: 0.5, '&:hover .edit-icon': { opacity: 1 },
          p: 0.5
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
            p: 1,
            '&:hover': { bgcolor: 'rgba(0,0,0,0.02)', borderRadius: 1 }, 
            whiteSpace: 'pre-wrap', ...commonTextStyle,
            '& ul, & ol': { paddingLeft: '1.5em', margin: '0.5em 0' }, '& li': { listStyleType: 'disc' },
            '& p': { margin: 0 }
          }}
        >
          <ReactMarkdown 
            components={{ a: (props) => <TagComponent {...props} sheetColor={sheetColor} /> }}
          >
            {prepareMarkdown(block.body || "*Click to add text...*")}
          </ReactMarkdown>
        </Box>
      </Collapse>
    </Box>
  );
}
