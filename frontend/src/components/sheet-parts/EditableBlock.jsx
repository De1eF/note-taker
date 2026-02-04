import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

function EditableBlock({ initialText = '', onChange }) {
  const theme = useTheme();
  const [lines, setLines] = useState(() => initialText.split('\n'));
  const [editingIndex, setEditingIndex] = useState(null);
  const refs = useRef([]);

  // Avoid invoking onChange on every keystroke to prevent flooding the API.
  // We'll debounce calls and also call immediately on blur or structural edits.
  const debounceRef = useRef(null);

  const adjustHeight = (ta) => {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = ta.scrollHeight + 'px';
  };

  const startEdit = (index, caret = null) => {
    setEditingIndex(index);
    window.setTimeout(() => {
      const ta = refs.current[index];
      if (!ta) return;
      adjustHeight(ta);
      ta.focus();
      if (typeof caret === 'number') ta.setSelectionRange(caret, caret);
    }, 0);
  };

  const handleChange = (e, i) => {
    const v = e.target.value;
    const next = [...lines];
    next[i] = v;
    setLines(next);
    adjustHeight(e.target);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (onChange) {
      debounceRef.current = setTimeout(() => {
        onChange(next.join('\n'));
        debounceRef.current = null;
      }, 700);
    }
  };

  const handleBlur = (i) => {
    // exit edit mode on blur
    setEditingIndex(null);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (onChange) onChange(lines.join('\n'));
  };

  const handleKeyDown = (e, i) => {
    const ta = e.target;
    const pos = ta.selectionStart;

    if (e.key === 'Enter') {
      e.preventDefault();
      const before = ta.value.slice(0, pos);
      const after = ta.value.slice(pos);
      const next = [...lines];
      next[i] = before;
      next.splice(i + 1, 0, after);
      setLines(next);
      // structural change: persist immediately
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      if (onChange) onChange(next.join('\n'));
      startEdit(i + 1, 0);
    } else if (e.key === 'Backspace' && pos === 0) {
      // merge with previous line
      if (i === 0) return;
      e.preventDefault();
      const prev = lines[i - 1] || '';
      const curr = lines[i] || '';
      const next = [...lines];
      next[i - 1] = prev + curr;
      next.splice(i, 1);
      setLines(next);
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      if (onChange) onChange(next.join('\n'));
      startEdit(i - 1, prev.length);
    } else if (e.key === 'ArrowUp') {
      if (pos === 0 && i > 0) {
        e.preventDefault();
        startEdit(i - 1, refs.current[i - 1]?.value.length || 0);
      }
    } else if (e.key === 'ArrowDown') {
      if (pos === ta.value.length && i < lines.length - 1) {
        e.preventDefault();
        startEdit(i + 1, 0);
      }
    }
  };

  return (
    <div className="editable-block">
      {lines.map((line, i) =>
        editingIndex === i ? (
          <textarea
            key={i}
            ref={(el) => (refs.current[i] = el)}
            value={line}
            onChange={(e) => handleChange(e, i)}
            onKeyDown={(e) => handleKeyDown(e, i)}
            onBlur={() => handleBlur(i)}
            rows={1}
            style={{
              width: '100%',
              boxSizing: 'border-box',
              resize: 'none',
              overflow: 'hidden',
              fontFamily: (theme && theme.typography && theme.typography.body2 && theme.typography.body2.fontFamily) || 'inherit',
              fontSize: (theme && theme.typography && theme.typography.body2 && theme.typography.body2.fontSize) || 'inherit',
              color: theme?.palette?.text?.primary || 'inherit',
              lineHeight: '1.4',
              background: 'transparent',
              caretColor: theme?.palette?.text?.primary || undefined,
              padding: 0,
              margin: 0,
            }}
          />
        ) : (
          <div
            key={i}
            onDoubleClick={() => startEdit(i)}
            onClick={() => startEdit(i)}
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              padding: '2px 0',
              minHeight: '1.2em',
              cursor: 'text',
              color: theme?.palette?.text?.primary || 'inherit',
              fontFamily: (theme && theme.typography && theme.typography.body2 && theme.typography.body2.fontFamily) || 'inherit',
              fontSize: (theme && theme.typography && theme.typography.body2 && theme.typography.body2.fontSize) || 'inherit',
            }}
          >
            {line || <span style={{ opacity: 0.35 }}>{'\u00A0'}</span>}
          </div>
        )
      )}
    </div>
  );
}

export default EditableBlock;
