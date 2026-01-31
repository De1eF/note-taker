// frontend/src/components/sheet-parts/sheet-utils.js

// 1. EXTRACT TAGS (The Fix: Now looking for ~ instead of #)
export const extractTags = (text) => {
  if (!text) return [];
  // Regex matches: ~tag, ~tag:value, ~tag.name
  // It stops at spaces or punctuation that isn't : . or -
  return text.match(/~[\w:.-]+/g) || [];
};

// 2. PARSE MARKDOWN BLOCKS (Used by Sheet.jsx to split content)
export const parseMarkdownBlocks = (text) => {
  if (!text) return [];
  
  // Split by headers (lines starting with #)
  // We use a regex that looks for standard Markdown headers
  const lines = text.split('\n');
  const blocks = [];
  let currentBlock = { type: 'intro', content: '' };

  lines.forEach((line) => {
    const headerMatch = line.match(/^(#{1,6})\s+(.*)/);
    
    if (headerMatch) {
      // If we have accumulated content in the previous block, push it
      if (currentBlock.content.trim()) {
        if (currentBlock.type === 'section') {
           // separate body from title
           currentBlock.body = currentBlock.content.trim();
        }
        blocks.push(currentBlock);
      }
      
      // Start a new Section block
      currentBlock = {
        type: 'section',
        level: headerMatch[1].length,
        title: headerMatch[2],
        content: '', // Will accumulate body lines here
        body: ''
      };
    } else {
      // Append line to current block
      currentBlock.content += line + '\n';
    }
  });

  // Push the final block
  if (currentBlock.content.trim() || currentBlock.type === 'intro') {
      if (currentBlock.type === 'section') {
          currentBlock.body = currentBlock.content.trim();
      }
      blocks.push(currentBlock);
  }

  // Filter out empty intro blocks if they are not the only block
  if (blocks.length > 1 && blocks[0].type === 'intro' && !blocks[0].content.trim()) {
      blocks.shift();
  }

  return blocks;
};

// 3. PREPARE MARKDOWN (Used by EditableBlock to highlight tags)
export const prepareMarkdown = (text) => {
  if (!text) return "";
  // Wraps ~tags in link syntax so ReactMarkdown renders them as <a> tags
  // We interpret these <a> tags specially in EditableBlock
  return text.replace(
      /(~[\w:.-]+)/g, 
      "[$1](#tag:$1)" 
  );
};
