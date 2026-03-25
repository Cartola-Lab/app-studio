import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export async function exportAsZip(preview) {
  const { html, css, js } = preview;
  
  const zip = new JSZip();
  
  // Create the full HTML file
  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Generated App</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="styles.css">
</head>
<body>
  ${html || '<!-- No HTML content -->'}
  <script src="script.js"></script>
</body>
</html>`;

  zip.file('index.html', fullHtml);
  zip.file('styles.css', css || '/* No CSS content */');
  zip.file('script.js', js || '// No JavaScript content');
  
  // Add a README
  const readme = `# Generated App

This app was generated using Cartola Lab Studio with BroStorm AI.

## Files
- index.html - Main HTML file
- styles.css - Stylesheet
- script.js - JavaScript logic

## Usage
Open index.html in a web browser to view the app.

Generated on: ${new Date().toISOString()}
`;
  zip.file('README.md', readme);
  
  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, `cartola-app-${Date.now()}.zip`);
}
