// Extract code blocks from markdown content
export function extractCodeBlocks(markdown) {
  const regex = /```(html|css|javascript|jsx|js)\n([\s\S]*?)```/g;
  const blocks = [];
  let match;
  
  while ((match = regex.exec(markdown)) !== null) {
    const language = match[1] === 'js' ? 'javascript' : match[1];
    blocks.push({
      language,
      code: match[2].trim(),
      autoPreview: true
    });
  }
  
  return blocks;
}

// Parse code blocks and return preview state
export function parseCodeForPreview(markdown) {
  const blocks = extractCodeBlocks(markdown);
  const preview = {
    html: '',
    css: '',
    js: ''
  };
  
  for (const block of blocks) {
    switch (block.language) {
      case 'html':
        preview.html = block.code;
        break;
      case 'css':
        preview.css = block.code;
        break;
      case 'javascript':
      case 'jsx':
        preview.js = block.code;
        break;
      default:
        break;
    }
  }
  
  return preview;
}

// Check if content has any code blocks
export function hasCodeBlocks(markdown) {
  const regex = /```(html|css|javascript|jsx|js)\n[\s\S]*?```/;
  return regex.test(markdown);
}

// Extract briefing from assistant response
export function extractBriefing(markdown) {
  const titleMatch = markdown.match(/\*\*Title:\*\*\s*(.+)/);
  const descriptionMatch = markdown.match(/\*\*Description:\*\*\s*([\s\S]*?)(?=\*\*Acceptance Criteria:\*\*|$)/);
  const criteriaMatch = markdown.match(/\*\*Acceptance Criteria:\*\*\s*([\s\S]*?)(?=\*\*Pipeline:\*\*|$)/);
  
  if (titleMatch) {
    const criteria = [];
    if (criteriaMatch) {
      const criteriaText = criteriaMatch[1];
      const criteriaLines = criteriaText.match(/- \[[ x]\] .+/g) || [];
      criteriaLines.forEach(line => {
        criteria.push(line.replace(/- \[[ x]\] /, '').trim());
      });
    }
    
    return {
      title: titleMatch[1].trim(),
      description: descriptionMatch ? descriptionMatch[1].trim() : '',
      acceptanceCriteria: criteria
    };
  }
  
  return null;
}
