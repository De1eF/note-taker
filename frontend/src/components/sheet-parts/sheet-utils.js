// Helper: Preserves visual spacing for Markdown
export const preserveNewlines = (text) => {
  if (!text) return "";
  return text.replace(/\n(?=\n)/g, '\n&nbsp;\n');
};

// Parser Helper
export const parseMarkdownBlocks = (text) => {
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
