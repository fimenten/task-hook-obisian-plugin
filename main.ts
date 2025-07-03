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
          const lineNum = newCursor.line - 1;
          const previousLine = lineNum >= 0 ? editor.getLine(lineNum) : "";
          console.log("Previous line after Enter:", previousLine);
          
          // Process the line (create tasks and files)
          const result = await this.processLine(previousLine.trim());
          
          // Replace mentions and words with links in the original line
          if (result && result.mentions.length > 0 && lineNum >= 0) {
            let linkedText = previousLine;
            const mentionRE = /(?<!\S)@([^\s@/]+)/gu;
            
            // First, replace @mentions with [[mention]] links
            linkedText = linkedText.replace(mentionRE, (match, mention) => {
              return `@[[${mention}]]`;
            });
            
            // Then, convert remaining words to [[mention/word]] links
            // Process the text to avoid double-linking
            let processedText = linkedText;
            const wordRE = /\b\w+\b/g;
            let match;
            let offset = 0;
            
            while ((match = wordRE.exec(linkedText)) !== null) {
              const word = match[0];
              const startPos = match.index + offset;
              
              // Check if this word is inside a [[...]] link
              const beforeText = processedText.substring(0, startPos);
              const openBrackets = (beforeText.match(/\[\[/g) || []).length;
              const closeBrackets = (beforeText.match(/\]\]/g) || []).length;
              const inLink = openBrackets > closeBrackets;
              
              if (inLink) {
                continue;
              }
              
              // Skip email addresses - check if this word is part of an email
              const emailContext = linkedText.substring(Math.max(0, match.index - 20), match.index + word.length + 20);
              if (emailContext.match(/\w+@\w+\.\w+/)) {
                continue;
              }
              
              // Don't link common words
              const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can', 'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her', 'us', 'them'];
              if (commonWords.includes(word.toLowerCase())) {
                continue;
              }
              
              // Use the first mention for the word links
              const firstMention = result.mentions[0];
              const replacement = `[[${firstMention}/${word}]]`;
              
              // Replace the word with the link
              processedText = processedText.substring(0, startPos) + replacement + processedText.substring(startPos + word.length);
              offset += replacement.length - word.length;
            }
            
            linkedText = processedText;
            
            // Replace the line with the linked version
            editor.setLine(lineNum, linkedText);
            console.log("Replaced line with links:", linkedText);
          }
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
      return null;
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
    
    const taskLine = `- [ ] [[${mentions[0]}/${body}]], added: ${datetime}, from [[${currentFileName}]]`;
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
          const contentPath = `${mention}/${body}.md`;
          
          // Create content file (XXX.md) in mention directory
          const contentFile = this.app.vault.getAbstractFileByPath(contentPath);
          if (!(contentFile instanceof TFile)) {
            console.log("Creating content file:", contentPath);
            
            // Ensure mention directory exists
            const mentionFolder = this.app.vault.getAbstractFileByPath(mention);
            if (!mentionFolder) {
              await this.app.vault.createFolder(mention);
            }
            
            await this.app.vault.create(contentPath, `# ${body}\n\n`);
          }
          
          // Add link to content file in mention file (hoge.md)
          const mentionFile = this.app.vault.getAbstractFileByPath(mentionPath);
          const linkLine = `- [[${mention}/${body}]]`;
          
          if (mentionFile instanceof TFile) {
            const existingContent = await this.app.vault.read(mentionFile);
            if (!existingContent.includes(`[[${mention}/${body}]]`)) {
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
    
    return { mentions };
  }

  onunload() {
    console.log("MentionTaskRouter unloaded");
  }
}

