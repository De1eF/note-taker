// ... existing imports

export const preserveNewlines = (text) => {
  if (!text) return "";
  return text.replace(/\n(?=\n)/g, '\n&nbsp;\n');
};

// NEW: formatTags - Converts ~tag to a link with a HASH
export const formatTags = (text) => {
  if (!text) return "";
  // Old: '$1[$2](tag:$2)'
  // New: '$1[$2](#tag:$2)'  <-- Added #
  return text.replace(/([~\s]|^)~(\w[\w-]*)/g, '$1[$2](#tag:$2)');
};

export const prepareMarkdown = (text) => {
  return preserveNewlines(formatTags(text));
};

export const parseMarkdownBlocks = (text) => {
  // ... (keep existing code unchanged)
  if (!text) return [];
  const rawBlocks = text.split(/(?=^#{1,3}\s)/gm);
  return rawBlocks.map((chunk, index) => {
    const match = chunk.match(/^(#{1,3})\s+(.*)\n?([\s\S]*)$/);
    if (match) {
      return {
        id: index, 
        type: 'section', 
        level: match[1].length,
        title: match[2], 
        body: match[3] || '', 
        content: chunk
      };
    }
    return { id: index, type: 'intro', content: chunk };
  });
};