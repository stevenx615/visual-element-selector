# Visual Element Selector (VES)

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)

A web-based tool for visually selecting and tracking elements on web pages. Perfect for web scraping configuration, UI testing, and element inspection.

## Features

- 🎯 **Visual Selection**: Click elements directly in the iframe preview
- 🖍️ **Persistent Highlighters**: Track selected elements with colored overlays
- 📋 **Field Management**: Create and organize element selections with named fields
- 📜 **Info Display**: Shows CSS selector and text content for each element
- 🚀 **Cross-Origin Support**: Proxy system for loading external pages
- ⌨️ **Keyboard Shortcuts**: Use ESC to cancel selections

![Quicker_20250322_112055](https://github.com/user-attachments/assets/66144287-8cb4-4658-8fdf-3d18207a253b)

## Usage

1. **Load a URL**
   - Enter a website URL in the address bar
   - Click "Load Page" to preview in the iframe

2. **Add Fields**
   - Click "Add Field" to create a new element selector
   - Name your field (auto-generated names provided)

3. **Select Elements**
   - Click "Select" on a field
   - Hover elements to see temporary highlight (green)
   - Click to lock persistent highlighter (red)

4. **Manage Fields**
   - Use × button to remove fields
   - Clear all data by reloading the page

## Development Setup

1. Clone repository
   ```bash
   git clone https://github.com/yourusername/visual-element-selector.git
   cd visual-element-selector
   ```

2. Install dependencies
   ```bash
   npm install
   ```

3. Start server
   ```bash
   node server.js
   ```

4. Open in browser
   ```
   http://localhost:3000
   ```

## Tech Stack

- Frontend: JavaScript, CSS3, HTML5
- Backend: Node.js, Express
- Key Libraries: 
  - `node-fetch` for proxy requests
  - `express` for static file serving

## License

MIT License - see [LICENSE](LICENSE) for details 
