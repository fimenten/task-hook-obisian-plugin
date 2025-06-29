# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

This is the Mention Task Router plugin for Obsidian. It automatically routes tasks containing @mentions to corresponding markdown files and creates bidirectional links between mention files and task content files.

## Commands

### Development
- `npm install` - Install dependencies
- `npm run dev` - Start development build with watch mode
- `npm run build` - Create production build

### Testing
- Use `node test-regex.js` to test mention extraction patterns
- Manual testing in Obsidian by enabling the plugin in `.obsidian/plugins/`

## Architecture

### Core Functionality
1. **Mention Detection**: Uses regex `/(?<!\S)@([^\s@/]+)/gu` to detect @mentions (excludes emails)
2. **Task Routing**: Appends tasks to mention files (e.g., `@work` → `work.md`)
3. **Task Files**: Creates task content files in `tasks/` directory with bidirectional linking
4. **Task Format**: `- [ ] [[Task content]], added: YYYY-MM-DD HH:mm, from [[Source File]]`

### Key Files
- `main.ts` - Main plugin implementation
- `esbuild.config.mjs` - Build configuration
- `manifest.json` - Plugin metadata (ID: mention-task-router)

### Technical Details
- Uses DOM keydown event listener for Enter key detection (not CodeMirror extension)
- Processes tasks after 50ms delay to let Enter complete
- Creates folders automatically if they don't exist
- Prevents duplicate links in mention files

### File Operations Pattern
```typescript
const file = this.app.vault.getAbstractFileByPath(path);
if (file instanceof TFile) {
  await this.app.vault.append(file, content);
} else {
  await this.app.vault.create(path, content);
}
```

## Recent Changes
- Task content files are now created in `tasks/` directory
- Plugin automatically creates the tasks folder if it doesn't exist