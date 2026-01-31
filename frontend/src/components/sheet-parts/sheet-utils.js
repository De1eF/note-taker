// Helper: Preserves visual spacing (mostly handled by CSS pre-wrap now, but kept for safety)
export const preserveNewlines = (text) => text;

// Extract unique tags for the connection dots
export const extractTags = (content) => {
  if (!content) return [];
  const matches = content.match(/~(\w[\w-]*)/g);
  if (!matches) return [];
  return [...new Set(matches)].sort();
};

// Convert ~tag to a special link format #tag:tagname
export const formatTags = (text) => {
  if (!text) return "";
  return text.replace(/([~\s]|^)~(\w[\w-]*)/g, '$1[$2](#tag:$2)');
};

// Only format tags, ignoring list logic
export const prepareMarkdown = (text) => {
  return formatTags(text);
};

// Parse blocks (Headers vs Content)
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
