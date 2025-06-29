import {
  Plugin,
  TFile,
  MarkdownView,
} from "obsidian";
import { EditorView, keymap } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

/**
 * MentionTaskRouter
 * - When a user finishes a line that contains @mentions,
 *   append that task (without the mentions) to `${mention}.md`.
 */
export default class MentionTaskRouter extends Plugin {
  async onload() {
    console.log("MentionTaskRouter loaded");

    // Use Obsidian's editor-change event
    this.registerDomEvent(document, 'keydown', (evt) => {
      if (evt.key === 'Enter') {
        console.log("Enter key detected via DOM event");
        
        // Get the active markdown view
        const view = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!view) {
          console.log("No active markdown view");
          return;
        }
        
        const editor = view.editor;
        if (!editor) {
          console.log("No editor");
          return;
        }

        // Get current line before Enter moves cursor
        const cursor = editor.getCursor();
        const currentLine = editor.getLine(cursor.line);
        console.log("Current line:", currentLine);
        
        // Process after a short delay to let Enter complete, then get the previous line
        setTimeout(async () => {
          const newCursor = editor.getCursor();
          const previousLine = newCursor.line > 0 ? editor.getLine(newCursor.line - 1) : "";
          console.log("Previous line after Enter:", previousLine);
          await this.processLine(previousLine.trim());
        }, 50);
      }
    });
  }

  /** 行を解析して該当ファイルに追記 */
  private async processLine(raw: string) {
    console.log("processLine called with:", raw);
    
    const mentionRE = /(?<!\S)@([^\s@/]+)/gu;
    const mentions = [...raw.matchAll(mentionRE)].map((m) => m[1]);
    console.log("Found mentions:", mentions);
    
    if (!mentions.length) {
      console.log("No mentions found");
      return;
    }

    // Get current file name for linking back
    const activeFile = this.app.workspace.getActiveFile();
    const currentFileName = activeFile ? activeFile.basename : "Unknown";

    // メンションを除いた本文
    const body = raw.replace(mentionRE, "").trim() || mentions.join(" ");
    
    // Add current datetime
    const now = new Date();
    const dateStr = now.getFullYear() + '-' + 
                   String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                   String(now.getDate()).padStart(2, '0');
    const timeStr = now.getHours() + ':' + String(now.getMinutes()).padStart(2, '0');
    const datetime = `${dateStr} ${timeStr}`;
    
    const taskLine = `- [ ] [[tasks/${body}]], added: ${datetime}, from [[${currentFileName}]]`;
    console.log("Task line:", taskLine);

    try {
      await Promise.all(
        mentions.map(async (m) => {
          const path = `${m}.md`;
          console.log("Attempting to write to:", path);
          
          const file = this.app.vault.getAbstractFileByPath(path);
          if (file instanceof TFile) {
            console.log("Appending to existing file:", path);
            await this.app.vault.append(file, "\n" + taskLine);
            console.log("Successfully appended to:", path);
          } else {
            console.log("Creating new file:", path);
            const newFile = await this.app.vault.create(path, "# Tasks\n\n" + taskLine);
            console.log("Successfully created file:", path, newFile);
          }
        })
      );
      
      // Create bidirectional links between mention files and content file
      await Promise.all(
        mentions.map(async (mention) => {
          const mentionPath = `${mention}.md`;
          const contentPath = `tasks/${body}.md`;
          
          // Create content file (XXX.md) in tasks directory
          const contentFile = this.app.vault.getAbstractFileByPath(contentPath);
          if (!(contentFile instanceof TFile)) {
            console.log("Creating content file:", contentPath);
            
            // Ensure tasks directory exists
            const tasksFolder = this.app.vault.getAbstractFileByPath("tasks");
            if (!tasksFolder) {
              await this.app.vault.createFolder("tasks");
            }
            
            await this.app.vault.create(contentPath, `# ${body}\n\n`);
          }
          
          // Add link to content file in mention file (hoge.md)
          const mentionFile = this.app.vault.getAbstractFileByPath(mentionPath);
          const linkLine = `- [[tasks/${body}]]`;
          
          if (mentionFile instanceof TFile) {
            const existingContent = await this.app.vault.read(mentionFile);
            if (!existingContent.includes(`[[tasks/${body}]]`)) {
              await this.app.vault.append(mentionFile, "\n" + linkLine);
              console.log(`Added link to ${body} in ${mention}.md`);
            }
          } else {
            console.log("Creating mention file with link:", mentionPath);
            await this.app.vault.create(mentionPath, `# ${mention}\n\n${linkLine}`);
          }
        })
      );
      
      console.log("Task routing completed successfully");
    } catch (error) {
      console.error("Error in task routing:", error);
    }
  }

  onunload() {
    console.log("MentionTaskRouter unloaded");
  }
}

