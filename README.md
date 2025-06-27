# Mention Task Router for Obsidian

A simple Obsidian plugin that automatically routes tasks containing @mentions to corresponding markdown files.

## Features

- Monitors your typing in Obsidian editor
- When you press Enter on a line containing @mentions (e.g., `@work`, `@personal`), the plugin:
  - Extracts all @mentions from the line
  - Removes the @mentions from the task text
  - Appends the task to corresponding files (e.g., `work.md`, `personal.md`)
  - Creates the file if it doesn't exist

## Usage

1. Type a task with one or more @mentions:
   ```
   Fix the login bug @work @urgent
   ```

2. Press Enter

3. The task `- [ ] Fix the login bug` will be appended to both `work.md` and `urgent.md`

## Installation

### From Source

1. Clone this repository into your vault's `.obsidian/plugins/` folder
2. Install dependencies: `npm install`
3. Build the plugin: `npm run build`
4. Reload Obsidian
5. Enable the plugin in Settings → Community plugins

### Development

1. Install dependencies: `npm install`
2. Start development build: `npm run dev`
3. The plugin will rebuild automatically when you make changes

## Example

Input:
```
Buy groceries @shopping @today
Finish report @work @urgent
Call mom @personal
```

Results in:
- `shopping.md`: Contains `- [ ] Buy groceries`
- `today.md`: Contains `- [ ] Buy groceries`
- `work.md`: Contains `- [ ] Finish report`
- `urgent.md`: Contains `- [ ] Finish report`
- `personal.md`: Contains `- [ ] Call mom`

## License

MIT