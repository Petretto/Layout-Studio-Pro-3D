import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const mdPath = resolve(ROOT, 'Instrukcja', 'Podrecznik_Uzytkownika.md');
const htmlPath = resolve(ROOT, 'Instrukcja', 'Podrecznik_Uzytkownika.html');

const md = readFileSync(mdPath, 'utf8');

// Parse markdown to clean HTML
function mdToHtml(markdown) {
  const lines = markdown.split('\n');
  let html = [];
  let inList = false;

  for (let rawLine of lines) {
    let line = rawLine;

    // Headings
    if (line.startsWith('# ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h1>${parseInline(line.slice(2))}</h1>`);
      continue;
    }
    if (line.startsWith('## ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h2>${parseInline(line.slice(3))}</h2>`);
      continue;
    }
    if (line.startsWith('### ')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push(`<h3>${parseInline(line.slice(4))}</h3>`);
      continue;
    }
    if (line.startsWith('---')) {
      if (inList) { html.push('</ul>'); inList = false; }
      html.push('<hr/>');
      continue;
    }

    // Images
    const imgMatch = line.match(/^!\[(.*?)\]\((.*?)\)/);
    if (imgMatch) {
      if (inList) { html.push('</ul>'); inList = false; }
      const alt = imgMatch[1];
      const src = imgMatch[2];
      // Convert to base64 data URI to be self-contained in Edge
      const imgFile = resolve(ROOT, 'Instrukcja', src);
      let dataUri = src;
      try {
        const buf = readFileSync(imgFile);
        dataUri = `data:image/png;base64,${buf.toString('base64')}`;
      } catch (e) {
        console.warn('Could not read image', imgFile, e.message);
      }
      html.push(`<div class="img-container"><img src="${dataUri}" alt="${alt}"/><p class="img-caption">${alt}</p></div>`);
      continue;
    }

    // Unordered lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      if (!inList) { html.push('<ul>'); inList = true; }
      const itemContent = line.trim().slice(2);
      html.push(`<li>${parseInline(itemContent)}</li>`);
      continue;
    } else {
      if (inList) { html.push('</ul>'); inList = false; }
    }

    // Code blocks
    if (line.startsWith('```')) {
      continue;
    }

    // Empty lines
    if (line.trim() === '') {
      continue;
    }

    // Paragraph
    html.push(`<p>${parseInline(line)}</p>`);
  }

  if (inList) html.push('</ul>');
  return html.join('\n');
}

function parseInline(text) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

const bodyHtml = mdToHtml(md);

const fullHtml = `<!DOCTYPE html>
<html lang="pl">
<head>
<meta charset="utf-8"/>
<title>Layout Studio Pro 3D — Podręcznik Użytkownika</title>
<style>
  @page {
    size: A4 portrait;
    margin: 18mm 16mm 18mm 16mm;
    @bottom-right {
      content: counter(page);
    }
  }
  body {
    font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif;
    color: #1e293b;
    line-height: 1.55;
    font-size: 10.5pt;
    margin: 0;
    padding: 0;
  }
  h1 {
    font-size: 20pt;
    color: #0f172a;
    border-bottom: 2px solid #2563eb;
    padding-bottom: 6px;
    margin-top: 0;
    margin-bottom: 12px;
  }
  h2 {
    font-size: 14pt;
    color: #1e3a8a;
    border-bottom: 1px solid #cbd5e1;
    padding-bottom: 4px;
    margin-top: 24px;
    margin-bottom: 10px;
    page-break-after: avoid;
  }
  h3 {
    font-size: 11.5pt;
    color: #1e293b;
    margin-top: 16px;
    margin-bottom: 6px;
    page-break-after: avoid;
  }
  p {
    margin-top: 4px;
    margin-bottom: 8px;
  }
  ul {
    margin-top: 4px;
    margin-bottom: 10px;
    padding-left: 20px;
  }
  li {
    margin-bottom: 3px;
  }
  code {
    background-color: #f1f5f9;
    color: #0f172a;
    padding: 2px 5px;
    border-radius: 4px;
    font-size: 9pt;
    font-family: Consolas, monospace;
    border: 1px solid #e2e8f0;
  }
  hr {
    border: none;
    border-top: 1px solid #e2e8f0;
    margin: 18px 0;
  }
  .img-container {
    margin: 10px 0 16px 0;
    text-align: center;
    page-break-inside: avoid;
  }
  img {
    max-width: 96%;
    height: auto;
    border: 1px solid #cbd5e1;
    border-radius: 6px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.06);
  }
  .img-caption {
    font-size: 8.5pt;
    color: #64748b;
    margin-top: 4px;
    font-style: italic;
  }
  .header-badge {
    display: inline-block;
    background: #dbeafe;
    color: #1e40af;
    font-weight: 600;
    padding: 3px 8px;
    border-radius: 4px;
    font-size: 9pt;
    margin-bottom: 12px;
  }
</style>
</head>
<body>
  <div class="header-badge">Oficjalna dokumentacja systemowa v0.4.0</div>
  ${bodyHtml}
</body>
</html>`;

writeFileSync(htmlPath, fullHtml, 'utf8');
console.log('HTML written to', htmlPath);
