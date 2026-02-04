import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '@mui/material/styles';

function EditableBlock({ initialText = '', onChange, sheetColor }) {
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
    // Handle list-friendly Enter/Tab/Shift+Tab behavior
    const bulletMatch = ta.value.match(/^(-+)\s+(.*)$/);

    if (e.key === 'Enter') {
      e.preventDefault();
      const next = [...lines];

      if (bulletMatch) {
        // For bullets, split the content while preserving the marker on the new line
        const dashes = bulletMatch[1];
        const markerLen = dashes.length + 1; // dashes + space
        const contentBefore = ta.value.slice(markerLen, pos);
        const contentAfter = ta.value.slice(pos);

        next[i] = `${dashes} ${contentBefore}`.trimEnd();
        next.splice(i + 1, 0, `${dashes} ${contentAfter}`.trimStart());
        setLines(next);
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        if (onChange) onChange(next.join('\n'));
        // place caret after marker on new line
        startEdit(i + 1, dashes.length + 1);
      } else {
        const before = ta.value.slice(0, pos);
        const after = ta.value.slice(pos);
        next[i] = before;
        next.splice(i + 1, 0, after);
        setLines(next);
        if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
        if (onChange) onChange(next.join('\n'));
        startEdit(i + 1, 0);
      }
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
    } else if (e.key === 'Tab') {
      // Indent/outdent list items with Tab / Shift+Tab when the line is a bullet
      if (!bulletMatch) return; // allow default behavior
      e.preventDefault();
      const dashes = bulletMatch[1];
      const content = bulletMatch[2];
      let newDashes = dashes;
      if (e.shiftKey) {
        // outdent: remove one dash, if only one dash then remove list marker entirely
        if (dashes.length > 1) newDashes = dashes.slice(0, -1);
        else newDashes = '';
      } else {
        // indent: add one dash
        newDashes = `-${dashes}`;
      }
      const next = [...lines];
      const newLine = newDashes ? `${newDashes} ${content}` : content;
      next[i] = newLine;
      setLines(next);
      if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null; }
      if (onChange) onChange(next.join('\n'));
      // restore focus and caret position roughly where it was (after marker)
      window.setTimeout(() => {
        const taEl = refs.current[i];
        if (!taEl) return;
        taEl.focus();
        const newMarkerLen = newDashes ? newDashes.length + 1 : 0;
        const newPos = Math.max(newMarkerLen, newMarkerLen + (pos - (dashes.length + 1)));
        taEl.setSelectionRange(newPos, newPos);
      }, 0);
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
            {line ? (() => {
              // Bullet list detection: lines starting with one or more dashes and a space, e.g. "- item" or "-- nested"
              const bulletMatch = line.match(/^(-+)\s+(.*)$/);
              if (bulletMatch) {
                const dashes = bulletMatch[1];
                const content = bulletMatch[2];
                const baseIndent = 8;
                const indentPerLevel = 12;
                const indent = baseIndent + (dashes.length - 1) * indentPerLevel;
                const bulletColor = theme?.palette?.text?.primary || '#000';
                return (
                  <div style={{ display: 'flex', alignItems: 'flex-start', paddingLeft: indent }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: bulletColor, marginTop: 8, flex: '0 0 auto' }} />
                    <div style={{ marginLeft: 8, flex: 1 }}>
                      {content.split(/(~[A-Za-z0-9_-]+)/g).map((part, idx) => {
                        if (!part) return null;
                        if (part.startsWith('~')) {
                          const tagText = part.slice(1);
                          const bg = (!sheetColor || sheetColor === 'default') ? theme?.palette?.action?.selected : sheetColor;
                          const fg = (!sheetColor || sheetColor === 'default') ? theme?.palette?.text?.primary : '#000000';
                          return (
                            <span
                              key={idx}
                              style={{
                                display: 'inline-block',
                                background: bg,
                                color: fg,
                                borderRadius: 4,
                                padding: '2px 6px',
                                marginRight: 6,
                                fontWeight: 600,
                                fontSize: '0.85em',
                              }}
                            >
                              {tagText}
                            </span>
                          );
                        }
                        return part;
                      })}
                    </div>
                  </div>
                );
              }

              // Default: render inline ~tags as styled boxes
              return line.split(/(~[A-Za-z0-9_-]+)/g).map((part, idx) => {
                if (!part) return null;
                if (part.startsWith('~')) {
                  const tagText = part.slice(1);
                  const bg = (!sheetColor || sheetColor === 'default') ? theme?.palette?.action?.selected : sheetColor;
                  const fg = (!sheetColor || sheetColor === 'default') ? theme?.palette?.text?.primary : '#000000';
                  return (
                    <span
                      key={idx}
                      style={{
                        display: 'inline-block',
                        background: bg,
                        color: fg,
                        borderRadius: 4,
                        padding: '2px 6px',
                        marginRight: 6,
                        fontWeight: 600,
                        fontSize: '0.85em',
                      }}
                    >
                      {tagText}
                    </span>
                  );
                }
                return part;
              });
            })() : (
              <span style={{ opacity: 0.35 }}>{'\u00A0'}</span>
            )}
          </div>
        )
      )}
    </div>
  );
}

export default EditableBlock;
