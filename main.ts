import {
  Plugin,
  TFile,
  MarkdownView,
} from "obsidian";
import { EditorView } from "@codemirror/view";
import { EditorState } from "@codemirror/state";

/**
 * MentionTaskRouter
 * - When a user finishes a line that contains @mentions,
 *   append that task (without the mentions) to `${mention}.md`.
 */
export default class MentionTaskRouter extends Plugin {
  async onload() {
    console.log("MentionTaskRouter loaded");

    /** CodeMirror v6 拡張 */
    const ext = EditorView.updateListener.of(async (update: any) => {
      // “行が確定した” = 直前の変更に改行が含まれる
      if (!update.docChanged) return;
      if (!update.transactions.some((tr: any) => tr.isUserEvent("input.type"))) return;
      if (!update.changes.iterChanges) return; // safety for <1.5

      let enterPressed = false;
      update.changes.iterChanges((_from: any, _to: any, _text: any, _origin: any) => {
        if (_text && _text.length && _text[0].includes("\n")) enterPressed = true;
      });
      if (!enterPressed) return;

      // 対象行を取得
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (!view) return;
      
      const editor = view.editor;
      if (!editor) return;

      const { line } = editor.getCursor();
      if (line === 0) return; // 最初の行では何もしない
      
      const raw = editor.getLine(line - 1); // Enter 直前の行
      await this.processLine(raw.trim());
    });

    this.registerEditorExtension(ext);
  }

  /** 行を解析して該当ファイルに追記 */
  private async processLine(raw: string) {
    const mentionRE = /(?<!\S)@([^\s@/]+)/gu;
    const mentions = [...raw.matchAll(mentionRE)].map((m) => m[1]);
    if (!mentions.length) return;

    // メンションを除いた本文
    const body = raw.replace(mentionRE, "").trim() || mentions.join(" ");
    const taskLine = `- [ ] ${body}`;

    await Promise.all(
      mentions.map(async (m) => {
        const path = `${m}.md`;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (file instanceof TFile) {
          await this.app.vault.append(file, "\n" + taskLine);
        } else {
          await this.app.vault.create(path, "# Tasks\n\n" + taskLine);
        }
      })
    );
  }

  onunload() {
    console.log("MentionTaskRouter unloaded");
  }
}


